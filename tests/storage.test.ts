import { describe, it, expect, beforeEach } from 'vitest';
import { loadStore as loadWhere } from '../where/src/storage';
import { loadStore as loadWord } from '../word/src/storage';
import { loadStore as loadWordle } from '../wordle/src/storage';
import { loadStore as loadFlash } from '../flash/src/storage';
import { loadStore as loadEcho } from '../echo/src/storage';

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
});

describe('echo/storage · loadStore defaults', () => {
  it('defaults to an empty best map, unmuted', () => {
    expect(loadEcho()).toEqual({ best: {}, muted: false });
  });

  it('preserves stored per-config bests', () => {
    set('echo.v2', { best: { 'strict-4': 9 }, muted: true });
    expect(loadEcho()).toEqual({ best: { 'strict-4': 9 }, muted: true });
  });
});
