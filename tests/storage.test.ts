import { describe, it, expect, beforeEach } from 'vitest';
import { loadStore as loadWhere } from '../where/src/storage';
import { loadStore as loadWord } from '../word/src/storage';
import { loadStore as loadWordle } from '../wordle/src/storage';
import { loadStore as loadFlash } from '../flash/src/storage';
import { loadStore as loadEcho } from '../echo/src/storage';
import { loadStore as loadHue } from '../hue-hunt/src/storage';
import { loadStore as loadChromatic } from '../chromatic/src/storage';
import { loadStore as loadFlashmath } from '../flashmath/src/storage';
import { loadStore as loadSprint } from '../sprint/src/storage';
import { loadStore as loadDigit } from '../digit-span/src/storage';
import { loadStore as loadInterval } from '../interval/src/storage';
import { loadStore as load2048 } from '../2048/src/storage';

beforeEach(() => localStorage.clear());

const set = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

describe('where/storage · loadStore migration', () => {
  it('defaults to zero bests when nothing is stored', () => {
    expect(loadWhere()).toEqual({ bestEasy: 0, bestHard: 0 });
  });

  it('migrates a legacy single bestScore into the Hard pool', () => {
    set('where.v1', { bestScore: 500 });
    expect(loadWhere()).toEqual({ bestEasy: 0, bestHard: 500 });
  });

  it('prefers the new per-difficulty bests over the legacy field', () => {
    set('where.v1', { bestEasy: 120, bestHard: 240, bestScore: 999 });
    expect(loadWhere()).toEqual({ bestEasy: 120, bestHard: 240 });
  });

  it('falls back to zeros on corrupt JSON', () => {
    localStorage.setItem('where.v1', '{not json');
    expect(loadWhere()).toEqual({ bestEasy: 0, bestHard: 0 });
  });

  it('rejects wrong-typed and negative bests', () => {
    set('where.v1', { bestEasy: '900', bestHard: -4, bestScore: [] });
    expect(loadWhere()).toEqual({ bestEasy: 0, bestHard: 0 });
  });
});

describe('word/storage · loadStore migration', () => {
  it('returns clean defaults when empty', () => {
    expect(loadWord()).toEqual({ daily: { streak: 0, maxStreak: 0, lastKey: '' }, practiceBest: 0, learnedIds: [] });
  });

  it('drops a legacy numeric "learned" field (now learnedIds[])', () => {
    set('word.v1', { learned: 7, practiceBest: 30 });
    const s = loadWord();
    expect(s.learnedIds).toEqual([]);
    expect(s.practiceBest).toBe(30);
  });

  it('fills missing daily sub-fields', () => {
    set('word.v1', { daily: { streak: 3 } });
    expect(loadWord().daily).toEqual({ streak: 3, maxStreak: 0, lastKey: '' });
  });

  it('preserves a valid learnedIds array', () => {
    set('word.v1', { learnedIds: ['ephemeral', 'quixotic'] });
    expect(loadWord().learnedIds).toEqual(['ephemeral', 'quixotic']);
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('word.v1', 'nope');
    expect(loadWord().learnedIds).toEqual([]);
  });

  it('sanitizes counters, day keys and duplicate learned ids', () => {
    set('word.v1', {
      daily: { streak: -2, maxStreak: '9', lastKey: '2026-09-05-too-long' },
      practiceBest: Infinity,
      learnedIds: ['one', 2, 'one', 'two'],
    });
    expect(loadWord()).toEqual({
      daily: { streak: 0, maxStreak: 0, lastKey: '2026-09-05' },
      practiceBest: 0,
      learnedIds: ['one', 'two'],
    });
  });
});

describe('wordle/storage · loadStore sanitising', () => {
  it('starts fresh with a 7-slot distribution', () => {
    expect(loadWordle().distribution).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('pads a short distribution to seven slots', () => {
    set('wordle.v1', { distribution: [0, 1, 2] });
    expect(loadWordle().distribution).toEqual([0, 1, 2, 0, 0, 0, 0]);
  });

  it('trims an over-long distribution to seven slots', () => {
    set('wordle.v1', { distribution: [0, 1, 2, 3, 4, 5, 6, 99, 100] });
    expect(loadWordle().distribution).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('coerces negative or non-numeric counts to zero', () => {
    set('wordle.v1', { distribution: [0, -3, 'x', null, 2, 1, 4] });
    expect(loadWordle().distribution).toEqual([0, 0, 0, 0, 2, 1, 4]);
  });

  it('falls back to fresh stats on corrupt JSON', () => {
    localStorage.setItem('wordle.v1', '{');
    expect(loadWordle()).toEqual({ played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0, 0] });
  });

  it('sanitizes scalar counters as well as the distribution', () => {
    set('wordle.v1', { played: '10', wins: -1, currentStreak: NaN, maxStreak: [], distribution: [] });
    expect(loadWordle()).toEqual({
      played: 0, wins: 0, currentStreak: 0, maxStreak: 0,
      distribution: [0, 0, 0, 0, 0, 0, 0],
    });
  });
});

describe('flash/storage · loadStore defaults', () => {
  it('merges a partial store over the defaults (keeps default wpm)', () => {
    set('flash.v1', { bestWpm: 450 });
    const s = loadFlash();
    expect(s.bestWpm).toBe(450);
    expect(s.wpm).toBe(300); // untouched default target speed
    expect(s.comprehensionCount).toBe(0);
  });

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('flash.v1', 'x');
    expect(loadFlash().wpm).toBe(300);
  });

  it('sanitizes every numeric field instead of spreading wrong types', () => {
    set('flash.v1', {
      wpm: '900', bestWpm: -1, passagesDone: [], wordsRead: null,
      bestStreak: Infinity, comprehensionSum: 'x', comprehensionCount: {},
    });
    expect(loadFlash()).toEqual({
      wpm: 300, bestWpm: 0, passagesDone: 0, wordsRead: 0,
      bestStreak: 0, comprehensionSum: 0, comprehensionCount: 0,
    });
  });
});

describe('echo/storage · loadStore defaults', () => {
  it('defaults to an empty best map, unmuted', () => {
    expect(loadEcho()).toEqual({ best: {}, muted: false });
  });

  it('preserves stored per-config bests', () => {
    set('echo.v2', { best: { 'strict-4': 9 }, muted: true });
    expect(loadEcho()).toEqual({ best: { 'strict-4': 9 }, muted: true });
  });

  it('returns a writable, allow-listed map from wrong-shaped data', () => {
    set('echo.v2', { best: 'not-an-object', muted: 'yes' });
    const store = loadEcho();
    expect(store).toEqual({ best: {}, muted: false });
    expect(() => { store.best['strict-4'] = 3; }).not.toThrow();

    set('echo.v2', { best: { 'strict-4': 9.8, bogus: 999, __proto__: 20 } });
    expect(loadEcho().best).toEqual({ 'strict-4': 9 });
  });
});

describe('remaining stores · runtime type boundaries', () => {
  it('sanitizes Hue Hunt', () => {
    set('huehunt.v2', { bestScore: null, bestLevel: -1, muted: 'yes' });
    expect(loadHue()).toEqual({ bestScore: 0, bestLevel: 0, muted: false });
  });

  it('sanitizes Chromatic', () => {
    set('chromatic.v2', { endlessBest: '99', muted: 1 });
    expect(loadChromatic()).toEqual({ endlessBest: 0, muted: false });
  });

  it('sanitizes Flashmath', () => {
    set('flashmath.v1', { bestScore: [], bestSolved: NaN, muted: 'true' });
    expect(loadFlashmath()).toEqual({ bestScore: 0, bestSolved: 0, muted: false });
  });

  it('sanitizes Sprint and leaves its map writable', () => {
    set('sprint.v1', { best: 'bad' });
    const store = loadSprint();
    expect(store).toEqual({ best: {} });
    expect(() => { store.best['30'] = 50; }).not.toThrow();

    set('sprint.v1', { best: { '30': 52.9, '999': 900 } });
    expect(loadSprint().best).toEqual({ '30': 52 });
  });

  it('sanitizes Digit Span and leaves its map writable', () => {
    set('digitspan.v1', { best: [], muted: 'yes' });
    const store = loadDigit();
    expect(store).toEqual({ best: {}, muted: false });
    expect(() => { store.best.forward = 5; }).not.toThrow();

    set('digitspan.v1', { best: { forward: 8.9, impossible: 500 }, muted: true });
    expect(loadDigit()).toEqual({ best: { forward: 8 }, muted: true });
  });

  it('sanitizes Interval', () => {
    set('interval.v1', { bestScore: -50, muted: 1 });
    expect(loadInterval()).toEqual({ bestScore: 0, muted: false });
  });

  it('sanitizes 2048 and rejects a primitive root', () => {
    set('2048.v1', { best: 42.9, bestTile: '2048', muted: 'yes' });
    expect(load2048()).toEqual({ best: 42, bestTile: 0, muted: false });
    set('2048.v1', []);
    expect(load2048()).toEqual({ best: 0, bestTile: 0, muted: false });
  });
});
