import { describe, it, expect, beforeEach } from 'vitest';
import { gridSize, colorDelta, makeRound, HueGame } from '../hue-hunt/src/game';

beforeEach(() => localStorage.clear());

describe('hue-hunt/game helpers', () => {
  it('gridSize grows with level and caps at 7', () => {
    expect(gridSize(1)).toBe(2);
    expect(gridSize(3)).toBe(3);
    expect(gridSize(100)).toBe(7);
  });

  it('colorDelta shrinks with level and floors at 12', () => {
    expect(colorDelta(1)).toBe(50);
    expect(colorDelta(1)).toBeGreaterThan(colorDelta(5));
    expect(colorDelta(100)).toBe(12);
  });

  it('makeRound always places the odd tile inside the grid', () => {
    for (let lvl = 1; lvl <= 12; lvl++) {
      const r = makeRound(lvl);
      expect(r.oddIndex).toBeGreaterThanOrEqual(0);
      expect(r.oddIndex).toBeLessThan(r.size * r.size);
    }
  });

  it('the odd tile always differs from the base colour', () => {
    for (let lvl = 1; lvl <= 60; lvl++) {
      for (let i = 0; i < 200; i++) {
        const { base, odd } = makeRound(lvl);
        const differs = base.h !== odd.h || base.s !== odd.s || base.l !== odd.l;
        expect(differs).toBe(true);
      }
    }
  });
});

describe('hue-hunt/HueGame scoring', () => {
  it('a correct pick adds points and grows the combo', () => {
    const g = new HueGame();
    g.start(0);
    const { points } = g.correctPick(100);
    expect(points).toBeGreaterThan(0);
    expect(g.level).toBe(2);
    expect(g.combo).toBe(1);
  });

  it('a combo of three reaches at least a x2 multiplier', () => {
    const g = new HueGame();
    g.start(0);
    g.correctPick(100);
    g.correctPick(100);
    g.correctPick(100);
    expect(g.multiplier).toBeGreaterThanOrEqual(2);
  });

  it('a wrong pick resets combo/multiplier and burns time', () => {
    const g = new HueGame();
    g.start(0);
    g.correctPick(100);
    g.correctPick(100);
    g.correctPick(100);
    const before = g.timeLeft;
    g.wrongPick();
    expect(g.combo).toBe(0);
    expect(g.multiplier).toBe(1);
    expect(g.timeLeft).toBeLessThan(before);
  });

  it('end() records a new best score', () => {
    const g = new HueGame();
    g.start(0);
    g.correctPick(100);
    expect(g.end()).toBe(true);
    expect(g.store.bestScore).toBeGreaterThan(0);
  });
});
