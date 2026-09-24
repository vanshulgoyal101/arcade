import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { initCatalog } from '../assets/catalog.js';

const html = readFileSync('index.html', 'utf8');

describe('hub catalog discovery', () => {
  let dom: JSDOM;
  let document: Document;
  let navigate: ReturnType<typeof vi.fn>;
  const visible = () => [...document.querySelectorAll('.grid a.card:not([hidden])')].map(card => card.getAttribute('data-game'));

  beforeEach(() => {
    dom = new JSDOM(html, { url: 'https://games.vanshul.com/' });
    document = dom.window.document;
    navigate = vi.fn();
    initCatalog(document, navigate);
  });
  afterEach(() => { vi.restoreAllMocks(); dom.window.close(); });

  it('retains every featured link without JavaScript', () => {
    const fallback = new JSDOM(html);
    try {
      expect(fallback.window.document.querySelectorAll('.grid a.card:not([hidden])')).toHaveLength(10);
      expect(fallback.window.document.querySelector('input[type="search"], [role="search"]')).toBeNull();
    } finally {
      fallback.window.close();
    }
  });

  it('keeps every card visible and in place on history navigation', () => {
    const before = visible();
    dom.window.dispatchEvent(new dom.window.Event('pageshow'));
    expect(visible()).toEqual(before);
    expect(visible()).toHaveLength(10);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('can choose every featured game without reordering the cards', () => {
    const before = visible();
    const cards = [...document.querySelectorAll('.grid a.card')];
    const random = vi.spyOn(Math, 'random');
    cards.forEach((card, index) => {
      random.mockReturnValue((index + 0.5) / cards.length);
      document.querySelector<HTMLButtonElement>('#randomBtn')!.click();
      expect(navigate).toHaveBeenLastCalledWith(card.getAttribute('href'));
    });
    expect(navigate).toHaveBeenCalledTimes(10);
    expect(visible()).toEqual(before);
  });
});