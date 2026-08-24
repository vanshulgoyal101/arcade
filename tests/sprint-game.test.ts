import { describe, it, expect, beforeEach } from 'vitest';
import { SprintGame } from '../sprint/src/game';

beforeEach(() => localStorage.clear());

describe('sprint/typing stats', () => {
  it('a perfectly typed word counts every character plus a space', () => {
    const g = new SprintGame();
    g.upcoming = ['the', 'and', 'cat'];
    g.begin(0);
    g.submitWord('the');
    const s = g.stats(60_000); // 1 minute elapsed
    expect(s.correctChars).toBe(4); // "the" + space
    expect(s.incorrectChars).toBe(0);
    expect(s.accuracy).toBe(100);
    expect(s.words).toBe(1);
  });

  it('mistypes lower accuracy and are recorded as weak letters', () => {
    const g = new SprintGame();
    g.upcoming = ['the'];
    g.begin(0);
    g.submitWord('teh'); // h/e swapped -> 2 wrong chars
    const s = g.stats(60_000);
    expect(s.incorrectChars).toBeGreaterThan(0);
    expect(s.accuracy).toBeLessThan(100);
    const weak = g.weakLetters();
    expect(weak.length).toBeGreaterThan(0);
    expect(weak[0].count).toBeGreaterThanOrEqual(weak[weak.length - 1].count); // sorted
  });

  it('clears weak-letter tracking on a new run', () => {
    const g = new SprintGame();
    g.upcoming = ['the'];
    g.begin(0);
    g.submitWord('teh'); // records weak letters
    expect(g.weakLetters().length).toBeGreaterThan(0);
    g.reset();
    expect(g.weakLetters()).toEqual([]);
  });

  it('tracks the best wpm per duration', () => {    const g = new SprintGame();
    g.setDuration(15);
    g.upcoming = ['a'];
    g.begin(0);
    g.submitWord('a');
    const { newBest } = g.finish(30_000);
    expect(newBest).toBe(true);
    expect(g.best).toBeGreaterThan(0);
    expect(g.store.best['15']).toBe(g.best);
  });
});
