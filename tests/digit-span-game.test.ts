import { describe, it, expect, beforeEach } from 'vitest';
import { DigitGame } from '../digit-span/src/game';

beforeEach(() => localStorage.clear());

describe('digit-span/recall', () => {
  it('expected order follows the mode', () => {
    const g = new DigitGame();
    g.sequence = [1, 2, 3];
    g.setMode('forward');
    expect(g.expected()).toEqual([1, 2, 3]);
    g.setMode('reverse');
    expect(g.expected()).toEqual([3, 2, 1]);
  });

  it('check compares against the expected order', () => {
    const g = new DigitGame();
    g.sequence = [4, 5, 6];
    expect(g.check([4, 5, 6])).toBe(true);
    expect(g.check([4, 5])).toBe(false); // wrong length
    expect(g.check([4, 6, 5])).toBe(false);
    g.setMode('reverse');
    expect(g.check([6, 5, 4])).toBe(true);
  });

  it('records best per mode and never on a tie', () => {
    const g = new DigitGame();
    g.sequence = [1, 2, 3, 4]; // fully recalled length = 3
    expect(g.recordBest()).toBe(true);
    expect(g.best).toBe(3);
    expect(g.recordBest()).toBe(false); // same span, no improvement
    g.setMode('reverse');
    expect(g.best).toBe(0); // best is per-mode
  });

  it('flash duration eases as the span grows but has a floor', () => {
    const g = new DigitGame();
    g.sequence = new Array(3).fill(0);
    const short = g.flashDuration();
    g.sequence = new Array(30).fill(0);
    const long = g.flashDuration();
    expect(long).toBeLessThan(short);
    expect(long).toBeGreaterThanOrEqual(450);
  });
});
