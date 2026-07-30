import { describe, it, expect } from 'vitest';
import {
  clamp255,
  distance,
  accuracy,
  toHex,
  toCss,
  contrastText,
  MAX_DISTANCE,
  targetFromSeed,
  todayKey,
  yesterdayKey,
} from '../chromatic/src/color';

describe('chromatic/color', () => {
  it('clamp255 clamps and rounds', () => {
    expect(clamp255(-5)).toBe(0);
    expect(clamp255(300)).toBe(255);
    expect(clamp255(127.6)).toBe(128);
  });

  it('distance is 0 for identical colours and MAX for black/white', () => {
    expect(distance({ r: 10, g: 20, b: 30 }, { r: 10, g: 20, b: 30 })).toBe(0);
    expect(distance({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(MAX_DISTANCE);
  });

  it('accuracy is 100 for a perfect match and 0 for opposite', () => {
    expect(accuracy({ r: 1, g: 2, b: 3 }, { r: 1, g: 2, b: 3 })).toBe(100);
    expect(accuracy({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(0);
  });

  it('toHex formats an uppercase 6-digit hex', () => {
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(toHex({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
    expect(toHex({ r: 16, g: 32, b: 48 })).toBe('#102030');
  });

  it('toCss formats rgb()', () => {
    expect(toCss({ r: 1, g: 2, b: 3 })).toBe('rgb(1, 2, 3)');
  });

  it('contrastText picks dark text on light backgrounds and vice versa', () => {
    expect(contrastText({ r: 255, g: 255, b: 255 })).toBe('#10131c');
    expect(contrastText({ r: 0, g: 0, b: 0 })).toBe('#ffffff');
  });

  it('targetFromSeed is deterministic and stays in 0..255', () => {
    const a = targetFromSeed('chromatic-2026-07-30');
    const b = targetFromSeed('chromatic-2026-07-30');
    expect(a).toEqual(b);
    for (const k of ['r', 'g', 'b'] as const) {
      expect(a[k]).toBeGreaterThanOrEqual(0);
      expect(a[k]).toBeLessThanOrEqual(255);
    }
  });

  it('targetFromSeed differs across seeds', () => {
    expect(targetFromSeed('a')).not.toEqual(targetFromSeed('b'));
  });

  it('yesterdayKey is the calendar day before todayKey', () => {
    const d = new Date('2026-03-01T12:00:00');
    expect(todayKey(d)).toBe('2026-03-01');
    expect(yesterdayKey(d)).toBe('2026-02-28');
  });
});
