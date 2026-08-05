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
  return new;
end;
$$;

drop trigger if exists arcade_scores_guard on public.arcade_scores;
create trigger arcade_scores_guard
  before insert or update on public.arcade_scores
  for each row execute function public.arcade_scores_guard();

-- ---------------------------------------------------------------------------
-- Daily challenge boards: one best row per player, per game, per day.
create table if not exists public.arcade_daily (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  game         text        not null,
  day          date        not null,
  score        integer     not null default 0,
  display_name text,
  avatar_url   text,
  updated_at   timestamptz not null default now(),
  primary key (user_id, game, day)
);

create index if not exists arcade_daily_board_idx
  on public.arcade_daily (game, day, score desc);

alter table public.arcade_daily enable row level security;

drop policy if exists arcade_daily_read on public.arcade_daily;
create policy arcade_daily_read
  on public.arcade_daily for select
  using (true);

drop policy if exists arcade_daily_insert on public.arcade_daily;
create policy arcade_daily_insert
  on public.arcade_daily for insert
  with check (auth.uid() = user_id);

drop policy if exists arcade_daily_update on public.arcade_daily;
create policy arcade_daily_update
  on public.arcade_daily for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

