// @vitest-environment node
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, rmSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it } from 'vitest';

const fixtures: string[] = [];
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'arcade-sitemap-'));
  fixtures.push(directory);
  copyFileSync('scripts/gen-sitemap.mjs', join(directory, 'generate.mjs'));
  symlinkSync(join(process.cwd(), 'node_modules'), join(directory, 'node_modules'), 'dir');
  writeFileSync(join(directory, 'sitemap.config.json'), JSON.stringify({ baseUrl: 'https://example.test', include: ['**/*.html'] }));
  return directory;
}
function generate(directory: string) {
  execFileSync(process.execPath, ['generate.mjs'], { cwd: directory, timeout: 15000, stdio: 'pipe' });
  return new JSDOM(readFileSync(join(directory, 'sitemap.xml'), 'utf8'), { contentType: 'text/xml' }).window.document;
}
afterEach(() => { for (const directory of fixtures.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('sitemap generation', () => {
  it('treats filenames as arguments, never shell programs', () => {
    const directory = fixture();
    writeFileSync(join(directory, '$(touch marker).html'), '<html><title>Fixture</title></html>');
    generate(directory);
    expect(existsSync(join(directory, 'marker'))).toBe(false);
  });

  it('excludes noindex pages and deduplicates same-origin canonical URLs', () => {
    const directory = fixture();
    writeFileSync(join(directory, 'index.html'), '<link rel="canonical" href="https://example.test/">');
    writeFileSync(join(directory, 'alias.html'), '<link href="https://example.test/" rel="canonical">');
    writeFileSync(join(directory, 'private.html'), '<meta content="noindex, follow" name="robots">');
    const document = generate(directory);
    expect([...document.querySelectorAll('url > loc')].map(element => element.textContent)).toEqual(['https://example.test/']);
  });

  it('does not follow directory symlinks and decodes HTML image entities', () => {
    const directory = fixture();
    mkdirSync(join(directory, 'game'));
    symlinkSync(directory, join(directory, 'game', 'loop'), 'dir');
    writeFileSync(join(directory, 'index.html'), '<meta property="og:image" content="https://example.test/image.png?a=1&amp;b=2">');
    const document = generate(directory);
    expect(document.getElementsByTagName('image:loc')[0].textContent).toBe('https://example.test/image.png?a=1&b=2');
  });
});