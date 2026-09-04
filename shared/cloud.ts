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
  offline?: boolean; // sentinel: signed in, but the board is unreachable right now
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
  interval: 'interval.v1',
  word: 'word.v1',
  wordle: 'wordle.v1',
  2048: '2048.v1',
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

const n = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);
const maxVal = (o: unknown): number =>
  o && typeof o === 'object' ? Math.max(0, ...Object.values(o as Record<string, unknown>).map(n)) : 0;

// How each game's headline best is read from its store, and (single-field games
// only) how to heal a restored blob whose headline dropped below the monotonic
// cloud best. Mirrors the hub's GAMES registry; kept here so a game can restore
// its own progress on load. Map-keyed games (echo/sprint/digit-span) restore the
// blob when the cloud best wins but don't heal a single field.
const HEADLINE: Record<string, { best: (s: any) => number; apply?: (s: any, b: number) => void }> = {
  'hue-hunt': { best: (s) => n(s.bestScore), apply: (s, b) => { s.bestScore = Math.max(n(s.bestScore), b); } },
  // The cloud best is the max of the two difficulties, so heal whichever one is
  // already leading — crediting the other would invent a score never played.
  where: { best: (s) => Math.max(n(s.bestEasy), n(s.bestHard)), apply: (s, b) => { if (n(s.bestEasy) >= n(s.bestHard)) s.bestEasy = Math.max(n(s.bestEasy), b); else s.bestHard = Math.max(n(s.bestHard), b); } },
  echo: { best: (s) => maxVal(s.best) },
  chromatic: { best: (s) => n(s.endlessBest), apply: (s, b) => { s.endlessBest = Math.max(n(s.endlessBest), b); } },
  flash: { best: (s) => n(s.bestWpm), apply: (s, b) => { s.bestWpm = Math.max(n(s.bestWpm), b); } },
  flashmath: { best: (s) => n(s.bestScore), apply: (s, b) => { s.bestScore = Math.max(n(s.bestScore), b); } },
  sprint: { best: (s) => maxVal(s.best) },
  'digit-span': { best: (s) => maxVal(s.best) },
  interval: { best: (s) => n(s.bestScore), apply: (s, b) => { s.bestScore = Math.max(n(s.bestScore), b); } },
  word: { best: (s) => n(s.practiceBest), apply: (s, b) => { s.practiceBest = Math.max(n(s.practiceBest), b); } },
  wordle: { best: (s) => n(s.maxStreak), apply: (s, b) => { s.maxStreak = Math.max(n(s.maxStreak), b); } },
  2048: { best: (s) => n(s.best), apply: (s, b) => { s.best = Math.max(n(s.best), b); } },
};

export interface CloudRow {
  best?: number;
  data?: unknown;
}

// A submit that fails (offline, flaky link, or the SDK never loaded) would
// otherwise only reach the cloud on a later signed-in *hub* visit — a player who
// deep-links or installs a single game could stay off the leaderboard forever.
// Failed submits are parked here and retried on the next game load / reconnect.
const PENDING_KEY = 'arcade.pending.v1';

/** Parked submits as `{ [game]: best }`. Exported for tests. */
export function readPending(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    // Ignore unknown slugs so a corrupt entry can't grow the queue unbounded.
    for (const [game, best] of Object.entries(parsed)) if (LS_KEYS[game]) out[game] = n(best);
    return out;
  } catch {
    return {};
  }
}

function writePending(queue: Record<string, number>): void {
  try {
    if (Object.keys(queue).length) localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

/** Park a best for retry, keeping the highest per game. Exported for tests. */
export function queuePending(game: string, best: number): void {
  if (!LS_KEYS[game]) return;
  const queue = readPending();
  queue[game] = Math.max(n(queue[game]), Math.max(0, Math.floor(best) || 0));
  writePending(queue);
}

/** Drop a game's parked submit once it lands. Exported for tests. */
export function unqueuePending(game: string): void {
  const queue = readPending();
  if (!(game in queue)) return;
  delete queue[game];
  writePending(queue);
}

/**
 * Pure reconcile step (exported for tests): decide whether the cloud copy of a
 * game should replace the local one. Returns the blob to write to localStorage
 * when the cloud wins — its best is strictly greater, or this device has no
 * usable local data (missing OR corrupt JSON) — with the headline healed up to
 * the cloud best. Returns null to keep local. Never throws.
 */
export function reconcileRestore(slug: string, localRaw: string | null, row: CloudRow | null): unknown | null {
  const meta = HEADLINE[slug];
  if (!meta || !row || row.data == null) return null;
  let local: unknown = null;
  if (localRaw) {
    try {
      local = JSON.parse(localRaw);
    } catch {
      local = null; // corrupt local — treat as empty so the cloud copy wins
    }
  }
  const localBest = local ? meta.best(local) : 0;
  if (!local || n(row.best) > localBest) {
    const blob = row.data;
    if (meta.apply) meta.apply(blob, n(row.best));
    return blob;
  }
  return null;
}

/**
 * Fetch the signed-in player's saved blob for one game and write it to
 * localStorage when the cloud is better (or this device has no local data yet),
 * healing a stale headline up to the cloud best. Resolves `true` when local was
 * updated so the caller can reload its store and repaint. No-op when signed out.
 */
export async function restoreGame(slug: string): Promise<boolean> {
  await init();
  void flushPending(); // every game load is a chance to land an offline score
  if (!client || !user) return false;
  const key = LS_KEYS[slug];
  if (!key || !HEADLINE[slug]) return false;
  try {
    const { data } = await client.rpc('restore_my_scores');
    const row: CloudRow | null = (data || []).find((r: any) => r.game === slug) || null;
    const blob = reconcileRestore(slug, localStorage.getItem(key), row);
    if (blob != null) {
      localStorage.setItem(key, JSON.stringify(blob));
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

import { codedAvatarSvg } from './avatars';
import { rankBadgeHtml } from './rank';

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
          avatar: p?.avatar || user.user_metadata?.avatar_url || 'a:panda',
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
 * isn't deployed yet. No-op when signed out.
 *
 * Pass `{ backup: true }` to sync the game's blob even when `best` is 0 — used
 * to back up progress that isn't captured by the headline best (e.g. a Word
 * daily streak). The server keeps the max best, so this never lowers a score.
 */
export async function submitScore(game: string, best: number, opts?: { backup?: boolean }): Promise<void> {
  if (!(best > 0) && !opts?.backup) return;
  const safeBest = Math.max(0, Math.floor(best) || 0);
  await init();
  if (!client || !user) {
    // Signed in on this device but the SDK/session is unreachable (offline):
    // park the score rather than dropping it. Guests aren't on the board at all.
    if (hasStoredSession()) queuePending(game, safeBest);
    return;
  }
  if (await push(game, safeBest)) unqueuePending(game);
  else queuePending(game, safeBest);
}

/** One write attempt. Resolves `true` only when the score actually landed. */
async function push(game: string, best: number): Promise<boolean> {
  const data = readBlob(game);
  try {
    const rpc = await client.rpc('submit_score', { p_game: game, p_best: best, p_data: data });
    if (!rpc?.error) return true;
  } catch {
    /* fall through to the direct upsert */
  }
  try {
    const res = await client.from('arcade_scores').upsert(
      {
        user_id: user.id,
        game,
        best,
        data,
        display_name: profile?.name ?? googleName(user),
        avatar_url: profile?.avatar ?? null,
      },
      { onConflict: 'user_id,game' }
    );
    return !res?.error;
  } catch {
    return false;
  }
}

// supabase-js persists the session under `sb-<ref>-auth-token`. Reading it
// directly tells us "signed in on this device" even when the SDK itself failed
// to load, which is exactly the offline case we want to queue for.
function hasStoredSession(): boolean {
  if (user) return true;
  try {
    const ref = SUPABASE_URL.replace('https://', '').split('.')[0];
    return localStorage.getItem(`sb-${ref}-auth-token`) != null;
  } catch {
    return false;
  }
}

let flushing = false;

/** Retry every parked submit. Safe to call often; runs one flush at a time. */
export async function flushPending(): Promise<void> {
  if (flushing) return;
  const queue = readPending();
  const games = Object.keys(queue);
  if (!games.length) return;
  flushing = true;
  try {
    await init();
    if (!client || !user) return;
    for (const game of games) if (await push(game, queue[game])) unqueuePending(game);
  } catch {
    /* ignore */
  } finally {
    flushing = false;
  }
}

try {
  addEventListener('online', () => void flushPending());
} catch {
  /* ignore */
}

/**
 * Look up the player's standing and drop the badge above a game-over modal's
 * button row. Every game shows its rank the same way, so the lookup, the empty
 * cases and the insertion point all live here.
 */
export function mountRank(modal: Element, game: string, score: number): void {
  void getRank(game, score).then((info) => {
    const badge = rankBadgeHtml(info);
    if (badge) modal.querySelector('.row, .row-btns')?.insertAdjacentHTML('beforebegin', badge);
  });
}

/** Where `score` would place on `game`'s all-time board, plus the field size. */
export async function getRank(game: string, score: number): Promise<RankInfo | null> {
  await init();
  if (!(score > 0)) return null;
  // Unreachable backend: submitScore has parked the score, so say so rather than
  // showing nothing. Guests aren't on the board either way.
  const parked: RankInfo | null = hasStoredSession() ? { rank: 0, total: 0, offline: true } : null;
  if (!client) return parked;
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
    return parked;
  }
}
