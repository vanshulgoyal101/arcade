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

-- ---------------------------------------------------------------------------
-- Player profile: an editable display name + avatar (emoji or Google photo URL).
-- Kept separate so a player has an identity even before setting any score.
create table if not exists public.arcade_profiles (
  user_id      uuid        primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar       text,                        -- an emoji like "🐼" or an https photo URL
  updated_at   timestamptz not null default now()
);

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
