// A focus ring must only appear for keyboard users. `:focus-visible` written
// once at the end of a selector list binds to that last selector only, so
// `a, button, input, summary, [tabindex]:focus-visible` paints a permanent
// outline on every link and button — which is exactly how 2048 shipped with a
// box around each control. Every stylesheet is checked for that shape.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = process.cwd() + '/';

const gameSheets = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${root}${d.name}/src/styles.css`))
  .map((d) => `${d.name}/src/styles.css`)
  .sort();

const sheets = [...gameSheets, 'assets/style.css'];

/** Selector lists that *draw* an outline. `outline: none` is a reset, not a ring. */
function outlineRules(css: string): string[] {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, ''); // comments would parse as selectors
  const draws = (body: string) =>
    [...body.matchAll(/outline\s*:\s*([^;]+)/g)].some((d) => !/^(none|0)$/i.test(d[1].trim()));
  return [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => draws(m[2]))
    .map((m) => m[1].trim())
    .filter((sel) => sel && !sel.startsWith('@'));
}

describe('focus rings are keyboard-only', () => {
  it('finds a stylesheet for every game', () => {
    expect(gameSheets.length).toBeGreaterThanOrEqual(12);
  });

  it.each(sheets)('%s never gives a bare element an outline', (sheet) => {
    for (const selector of outlineRules(readFileSync(root + sheet, 'utf8'))) {
      for (const part of selector.split(',')) {
        const s = part.trim();
        if (!s || s.includes(':focus') || s.includes(':hover') || s.includes(':active')) continue;
        // Anything left is an unconditional outline on a plain element/class.
        expect.soft(s, `${sheet}: "${s}" is outlined unconditionally`).toMatch(/^\.|^#|^\*|^:root/);
      }
    }
  });

  it.each(gameSheets)('%s scopes the focus ring to every selector in the list', (sheet) => {
    const css = readFileSync(root + sheet, 'utf8');
    const ring = /a:focus-visible,\s*button:focus-visible,\s*input:focus-visible,\s*summary:focus-visible,\s*\[tabindex\]:focus-visible/;
    expect(ring.test(css), `${sheet} is missing the standard focus-ring rule`).toBe(true);
    expect(css).not.toMatch(/(^|\n)\s*a,\s*button,\s*input,\s*summary,\s*\[tabindex\]:focus-visible/);
  });
});
