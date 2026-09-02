import { describe, it, expect } from 'vitest';
import { reconcileRestore } from '../shared/cloud';

const row = (best: number, data: unknown) => ({ best, data });
const raw = (o: unknown) => JSON.stringify(o);

describe('cloud/reconcileRestore', () => {
  it('heals a stale Wordle blob up to the real cloud best (the Yash bug)', () => {
    // cloud best 58 (monotonic, real) but the device blob had reset to 6
    const blob = reconcileRestore('wordle', raw({ maxStreak: 6, played: 11 }), row(58, { maxStreak: 6, played: 11 }));
    expect(blob).toMatchObject({ maxStreak: 58, played: 11 });
  });

  it('keeps local and never downgrades when local is ahead', () => {
    expect(reconcileRestore('wordle', raw({ maxStreak: 60 }), row(58, { maxStreak: 58 }))).toBeNull();
  });

  it('keeps local when the best is only equal (must be strictly greater)', () => {
    expect(reconcileRestore('chromatic', raw({ endlessBest: 40 }), row(40, { endlessBest: 40 }))).toBeNull();
  });

  it('keeps local when the cloud best is 0 (no real progress to pull)', () => {
    expect(reconcileRestore('hue-hunt', raw({ bestScore: 5 }), row(0, { bestScore: 0 }))).toBeNull();
  });

  it('restores when this device has no local data yet', () => {
    expect(reconcileRestore('wordle', null, row(10, { maxStreak: 10 }))).toMatchObject({ maxStreak: 10 });
  });

  it('restores (cloud wins) when the local JSON is corrupt', () => {
    // regression: corrupt local used to throw and silently abort the restore
    expect(reconcileRestore('wordle', '{bad json', row(7, { maxStreak: 7 }))).toMatchObject({ maxStreak: 7 });
  });

  it('heals a blob that is missing the headline field entirely', () => {
    expect(reconcileRestore('wordle', raw({}), row(5, {}))).toMatchObject({ maxStreak: 5 });
  });

  it('never restores a row with no data, or a null row, or an unknown slug', () => {
    expect(reconcileRestore('wordle', null, row(10, null))).toBeNull();
    expect(reconcileRestore('wordle', null, null)).toBeNull();
    expect(reconcileRestore('not-a-game', null, row(10, { x: 1 }))).toBeNull();
  });

  it('heals Where on the difficulty that is already leading', () => {
    const blob = reconcileRestore('where', raw({ bestEasy: 50, bestHard: 30 }), row(120, { bestEasy: 50, bestHard: 30 }));
    expect(blob).toMatchObject({ bestEasy: 120, bestHard: 30 });
  });

  it('never invents a Hard record for an Easy-only Where player', () => {
    // The cloud best is max(easy, hard); crediting Hard with it would show an
    // unbeatable record on a difficulty they never played.
    const blob = reconcileRestore('where', null, row(200, { bestEasy: 200, bestHard: 0 }));
    expect(blob).toMatchObject({ bestEasy: 200, bestHard: 0 });
  });

  it('heals Where on Hard when Hard is the leading difficulty', () => {
    const blob = reconcileRestore('where', raw({ bestEasy: 10, bestHard: 80 }), row(200, { bestEasy: 10, bestHard: 80 }));
    expect(blob).toMatchObject({ bestEasy: 10, bestHard: 200 });
  });

  it('does not downgrade Where when its local max already beats the cloud', () => {
    expect(reconcileRestore('where', raw({ bestEasy: 200, bestHard: 30 }), row(120, { bestEasy: 200, bestHard: 30 }))).toBeNull();
  });

  it('restores a map-keyed Echo blob without inventing a field', () => {
    const blob = reconcileRestore('echo', raw({ best: { 'forgiving-4': 11 } }), row(14, { best: { 'forgiving-4': 14 } }));
    expect(blob).toEqual({ best: { 'forgiving-4': 14 } }); // no single-field heal for map games
  });

  it('keeps local Echo when a per-config best beats the cloud max', () => {
    expect(reconcileRestore('echo', raw({ best: { 'strict-6': 20 } }), row(14, { best: { 'forgiving-4': 14 } }))).toBeNull();
  });

  it('heals Word practiceBest while preserving the cloud daily streak (independent metric)', () => {
    const blob = reconcileRestore(
      'word',
      raw({ practiceBest: 0, daily: { maxStreak: 3 } }),
      row(80, { practiceBest: 0, daily: { maxStreak: 30 } })
    );
    expect(blob).toMatchObject({ practiceBest: 80, daily: { maxStreak: 30 } });
  });

  it('heals every single-field game up to the cloud best', () => {
    const field: Record<string, string> = {
      'hue-hunt': 'bestScore',
      chromatic: 'endlessBest',
      flash: 'bestWpm',
      flashmath: 'bestScore',
      interval: 'bestScore',
      word: 'practiceBest',
      wordle: 'maxStreak',
    };
    for (const [slug, f] of Object.entries(field)) {
      const blob = reconcileRestore(slug, raw({ [f]: 1 }), row(99, { [f]: 1 })) as Record<string, number>;
      expect(blob[f]).toBe(99);
    }
  });
});
