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
export interface DailyRow {
  name: string;
  avatar: string;
  score: number;
  isYou: boolean;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let client: any = null;
let user: any = null;
let profile: CloudProfile | null = null;
let initPromise: Promise<void> | null = null;

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

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
      client.from('arcade_scores').select('user_id', { count: 'exact', head: true }).eq('game', game),
    ]);
    const rank = (ahead.count || 0) + 1;
    // The player's own row may not be counted yet (submit in flight), so make
    // sure the field always includes them — rank can never exceed total.
    return { rank, total: Math.max(total.count || 0, rank) };
  } catch {
    return null;
  }
}

// ---- daily challenge ----

/** Local calendar day as YYYY-MM-DD — the seed key for a day's puzzle. */
export function dailyKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic RNG in [0,1); same output for every player on the same day. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A game's seeded RNG for today's daily challenge. */
export function dailyRng(game: string, key: string = dailyKey()): () => number {
  return mulberry32(hashSeed(`${game}:${key}`));
}

/** Record today's daily score, keeping the player's best for the day. */
export async function submitDaily(game: string, score: number, key: string = dailyKey()): Promise<void> {
  await init();
  if (!client || !user || !(score >= 0)) return;
  try {
    const { data } = await client
      .from('arcade_daily')
      .select('score')
      .eq('user_id', user.id)
      .eq('game', game)
      .eq('day', key)
      .maybeSingle();
    if (data && num(data.score) >= score) return;
    await client.from('arcade_daily').upsert(
      {
        user_id: user.id,
        game,
        day: key,
        score: Math.floor(score),
        display_name: profile?.name ?? googleName(user),
        avatar_url: profile?.avatar ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,game,day' }
    );
  } catch {
    /* ignore */
  }
}

/** Today's top scores for a game's daily board. */
export async function getDailyBoard(game: string, key: string = dailyKey(), limit = 10): Promise<DailyRow[]> {
  await init();
  if (!client) return [];
  try {
    const { data } = await client
      .from('arcade_daily')
      .select('user_id,display_name,avatar_url,score')
      .eq('game', game)
      .eq('day', key)
      .order('score', { ascending: false })
      .limit(limit);
    return (data || []).map((r: any) => ({
      name: r.display_name || 'Player',
      avatar: r.avatar_url || '🎮',
      score: num(r.score),
      isYou: !!user && r.user_id === user.id,
    }));
  } catch {
    return [];
  }
}

/** Where `score` places on today's daily board for `game`. */
export async function getDailyRank(game: string, score: number, key: string = dailyKey()): Promise<RankInfo | null> {
  await init();
  if (!client || !(score > 0)) return null;
  if (!user) return { rank: 0, total: 0, signedOut: true };
  try {
    const [ahead, total] = await Promise.all([
      client.from('arcade_daily').select('user_id', { count: 'exact', head: true }).eq('game', game).eq('day', key).gt('score', score),
      client.from('arcade_daily').select('user_id', { count: 'exact', head: true }).eq('game', game).eq('day', key),
    ]);
    const rank = (ahead.count || 0) + 1;
    return { rank, total: Math.max(total.count || 0, rank) };
  } catch {
    return null;
  }
}
