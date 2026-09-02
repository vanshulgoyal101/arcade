// The per-game "where does its best live" rules exist twice: shared/cloud.ts
// (bundled into each game) and assets/auth.js (the hub, which is plain JS and
// can't import TypeScript). They must stay in lockstep — a game missing from one
// side silently skips cloud sync or survives an account switch with the previous
// player's scores. These tests parse both registries and fail on any drift.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = process.cwd() + '/'; // vitest runs from the arcade project root
const authSrc = readFileSync(root + 'assets/auth.js', 'utf8');
const cloudSrc = readFileSync(root + 'shared/cloud.ts', 'utf8');

const fieldsIn = (s: string) => [...s.matchAll(/s\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).sort();
const block = (src: string, start: string) => src.slice(src.indexOf(start)).split('\n};')[0];

/** slug -> { key, bestFields, healFields, usesMaxVal } from the hub registry. */
function parseAuth() {
  const out: Record<string, { key: string; best: string[]; heal: string[]; maxVal: boolean }> = {};
  for (const line of authSrc.split('\n')) {
    const m = /^\s*\{\s*slug:\s*'([^']+)'.*key:\s*'([^']+)'/.exec(line);
    if (!m) continue;
    const best = line.split('best:')[1].split('applyBest:')[0].split('extra:')[0];
    const heal = line.includes('applyBest:') ? line.split('applyBest:')[1].split('extra:')[0] : '';
    out[m[1]] = { key: m[2], best: fieldsIn(best), heal: fieldsIn(heal), maxVal: /maxVal\(/.test(best) };
  }
  return out;
}

/** slug -> same shape, from the game-side LS_KEYS + HEADLINE maps. */
function parseCloud() {
  const keys: Record<string, string> = {};
  for (const m of block(cloudSrc, 'const LS_KEYS').matchAll(/^\s*'?([a-z-]+)'?:\s*'([^']+)',/gm)) keys[m[1]] = m[2];

  const out: Record<string, { key: string; best: string[]; heal: string[]; maxVal: boolean }> = {};
  for (const line of block(cloudSrc, 'const HEADLINE').split('\n')) {
    const m = /^\s*'?([a-z-]+)'?:\s*\{\s*best:/.exec(line);
    if (!m) continue;
    const best = line.split('best:')[1].split('apply:')[0];
    const heal = line.includes('apply:') ? line.split('apply:')[1] : '';
    out[m[1]] = { key: keys[m[1]], best: fieldsIn(best), heal: fieldsIn(heal), maxVal: /maxVal\(/.test(best) };
  }
  return out;
}

const auth = parseAuth();
const cloud = parseCloud();

/** Every folder that is actually a built game (has src/main.ts). */
const gameDirs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${root}${d.name}/src/main.ts`))
  .map((d) => d.name)
  .sort();

describe('game registry parity (hub auth.js vs shared/cloud.ts)', () => {
  it('parses both registries', () => {
    expect(gameDirs.length).toBeGreaterThanOrEqual(11);
    expect(Object.keys(auth).length).toBe(gameDirs.length);
    expect(Object.keys(cloud).length).toBe(gameDirs.length);
  });

  it('registers every game that exists on disk, in both registries', () => {
    // A game missing here never syncs, and survives an account switch holding
    // the previous player's scores. This is what let interval leak.
    expect(Object.keys(auth).sort()).toEqual(gameDirs);
    expect(Object.keys(cloud).sort()).toEqual(gameDirs);
  });

  it.each(gameDirs)('%s agrees on storage key, best field and heal field', (slug) => {
    expect(auth[slug].key).toBe(cloud[slug].key);
    expect(auth[slug].best).toEqual(cloud[slug].best);
    expect(auth[slug].maxVal).toBe(cloud[slug].maxVal);
    // Map-keyed games (per-config bests) intentionally have no single-field heal.
    expect(auth[slug].heal).toEqual(cloud[slug].heal);
  });

  it('gives every map-keyed game no heal, and every single-field game one', () => {
    for (const slug of gameDirs) {
      const single = !auth[slug].maxVal;
      expect(auth[slug].heal.length > 0).toBe(single);
    }
  });

  it('uses a distinct localStorage key per game', () => {
    const keys = gameDirs.map((g) => auth[g].key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps interval out of the hub grid and leaderboard but inside sync', () => {
    // Deliberately unlisted on the hub, yet it must still be cleared/synced.
    expect(/slug: 'interval'[\s\S]*?hidden: true/.test(authSrc)).toBe(true);
    expect(authSrc).toContain('const BOARD_GAMES = GAMES.filter((g) => !g.hidden)');
    expect(authSrc).not.toMatch(/p_games: GAMES\.map/);
  });
});

describe('server score caps vs what a game can actually score', () => {
  const sql = readFileSync(root + 'supabase/arcade_scores.sql', 'utf8');
  const capOf = (slug: string) => {
    const m = new RegExp(`when '${slug}'\\s*then (\\d+)`).exec(sql);
    return m ? Number(m[1]) : Number(/else (\d+)/.exec(sql)?.[1]);
  };

  it('lets Flash record its full adaptive range', () => {
    // A cap below MAX_WPM silently truncates real reading speeds off the board:
    // it clamped a genuine 665 wpm run to 500 before this was raised to 900.
    const maxWpm = Number(/MAX_WPM = (\d+)/.exec(readFileSync(root + 'flash/src/game.ts', 'utf8'))![1]);
    expect(maxWpm).toBeGreaterThan(0);
    expect(capOf('flash')).toBeGreaterThanOrEqual(maxWpm);
  });

  it('still caps every game, so a forged score stays bounded', () => {
    for (const slug of gameDirs) expect(capOf(slug)).toBeGreaterThan(0);
    expect(capOf('echo')).toBeLessThanOrEqual(200);
    expect(capOf('digit-span')).toBeLessThanOrEqual(200);
  });
});
