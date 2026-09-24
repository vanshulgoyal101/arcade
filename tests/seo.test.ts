import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

const games = readdirSync('.').filter(name => existsSync(`${name}/template.html`));
const pages = ['index.html', 'privacy/index.html', ...games.map(game => `${game}/template.html`)];
const parse = (path: string) => new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'text/html');
const schemas = (document: Document) => [...document.querySelectorAll('script[type="application/ld+json"]')]
  .flatMap(script => {
    const value = JSON.parse(script.textContent!);
    return value['@graph'] ?? [value];
  });

describe('search and accessibility contracts', () => {
  it('keeps error-page recovery links in featured order with working local artwork', () => {
    const error = parse('404.html');
    const hub = parse('index.html');
    expect(error.querySelector('base')?.getAttribute('href')).toBe('/');
    expect(error.querySelectorAll('h1')).toHaveLength(1);
    expect(error.querySelector('.nf-cta')?.getAttribute('href')).toBe('/');
    expect([...error.querySelectorAll('.nf-game')].map(link => link.getAttribute('href'))).toEqual(
      [...hub.querySelectorAll('.grid a.card')].slice(0, 4).map(link => '/' + link.getAttribute('href'))
    );
    for (const image of error.querySelectorAll('img')) {
      expect(existsSync(image.getAttribute('src')!)).toBe(true);
      expect(image.hasAttribute('width') && image.hasAttribute('height')).toBe(true);
    }
  });

  it.each(games)('%s publishes the metadata and structured data from its source', game => {
    const source = parse(`${game}/template.html`);
    const published = parse(`${game}/index.html`);
    expect(published.title).toBe(source.title);
    for (const selector of ['meta[name="description"]', 'meta[property="og:url"]', 'meta[property="og:image"]', 'link[rel="canonical"]']) {
      expect(published.querySelector(selector)?.outerHTML).toBe(source.querySelector(selector)?.outerHTML);
    }
    expect(schemas(published)).toEqual(schemas(source));
  });

  it('uses unique titles and concise, distinct search descriptions', () => {
    const documents = pages.map(parse);
    const titles = documents.map(document => document.title);
    const descriptions = documents.map(document => document.querySelector('meta[name="description"]')!.getAttribute('content')!);
    expect(new Set(titles).size).toBe(pages.length);
    expect(new Set(descriptions).size).toBe(pages.length);
    for (const description of descriptions) expect(description.length).toBeLessThanOrEqual(180);
  });

  it('describes exactly the featured catalog in the homepage graph', () => {
    const document = parse('index.html');
    const graph = schemas(document);
    const list = graph.find(schema => schema['@type'] === 'ItemList');
    const collection = graph.find(schema => schema['@type'] === 'CollectionPage');
    const cards = [...document.querySelectorAll('.grid a.card')];
    expect(collection.mainEntity['@id']).toBe(list['@id']);
    expect(list.numberOfItems).toBe(cards.length);
    expect(list.itemListElement.map((item: { position: number }) => item.position)).toEqual(cards.map((_, index) => index + 1));
    const items = list.itemListElement.map((item: { url: string; name: string }) => [item.url, item.name]);
    for (const card of cards) {
      expect(items).toContainEqual([new URL(card.getAttribute('href')!, 'https://games.vanshul.com/').href, card.querySelector('h2')!.textContent]);
    }
    expect(items).toHaveLength(cards.length);
  });

  it('lets crawlers read noindex on private and error pages', () => {
    expect(readFileSync('robots.txt', 'utf8')).not.toMatch(/^Disallow:\s*\/stats\/?\s*$/mi);
    for (const path of ['stats/index.html', '404.html']) {
      expect(parse(path).querySelector('meta[name="robots"]')!.getAttribute('content')).toContain('noindex');
    }
  });

  it.each(pages)('%s links only to existing local public pages', path => {
    const document = parse(path);
    const canonical = document.querySelector('link[rel="canonical"]')!.getAttribute('href')!;
    for (const anchor of document.body.querySelectorAll('a[href]')) {
      const url = new URL(anchor.getAttribute('href')!, canonical);
      if (url.origin !== 'https://games.vanshul.com') continue;
      const file = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
      expect(existsSync(file.slice(1)), `${path} links to missing ${file}`).toBe(true);
    }
  });

  it.each(games)('%s keeps its application schema and breadcrumb aligned with its canonical page', game => {
    const document = parse(`${game}/template.html`);
    const graph = schemas(document);
    const canonical = document.querySelector('link[rel="canonical"]')!.getAttribute('href');
    const app = graph.find(schema => [schema['@type']].flat().includes('WebApplication'));
    expect(app).toBeDefined();
    expect(app.url).toBe(canonical);
    expect(app.applicationCategory).toBe(['word', 'flash'].includes(game) ? 'EducationalApplication' : 'GameApplication');
    expect(app.image).toBe(document.querySelector('meta[property="og:image"]')!.getAttribute('content'));
    expect(Number(app.offers.price)).toBe(0);
    expect(app.isAccessibleForFree).toBe(true);
    const breadcrumb = graph.find(schema => schema['@type'] === 'BreadcrumbList');
    expect(breadcrumb.itemListElement.map((item: { item: string }) => item.item)).toEqual(['https://games.vanshul.com/', canonical]);
  });

  it('publishes a crawlable square favicon for the site', async () => {
    const document = parse('index.html');
    const icon = document.querySelector('link[rel="icon"][type="image/png"]');
    expect(icon).not.toBeNull();
    const url = new URL(icon!.getAttribute('href')!, 'https://games.vanshul.com/');
    expect(url.origin).toBe('https://games.vanshul.com');
    const metadata = await sharp(url.pathname.slice(1)).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBeGreaterThanOrEqual(48);
    expect(metadata.width).toBe(metadata.height);
  });

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