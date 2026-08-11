import { describe, it, expect } from 'vitest';
import { fmtScore } from '../shared/format';

describe('shared/format · fmtScore', () => {
  it('shows values under 1000 exactly', () => {
    expect(fmtScore(0)).toBe('0');
    expect(fmtScore(7)).toBe('7');
    expect(fmtScore(999)).toBe('999');
  });

  it('compacts thousands with SI-cased k (29000 -> 29k, 54000 -> 54k)', () => {
    expect(fmtScore(29000)).toBe('29k');
    expect(fmtScore(54000)).toBe('54k');
    expect(fmtScore(1000)).toBe('1k');
  });

  it('keeps one fractional digit when it matters', () => {
    expect(fmtScore(1200)).toBe('1.2k');
    expect(fmtScore(8085)).toBe('8.1k');
  });

  it('rounds up cleanly across a magnitude boundary', () => {
    expect(fmtScore(999999)).toBe('1M');
    expect(fmtScore(1000000)).toBe('1M');
    expect(fmtScore(1500000)).toBe('1.5M');
  });

  it('is resilient to non-finite input', () => {
    expect(fmtScore(NaN)).toBe('0');
    expect(fmtScore(Infinity)).toBe('0');
  });
});
