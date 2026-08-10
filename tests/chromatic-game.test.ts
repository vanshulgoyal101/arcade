import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../chromatic/src/game';

beforeEach(() => localStorage.clear());

describe('chromatic/game', () => {
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

  it('the pass threshold ramps up with the level but stays achievable', () => {
    const g = new Game();
    g.setDifficulty('easy');
    g.startEndless(); // level 1
    const t1 = g.threshold;
    g.level = 40;
    expect(g.threshold).toBeGreaterThan(t1); // higher levels demand more accuracy
    g.level = 1000;
    expect(g.threshold).toBeLessThanOrEqual(98); // never reaches an impossible 100%
  });
});
