begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
revoke all on public.arcade_scores, public.arcade_profiles, public.arcade_events from public, anon, authenticated;
grant select (user_id, game, best, display_name, avatar_url, updated_at)
  on public.arcade_scores to anon, authenticated;
grant insert, update on public.arcade_scores to authenticated;
grant select, insert, update on public.arcade_profiles to authenticated;
grant insert on public.arcade_events to anon, authenticated;
commit;