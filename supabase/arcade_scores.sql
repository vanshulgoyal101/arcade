-- Tiny Arcade — cloud score sync + public leaderboard.
-- Run this in the Supabase SQL editor for project tmngedsmgcgbkbkmsnsw.
-- It only creates an `arcade_`-prefixed table, so it won't touch your blog tables.

create table if not exists public.arcade_scores (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  game         text        not null,
  best         integer     not null default 0,
  data         jsonb,                       -- full localStorage blob for cross-device restore
  display_name text,
  avatar_url   text,
  updated_at   timestamptz not null default now(),
  primary key (user_id, game)
);

-- Leaderboard lookups: highest score per game.
create index if not exists arcade_scores_game_best_idx
  on public.arcade_scores (game, best desc);

alter table public.arcade_scores enable row level security;

-- Anyone (even signed-out) may read scores — this powers the public leaderboard.
drop policy if exists arcade_scores_read on public.arcade_scores;
create policy arcade_scores_read
  on public.arcade_scores for select
  using (true);

-- A signed-in user may only write their own rows.
drop policy if exists arcade_scores_insert on public.arcade_scores;
create policy arcade_scores_insert
  on public.arcade_scores for insert
  with check (auth.uid() = user_id);

drop policy if exists arcade_scores_update on public.arcade_scores;
create policy arcade_scores_update
  on public.arcade_scores for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Privacy: the `data` blob is a player's whole localStorage. RLS is row-level,
-- so a `using(true)` read policy would let anyone `.select('data')` and dump
-- every player's blob. A column-level revoke can't carve a subset out of a
-- table-wide SELECT grant, so drop the table grant and re-grant SELECT only on
-- the safe columns (leaderboard reads user_id/display_name/avatar_url/best).
-- Own-row restore goes through the SECURITY DEFINER restore_my_scores() RPC.
revoke select on public.arcade_scores from anon, authenticated;
grant select (user_id, game, best, display_name, avatar_url, updated_at)
  on public.arcade_scores to anon, authenticated;

create or replace function public.restore_my_scores()
returns table (game text, best integer, data jsonb)
language sql
security definer
set search_path = public
as $$
  select game, best, data
  from public.arcade_scores
  where user_id = auth.uid();
$$;
grant execute on function public.restore_my_scores() to authenticated;

-- Whole leaderboard in ONE round trip: per-game top N (by best desc) plus the
-- caller's own best + rank. Replaces ~20 client REST calls (which the browser
-- throttles to 6 at a time) so the leaderboard loads instantly. SECURITY DEFINER
-- so it can read past the column grants, but it only ever returns safe columns.
create or replace function public.arcade_leaderboard(p_games text[], p_limit int default 5)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select s.game, s.user_id, s.display_name, s.avatar_url, s.best,
           row_number() over (partition by s.game order by s.best desc, s.updated_at) as rn
    from public.arcade_scores s
    where s.game = any(p_games)
  ),
  me as (
    select game, best, rn from ranked where user_id = auth.uid()
  )
  select coalesce(jsonb_object_agg(gg, payload), '{}'::jsonb)
  from (
    select gg,
      jsonb_build_object(
        'top', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'user_id', r.user_id, 'display_name', r.display_name,
                   'avatar_url', r.avatar_url, 'best', r.best) order by r.rn)
          from ranked r where r.game = gg and r.rn <= p_limit), '[]'::jsonb),
        'my_best', (select best from me where me.game = gg),
        'my_rank', (select rn   from me where me.game = gg)
      ) as payload
    from unnest(p_games) as u(gg)
  ) x;
$$;
grant execute on function public.arcade_leaderboard(text[], int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Player profile: an editable display name + avatar (emoji or Google photo URL).
-- Kept separate so a player has an identity even before setting any score.
create table if not exists public.arcade_profiles (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar       text,                        -- an emoji like "🐼" or an https photo URL
  theme        text,                        -- 'classic' | 'refined' (synced colour theme)
  updated_at   timestamptz not null default now()
);
-- Add theme to pre-existing installs (loadProfile selects it, so it must exist).
alter table public.arcade_profiles add column if not exists theme text;

alter table public.arcade_profiles enable row level security;

drop policy if exists arcade_profiles_read on public.arcade_profiles;
create policy arcade_profiles_read
  on public.arcade_profiles for select
  using (true);

drop policy if exists arcade_profiles_insert on public.arcade_profiles;
create policy arcade_profiles_insert
  on public.arcade_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists arcade_profiles_update on public.arcade_profiles;
create policy arcade_profiles_update
  on public.arcade_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Per-game upper bounds. Shared by the submit_score RPC and the write-guard
-- trigger below so the caps are defined in exactly one place.
create or replace function public.arcade_score_cap(p_game text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_game
    when 'echo'       then 200
    when 'digit-span' then 200
    when 'flash'      then 500
    when 'sprint'     then 500
    when 'wordle'     then 100000
    else 10000000
  end;
$$;

-- Validated score submission. Prefer this RPC over a direct upsert so the
-- server clamps obviously-forged values and always keeps the player's max.
-- (Direct upsert still works via RLS; the guard trigger below caps it too.)
create or replace function public.submit_score(p_game text, p_best integer, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_cap    integer;
  v_name   text;
  v_avatar text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_best is null or p_best < 0 then
    return;
  end if;
  v_cap := public.arcade_score_cap(p_game);
  if p_best > v_cap then
    p_best := v_cap;
  end if;

  select display_name, avatar into v_name, v_avatar
    from public.arcade_profiles where user_id = v_uid;

  insert into public.arcade_scores (user_id, game, best, data, display_name, avatar_url, updated_at)
  values (v_uid, p_game, p_best, p_data, v_name, v_avatar, now())
  on conflict (user_id, game) do update
    set best         = greatest(public.arcade_scores.best, excluded.best),
        data         = excluded.data,
        display_name = excluded.display_name,
        avatar_url   = excluded.avatar_url,
        updated_at   = now();
end;
$$;

grant execute on function public.submit_score(text, integer, jsonb) to authenticated;

-- Enforce the per-game caps and a blob-size limit on EVERY write path — the
-- RPC above AND any direct upsert a client makes (RLS lets a user write their
-- own rows, so without this a forged `best` or an oversized `data` blob would
-- persist). Runs on both insert and update.
create or replace function public.arcade_scores_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.best is null or new.best < 0 then
    new.best := 0;
  end if;
  new.best := least(new.best, public.arcade_score_cap(new.game));
  -- `data` is just the game's localStorage blob; cap it to blunt storage abuse.
  if new.data is not null and octet_length(new.data::text) > 65536 then
    new.data := null;
  end if;
  -- Bound the free-text identity fields so a direct upsert can't store an
  -- oversized display name (leaderboard layout abuse), avatar or game slug.
  new.display_name := left(new.display_name, 24);
  new.avatar_url   := left(new.avatar_url, 512);
  new.game         := left(new.game, 32);
  return new;
end;
$$;

drop trigger if exists arcade_scores_guard on public.arcade_scores;
create trigger arcade_scores_guard
  before insert or update on public.arcade_scores
  for each row execute function public.arcade_scores_guard();

-- ---------------------------------------------------------------------------
-- Bound the profile free-text fields on every write, mirroring the client's
-- own caps so a direct upsert can't store oversized values.
create or replace function public.arcade_profiles_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.display_name := left(new.display_name, 24);
  new.avatar       := left(new.avatar, 512);
  return new;
end;
$$;

drop trigger if exists arcade_profiles_guard on public.arcade_profiles;
create trigger arcade_profiles_guard
  before insert or update on public.arcade_profiles
  for each row execute function public.arcade_profiles_guard();

-- The daily-challenge boards were never shipped; drop the unused table.
drop table if exists public.arcade_daily cascade;

