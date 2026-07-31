import { describe, it, expect, beforeEach } from 'vitest';
import { WhereGame } from '../where/src/game';
import {
  COUNTRIES,
  EASY_COUNTRIES,
  HARD_COUNTRIES,
  countriesFor,
  flagEmoji,
} from '../where/src/content';

beforeEach(() => localStorage.clear());

describe('where/content', () => {
  it('derives a two-glyph flag emoji from an ISO code', () => {
    const flag = flagEmoji('US');
    expect([...flag]).toHaveLength(2); // two regional-indicator symbols
    expect(flag).not.toBe('US');
  });

  it('all country codes are two letters', () => {
    for (const c of COUNTRIES) expect(c.code).toMatch(/^[A-Z]{2}$/);
  });
});

describe('where/difficulty', () => {
  it('easy is ~100 famous countries and hard is the rest, with no overlap', () => {
    expect(EASY_COUNTRIES.length).toBe(100);
    expect(EASY_COUNTRIES.length + HARD_COUNTRIES.length).toBe(COUNTRIES.length);
    const easyCodes = new Set(EASY_COUNTRIES.map((c) => c.code));
    expect(HARD_COUNTRIES.some((c) => easyCodes.has(c.code))).toBe(false);
    expect(EASY_COUNTRIES.some((c) => c.code === 'US')).toBe(true); // famous
  });

  it('countriesFor returns the matching pool', () => {
    expect(countriesFor('easy')).toBe(EASY_COUNTRIES);
    expect(countriesFor('hard')).toBe(HARD_COUNTRIES);
  });

  it('draws target and options only from the selected difficulty pool', () => {
    for (const diff of ['easy', 'hard'] as const) {
      const g = new WhereGame();
      g.setDifficulty(diff);
      const codes = new Set(countriesFor(diff).map((c) => c.code));
      for (let i = 0; i < 40; i++) {
        g.nextRound();
        expect(codes.has(g.target.code)).toBe(true);
        for (const o of g.options) expect(codes.has(o.code)).toBe(true);
      }
    }
  });

  it('tracks a separate best per difficulty', () => {
    const g = new WhereGame();
    g.setDifficulty('easy');
    g.start();
    g.store.bestHard = 999;
    expect(g.best).toBe(0); // easy best, unaffected by hard best
    g.setDifficulty('hard');
    expect(g.best).toBe(999);
  });

  it('shows every country once before repeating (deck-based, no early repeats)', () => {
    const g = new WhereGame();
    g.setDifficulty('easy');
    g.start();
    const seen = [g.target.code];
    for (let i = 1; i < EASY_COUNTRIES.length; i++) {
      g.nextRound(); // all "answered correctly" → nothing re-queued
      seen.push(g.target.code);
    }
    expect(new Set(seen).size).toBe(EASY_COUNTRIES.length); // a full pass is all-distinct
  });
});

describe('where/rounds', () => {
  it('builds four unique options that include the target', () => {
    const g = new WhereGame();
    for (let i = 0; i < 50; i++) {
      g.nextRound();
      expect(g.options).toHaveLength(4);
      expect(g.options.some((o) => o.name === g.target.name)).toBe(true);
      const names = new Set(g.options.map((o) => o.name));
      expect(names.size).toBe(4); // no duplicates
    }
  });

  it('newBest is true only when strictly beating the stored best', () => {
    const tie = new WhereGame();
    tie.start();
    tie.score = 30;
    tie.store.bestEasy = 30;
    tie.lives = 1;
    const wrongName = COUNTRIES.find((c) => c.name !== tie.target.name)!.name;
    expect(tie.answer(wrongName).newBest).toBe(false);

    const beat = new WhereGame();
    beat.start();
    beat.score = 40;
    beat.store.bestEasy = 10;
    beat.lives = 1;
    const wrong2 = COUNTRIES.find((c) => c.name !== beat.target.name)!.name;
    expect(beat.answer(wrong2).newBest).toBe(true);
  });
});
