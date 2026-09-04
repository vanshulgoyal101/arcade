import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

// Resolved from the vitest root (the repo root), since import.meta.url points at
// the jsdom document URL under this environment.
const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');

const hub = read('index.html');
// The hub cards are the source of truth: a game is "featured" when it has a card.
// (interval/ is built and reachable but deliberately not carded.)
const featured = [...new Set([...hub.matchAll(/href="([a-z-]+)\/"/g)].map((m) => m[1]))];

describe('featured game count', () => {
  it('links every featured game exactly once', () => {
    expect(featured.length).toBeGreaterThan(0);
    expect(new Set(featured).size).toBe(featured.length);
  });

  // The count is quoted in prose and in the SEO copy, so it silently rots
  // whenever a card is added or removed.
  it('is quoted correctly in the README', () => {
    const m = read('README.md').match(/\*\*(\d+) tiny/);
    expect(m, 'no count found in README.md').not.toBeNull();
    expect(Number(m![1]), `README.md is stale — ${featured.length} games are carded`)
      .toBe(featured.length);
  });

  it('is quoted correctly in the hub SEO copy', () => {
    const quoted = [...hub.matchAll(/(\d+) Free Browser/g)].map((m) => Number(m[1]));
    expect(quoted.length, 'no SEO count found in index.html').toBeGreaterThan(0);
    for (const n of quoted) {
      expect(n, `index.html is stale — ${featured.length} games are carded`).toBe(featured.length);
    }
  });
});
