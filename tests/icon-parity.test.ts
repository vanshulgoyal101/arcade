// The same game glyphs exist twice: shared/icons.ts for the TS games, and
// assets/games.js for the no-build hub and stats page, which cannot import a
// .ts module at runtime. They must draw the same mark, so compare the geometry.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { GAME_ART, gameIcon, gameName } from '../assets/games.js';

const root = process.cwd() + '/';
const iconsSrc = readFileSync(root + 'shared/icons.ts', 'utf8');

const gameDirs = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${root}${d.name}/src/main.ts`))
  .map((d) => d.name)
  .sort();

/** Every geometry value in a chunk of SVG markup, in order. Covers <rect> and
 *  <circle> too — comparing only `d` would silently pass icons drawn as shapes. */
const paths = (svg: string) =>
  [...svg.matchAll(/\s(?:d|cx|cy|r|x|y|width|height|rx|ry)="([^"]+)"/g)].map((m) => m[1]);
/** slug -> the ICON_* constant body in shared/icons.ts. */
const constName = (slug: string) => 'ICON_' + slug.toUpperCase().replace(/-/g, '_');

describe('game glyph parity (assets/games.js vs shared/icons.ts)', () => {
  it('covers every game on disk, plus the hub', () => {
    expect(Object.keys(GAME_ART).sort()).toEqual([...gameDirs, 'hub'].sort());
  });

  it.each(gameDirs)('%s draws the same geometry in both sets', (slug) => {
    const decl = new RegExp(`export const ${constName(slug)} = glyph\\(([\\s\\S]*?)\\n?\\);`).exec(iconsSrc);
    expect(decl, `${constName(slug)} missing from shared/icons.ts`).not.toBeNull();
    expect(paths(GAME_ART[slug].path)).toEqual(paths(decl![1]));
  });

  it('renders a usable glyph for every entry', () => {
    for (const slug of Object.keys(GAME_ART)) {
      const svg = gameIcon(slug);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('aria-hidden="true"');
      expect(svg).toContain('var(--accent)');
      expect(gameName(slug).length).toBeGreaterThan(1);
    }
  });

  it('degrades quietly on an unknown slug', () => {
    expect(gameIcon('not-a-game')).toBe('');
    expect(gameName('not-a-game')).toBe('not-a-game');
    expect(gameName(undefined)).toBe('—');
  });

  it('honours the requested size', () => {
    expect(gameIcon('wordle', 15)).toContain('width="15"');
  });

  it('leaves no duplicate icon definitions behind in the hub script', () => {
    const auth = readFileSync(root + 'assets/auth.js', 'utf8');
    expect(auth).toContain("from './games.js");
    // The registry used to carry its own copy of every name and glyph.
    expect(auth).not.toMatch(/const ICON = \{/);
    expect(auth).not.toMatch(/icon: ICON/);
  });

  it('leaves no duplicate icon definitions behind in the stats page', () => {
    const stats = readFileSync(root + 'stats/index.html', 'utf8');
    expect(stats).toContain("from '../assets/games.js");
    expect(stats).not.toMatch(/const GAME_META = \{/);
  });
});
