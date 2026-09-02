// Shared, framework-agnostic cloud helper for the games. It reuses the Supabase
// session that the hub's auth.js already established (supabase-js stores it in
// localStorage under this origin), so games can read the signed-in profile,
// submit scores and look up a player's rank without their own auth UI.
//
// Everything degrades gracefully: offline, signed-out, or if the CDN is blocked,
// each call simply resolves to null / no-ops and never throws.

const SUPABASE_URL = 'https://tmngedsmgcgbkbkmsnsw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qFZySs9l19_7bISrvmLHIw_vwt-DUdx';

export interface CloudProfile {
  name: string;
  avatar: string; // emoji or image URL
}
export interface RankInfo {
  rank: number;
  total: number;
  signedOut?: boolean; // sentinel: not ranked because nobody is signed in here
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let client: any = null;
let user: any = null;
let profile: CloudProfile | null = null;
let initPromise: Promise<void> | null = null;

// localStorage key per game slug — lets submitScore ship the full store blob
// (for cross-device restore) without each game passing it in.
const LS_KEYS: Record<string, string> = {
  'hue-hunt': 'huehunt.v2',
  where: 'where.v1',
  echo: 'echo.v2',
  chromatic: 'chromatic.v2',
  flash: 'flash.v1',
  flashmath: 'flashmath.v1',
  sprint: 'sprint.v1',
  'digit-span': 'digitspan.v1',
  word: 'word.v1',
  wordle: 'wordle.v1',
};

function readBlob(game: string): unknown {
  try {
    const k = LS_KEYS[game];
    if (!k) return null;
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

import { codedAvatarSvg } from './avatars';

function googleName(u: any): string {
  const m = u?.user_metadata || {};
  return m.full_name || m.name || (u?.email ? String(u.email).split('@')[0] : 'Player');
}

// Preload the signed-in player's coded (a:<id>) avatar as an image so the share
// card can draw it synchronously. Self-contained SVG data URL — no canvas taint.
let avatarImg: HTMLImageElement | null = null;
function preloadAvatar(av: string | undefined): void {
  avatarImg = null;
  const svg = codedAvatarSvg(av);
  if (!svg || typeof Image === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { avatarImg = img; };
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/** The loaded coded-avatar image, or null (emoji/URL/not-ready). */
export function cloudAvatarImage(): HTMLImageElement | null {
  return avatarImg && avatarImg.complete && avatarImg.naturalWidth > 0 ? avatarImg : null;
}

async function init(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      // Loaded from the CDN at runtime; kept out of the Vite bundle on purpose.
      // @ts-ignore - remote ESM module, no local types
      const mod: any = await import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2');
      client = mod.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data } = await client.auth.getSession();
      user = data?.session?.user ?? null;
      if (user) {
        const { data: p } = await client
          .from('arcade_profiles')
          .select('display_name,avatar')
          .eq('user_id', user.id)
          .maybeSingle();
        profile = {
          name: p?.display_name || googleName(user),
          avatar: p?.avatar || user.user_metadata?.avatar_url || '🎮',
        };
        preloadAvatar(profile.avatar);
      }
    } catch {
      client = null;
      user = null;
      profile = null;
    }
  })();
  return initPromise;
}

/** True once the session/profile lookup has finished (or failed). */
export async function cloudReady(): Promise<void> {
  await init();
}

export function isSignedIn(): boolean {
  return !!user;
}

/** Start Google sign-in from within a game, returning to this page afterwards. */
export async function signIn(): Promise<void> {
  await init();
  if (!client) return;
  try {
    await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } });
  } catch {
    /* ignore */
  }
}
// Exposed so a self-contained nudge button (rendered as an HTML string in every
// game's game-over modal) can trigger sign-in without per-game wiring.
try { (globalThis as { __arcadeSignIn?: () => void }).__arcadeSignIn = signIn; } catch { /* ignore */ }

/** The signed-in player's display name + avatar, or null when signed out. */
export function cloudProfile(): CloudProfile | null {
  return profile;
}

/**
 * Persist a personal best to the cloud. Prefers the validated `submit_score`
 * RPC (server-side clamping) and falls back to a direct upsert if the RPC
 * isn't deployed yet. No-op when signed out or the score isn't positive.
 */
export async function submitScore(game: string, best: number): Promise<void> {
  await init();
  if (!client || !user || !(best > 0)) return;
  const data = readBlob(game);
  try {
    const rpc = await client.rpc('submit_score', { p_game: game, p_best: Math.floor(best), p_data: data });
    if (!rpc.error) return;
  } catch {
    /* fall through to direct upsert */
  }
  try {
    await client.from('arcade_scores').upsert(
      {
        user_id: user.id,
        game,
        best: Math.floor(best),
        data,
        display_name: profile?.name ?? googleName(user),
        avatar_url: profile?.avatar ?? null,
      },
      { onConflict: 'user_id,game' }
    );
  } catch {
    /* ignore */
  }
}

/** Where `score` would place on `game`'s all-time board, plus the field size. */
export async function getRank(game: string, score: number): Promise<RankInfo | null> {
  await init();
  if (!client || !(score > 0)) return null;
  // Signed-out players aren't on the board — surface a sign-in nudge instead.
  if (!user) return { rank: 0, total: 0, signedOut: true };
  try {
    const [ahead, total] = await Promise.all([
      client.from('arcade_scores').select('user_id', { count: 'exact', head: true }).eq('game', game).gt('best', score),
      // Field size counts only real scorers (best>0), matching the leaderboard —
      // 0-best rows exist only as cross-device backups and shouldn't inflate rank.
      client.from('arcade_scores').select('user_id', { count: 'exact', head: true }).eq('game', game).gt('best', 0),
    ]);
    const rank = (ahead.count || 0) + 1;
    // The player's own row may not be counted yet (submit in flight), so make
    // sure the field always includes them — rank can never exceed total.
    return { rank, total: Math.max(total.count || 0, rank) };
  } catch {
    return null;
  }
}
