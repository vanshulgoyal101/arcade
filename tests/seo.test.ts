import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const games = readdirSync('.').filter(name => existsSync(`${name}/template.html`));
const pages = ['index.html', 'privacy/index.html', ...games.map(game => `${game}/template.html`)];
const parse = (path: string) => new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'text/html');

describe('search and accessibility contracts', () => {
  it.each(pages)('%s has one canonical URL, useful metadata, and working image references', (path) => {
    const document = parse(path);
    const expected = `https://games.vanshul.com/${path === 'index.html' ? '' : path.split('/')[0] + '/'}`;
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(expected);
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(expected);
    expect(document.title.length).toBeGreaterThan(15);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')?.length).toBeGreaterThan(50);
    const image = document.querySelector('meta[property="og:image"]')!.getAttribute('content')!;
    expect(existsSync(new URL(image).pathname.slice(1))).toBe(true);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).not.toContain('noindex');
  });

  it.each(pages)('%s permits browser zoom and does not publish invisible FAQ claims', (path) => {
    const document = parse(path);
    const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?(?:,|$)/);
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      const schema = JSON.parse(script.textContent!);
      if (schema['@type'] === 'FAQPage') {
        for (const question of schema.mainEntity) {
          expect(document.body.textContent).toContain(question.name);
          expect(document.body.textContent).toContain(question.acceptedAnswer.text);
        }
      }
    }
  });

  it.each(games)('%s provides crawlable game content and related links outside the application root', (game) => {
    const document = parse(`${game}/template.html`);
    const about = document.querySelector('.about');
    expect(about?.textContent?.length).toBeGreaterThan(250);
    expect(about?.querySelectorAll('a[href]').length).toBeGreaterThanOrEqual(2);
    expect(document.querySelector('#app')?.contains(about)).toBe(false);
    const gameSchema = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(script => JSON.parse(script.textContent!)).find(schema =>
        [schema['@type']].flat().some(type => ['VideoGame', 'WebApplication', 'EducationalApplication'].includes(type)));
    expect(gameSchema.isAccessibleForFree).toBe(true);
    expect(gameSchema.aggregateRating).toBeUndefined();
  });

  it('keeps private and duplicate documents out of the sitemap', () => {
    const document = new DOMParser().parseFromString(readFileSync('sitemap.xml', 'utf8'), 'application/xml');
    expect(document.querySelector('parsererror')).toBeNull();
    const urls = [...document.querySelectorAll('url > loc')].map(element => element.textContent!);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain('https://games.vanshul.com/');
    for (const url of urls) expect(url).not.toMatch(/\/stats\/|\/dist\/|template\.html|node_modules|404/);
  });
});