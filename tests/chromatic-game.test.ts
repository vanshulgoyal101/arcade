import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../chromatic/src/game';

beforeEach(() => localStorage.clear());

describe('chromatic/game', () => {
  it('a perfect daily guess scores 100 and finishes the day', () => {
    const g = new Game();
    g.startDaily();
    g.setGuess(g.target);
    const r = g.submit();
    expect(r.accuracy).toBe(100);
    expect(r.gameOver).toBe(true);
    expect(g.finished).toBe(true);
  });

  it('daily can only be played once per day (persisted)', () => {
    const g = new Game();
    g.startDaily();
    g.setGuess(g.target);
    g.submit();
    const reloaded = new Game(); // reads the same localStorage
    expect(reloaded.dailyAlreadyDone).toBe(true);
  });

  it('endless: a perfect guess passes and advances the level', () => {
    const g = new Game();
    g.startEndless();
    g.setDifficulty('normal');
    g.setGuess(g.target);
    const pass = g.submit();
    expect(pass.passed).toBe(true);
    expect(g.level).toBe(2);
  });

  it('endless: a far-off guess fails and costs a life', () => {
    const g = new Game();
    g.startEndless();
    const t = g.target;
    g.setGuess({ r: 255 - t.r, g: 255 - t.g, b: 255 - t.b });
    const before = g.lives;
    const miss = g.submit();
    expect(miss.passed).toBe(false);
    expect(g.lives).toBe(before - 1);
  });

  it('endless ends after all lives are lost', () => {
    const g = new Game();
    g.startEndless();
    for (let i = 0; i < 3; i++) {
      const t = g.target;
      g.setGuess({ r: 255 - t.r, g: 255 - t.g, b: 255 - t.b });
      g.submit();
    }
    expect(g.lives).toBeLessThanOrEqual(0);
    expect(g.finished).toBe(true);
  });

  it('harder difficulty raises the pass threshold', () => {
    const g = new Game();
    g.startEndless();
    g.setDifficulty('easy');
    const easy = g.threshold;
    g.setDifficulty('hard');
    expect(g.threshold).toBeGreaterThan(easy);
  });
});
