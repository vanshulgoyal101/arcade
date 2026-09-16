begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.arcade_scores, public.arcade_profiles, public.arcade_events in share row exclusive mode;
CREATE OR REPLACE FUNCTION public.arcade_valid_game(p_game text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(p_game = any(array[
    '2048', 'chromatic', 'digit-span', 'echo', 'flash', 'flashmath',
    'hue-hunt', 'interval', 'sprint', 'where', 'word', 'wordle'
  ]), false);
$function$
;
CREATE OR REPLACE FUNCTION public.arcade_scores_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if not public.arcade_valid_game(new.game) then
    raise exception 'unsupported game' using errcode = '23514';
  end if;
  if new.best is null or new.best < 0 then
    new.best := 0;
  end if;
  new.best := least(new.best, public.arcade_score_cap(new.game));
  -- `best` is a personal best: never let any write path lower it. A direct
  -- upsert replaces the whole row, so a stale or 0 `best` (e.g. a cross-device
  -- backup row synced before the higher score) must not overwrite a better one.
  if tg_op = 'UPDATE' and old.best is not null then
    new.best := greatest(new.best, least(old.best, public.arcade_score_cap(new.game)));
  end if;
  -- A store is always a JSON object. Reject scalars/arrays from malformed or
  -- forged clients, and cap valid blobs to blunt storage abuse.
  if new.data is not null and (
    jsonb_typeof(new.data) <> 'object' or octet_length(new.data::text) > 65536
  ) then
    new.data := null;
  end if;
  -- Bound the free-text identity fields so a direct upsert can't store an
  -- oversized display name (leaderboard layout abuse), avatar or game slug.
  new.display_name := left(new.display_name, 24);
  new.avatar_url   := left(new.avatar_url, 512);
  new.game         := left(new.game, 32);
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.arcade_leaderboard(p_games text[], p_limit integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with requested as (
    select distinct gg
    from unnest(p_games[1:64]) as requested_game(gg)
    where public.arcade_valid_game(gg)
  ), ranked as (
    select s.game, s.user_id, s.display_name, s.avatar_url, s.best,
           rank() over (partition by s.game order by s.best desc) as place,
           row_number() over (partition by s.game order by s.best desc, s.updated_at, s.user_id) as rn
    from public.arcade_scores s
    where s.game in (select gg from requested) and s.best > 0
  ),
  me as (
    select game, best, place from ranked where user_id = auth.uid()
  )
  select coalesce(jsonb_object_agg(gg, payload), '{}'::jsonb)
  from (
    select gg,
      jsonb_build_object(
        'top', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'user_id', r.user_id, 'display_name', r.display_name,
                   'avatar_url', r.avatar_url, 'best', r.best, 'rank', r.place) order by r.rn)
          from ranked r where r.game = gg and r.rn <= least(50, greatest(1, coalesce(p_limit, 5)))), '[]'::jsonb),
        'my_best', (select best from me where me.game = gg),
        'my_rank', (select place from me where me.game = gg)
      ) as payload
    from requested
  ) x;
$function$
;
CREATE OR REPLACE FUNCTION public.arcade_events_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.kind not in ('visit', 'play') or not (
    public.arcade_valid_game(new.game) or (new.game = 'hub' and new.kind = 'visit')
  ) or new.game is null then
    raise exception 'unsupported analytics event' using errcode = '23514';
  end if;
  new.ts := now();
  new.user_id := null;
  return new;
end;
$function$
;
do $$ begin
  if exists (select 1 from public.arcade_scores where not public.arcade_valid_game(game)) then
    raise exception 'unsupported stored score games require manual review';
  end if;
end $$;
drop policy if exists arcade_profiles_read on public.arcade_profiles;
create policy arcade_profiles_read on public.arcade_profiles for select using (auth.uid() = user_id);
revoke execute on function public.restore_my_scores() from public, anon;
revoke execute on function public.submit_score(text, integer, jsonb) from public, anon;
revoke execute on function public.arcade_stats(integer) from public, anon;
grant execute on function public.restore_my_scores(), public.submit_score(text, integer, jsonb), public.arcade_stats(integer) to authenticated;
alter table public.arcade_events alter column id set generated always;
drop trigger if exists arcade_events_guard on public.arcade_events;
create trigger arcade_events_guard before insert on public.arcade_events for each row execute function public.arcade_events_guard();
commit;
