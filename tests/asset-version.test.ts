import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const read = (name: string) => readFileSync(resolve(process.cwd(), name), 'utf8');
const sha = (name: string) =>
  createHash('sha256').update(readFileSync(resolve(process.cwd(), name))).digest('hex').slice(0, 16);

// The hub's shared assets are versioned by query string, not by content hash, so
// sw.js caches each ?v= forever. Edit one without bumping its ?v= and returning
// visitors keep the old copy indefinitely — the bug that shipped monochrome
// icons. These digests pin content to version: bump both together, never one.
const VERSIONED = [
  { file: 'assets/style.css', version: 9, digest: '7a1744924c567e35' },
  { file: 'assets/auth.js', version: 19, digest: '0165d4a5d128b74f' },
] as const;

const hub = read('index.html');

describe('versioned hub assets', () => {
  for (const { file, version, digest } of VERSIONED) {
    it(`${file} is published as ?v=${version}`, () => {
      const name = file.split('/').pop()!.replace('.', '\\.');
      const found = hub.match(new RegExp(`assets/${name}\\?v=(\\d+)`));
      expect(found, `index.html does not load ${file} with a ?v=`).not.toBeNull();
      expect(Number(found![1])).toBe(version);
    });

    it(`${file} content matches its pinned version`, () => {
      expect(
        sha(file),
        `${file} changed but is still served as ?v=${version}. Bump the ?v= in ` +
          `index.html (and 404.html for style.css), then update this digest.`
      ).toBe(digest);
    });
  }

  // 404.html loads the same stylesheet; a mismatched ?v= gives it its own stale
  // cache entry, which is how it drifted to v=4 while the hub was on v=8.
  it('404.html requests the same stylesheet version as the hub', () => {
    const style = VERSIONED.find((a) => a.file === 'assets/style.css')!;
    const found = read('404.html').match(/assets\/style\.css\?v=(\d+)/);
    expect(found, '404.html does not load style.css with a ?v=').not.toBeNull();
    expect(Number(found![1])).toBe(style.version);
  });
});

describe('service worker caching', () => {
  const sw = read('sw.js');

  it('only treats content-hashed bundles as immutable', () => {
    const found = sw.match(/const IMMUTABLE = (\/.*\/);/);
    expect(found, 'sw.js has no IMMUTABLE pattern').not.toBeNull();
    const immutable = new RegExp(found![1].slice(1, -1));

    // Hashed bundles rename themselves on every build, so they are safe forever.
    expect(immutable.test('/hue-hunt/assets/template-C-dm3xE_.js')).toBe(true);
    expect(immutable.test('/chromatic/assets/template-ClcIYZv7.css')).toBe(true);

    // These keep their path across deploys and must never be cached-first.
    expect(immutable.test('/assets/style.css')).toBe(false);
    expect(immutable.test('/assets/auth.js')).toBe(false);
    expect(immutable.test('/assets/analytics.js')).toBe(false);
  });

  it('revalidates non-immutable assets in the background', () => {
    expect(sw).toMatch(/cached \|\| \(await network\)/);
  });
});
