import { describe, it, expect, beforeEach } from 'vitest';
import { WhereGame } from '../where/src/game';
import { COUNTRIES, flagEmoji } from '../where/src/content';

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
    tie.store.bestScore = 30;
    tie.lives = 1;
    const wrongName = COUNTRIES.find((c) => c.name !== tie.target.name)!.name;
    expect(tie.answer(wrongName).newBest).toBe(false);

    const beat = new WhereGame();
    beat.start();
    beat.score = 40;
    beat.store.bestScore = 10;
    beat.lives = 1;
    const wrong2 = COUNTRIES.find((c) => c.name !== beat.target.name)!.name;
    expect(beat.answer(wrong2).newBest).toBe(true);
  });
});
