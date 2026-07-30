import { describe, it, expect } from 'vitest';
import { tokenize, wordCount } from '../flash/src/rsvp';

describe('flash/rsvp', () => {
  it('tokenizes into words whose pieces reassemble the original', () => {
    const toks = tokenize('The quick brown fox');
    expect(toks).toHaveLength(4);
    for (const t of toks) {
      expect(t.left + t.pivot + t.right).toBe(t.raw);
      expect(t.pivot.length).toBeLessThanOrEqual(1);
    }
  });

  it('collapses runs of whitespace when counting words', () => {
    expect(wordCount('  a   b\tc\n d ')).toBe(4);
  });

  it('adds extra dwell time after sentence-ending punctuation', () => {
    const [plain] = tokenize('word');
    const [dotted] = tokenize('word.');
    expect(dotted.delayFactor).toBeGreaterThan(plain.delayFactor);
  });
});
