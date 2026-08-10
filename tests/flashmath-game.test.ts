import { describe, it, expect, beforeEach } from 'vitest';
import { MathGame, makeProblem, tierFor } from '../flashmath/src/game';

beforeEach(() => localStorage.clear());

describe('flashmath/problem generation', () => {
  it('tier grows every three levels and caps at 4', () => {
    expect(tierFor(1)).toBe(0);
    expect(tierFor(3)).toBe(0);
    expect(tierFor(4)).toBe(1);
    expect(tierFor(100)).toBe(4);
  });

  it('every generated problem is internally consistent', () => {
    for (let level = 1; level <= 30; level++) {
      for (let i = 0; i < 40; i++) {
        const p = makeProblem(level);
        switch (p.op) {
          case '+':
            expect(p.answer).toBe(p.a + p.b);
            break;
          case '−':
            expect(p.answer).toBe(p.a - p.b);
            expect(p.answer).toBeGreaterThanOrEqual(0); // never negative
            break;
          case '×':
            expect(p.answer).toBe(p.a * p.b);
            break;
          case '÷':
            expect(p.a % p.b).toBe(0); // divides evenly
            expect(p.answer).toBe(p.a / p.b);
            break;
        }
      }
    }
  });

  it('difficulty scales with level — no trivial products at high levels', () => {
    // At a high level the multiplication factors have a raised floor (no 2×2).
    for (let i = 0; i < 300; i++) {
      const p = makeProblem(20);
      if (p.op === '×') {
        expect(p.a).toBeGreaterThanOrEqual(5);
        expect(p.b).toBeGreaterThanOrEqual(5);
      }
    }
    // Operand magnitudes grow with the level.
    const maxOperand = (lvl: number): number => {
      let m = 0;
      for (let i = 0; i < 400; i++) {
        const p = makeProblem(lvl);
        m = Math.max(m, p.a, p.b);
      }
      return m;
    };
    expect(maxOperand(25)).toBeGreaterThan(maxOperand(4));
  });
});

describe('flashmath/scoring', () => {
  it('a correct answer scores, advances the level and adds time', () => {
    const g = new MathGame();
    g.start(0);
    g.timeLeft = 20_000; // below the cap so the bonus is observable
    g.problem = { a: 2, b: 3, op: '+', answer: 5 };
    const before = g.timeLeft;
    const r = g.submit(5, 10_000); // slow-ish but correct
    expect(r.correct).toBe(true);
    expect(r.points).toBeGreaterThan(0);
    expect(g.level).toBe(2);
    expect(g.solved).toBe(1);
    expect(g.timeLeft).toBeGreaterThan(before);
  });

  it('a wrong answer resets the combo and burns time', () => {
    const g = new MathGame();
    g.start(0);
    g.problem = { a: 2, b: 3, op: '+', answer: 5 };
    g.submit(5, 100); // build combo
    const before = g.timeLeft;
    const r = g.submit(999, 200);
    expect(r.correct).toBe(false);
    expect(g.combo).toBe(0);
    expect(g.multiplier).toBe(1);
    expect(g.timeLeft).toBeLessThan(before);
  });

  it('records a best score on game over', () => {
    const g = new MathGame();
    g.start(0);
    g.problem = { a: 1, b: 1, op: '+', answer: 2 };
    g.submit(2, 50);
    const scored = g.score;
    expect(g.end()).toBe(true);
    expect(g.store.bestScore).toBe(scored);
  });
});
