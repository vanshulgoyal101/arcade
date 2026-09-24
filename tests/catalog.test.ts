import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { initCatalog } from '../assets/catalog.js';

const html = readFileSync('index.html', 'utf8');

describe('hub catalog discovery', () => {
  let dom: JSDOM;
  let document: Document;
  let input: HTMLInputElement;
  let navigate: ReturnType<typeof vi.fn>;
  const visible = () => [...document.querySelectorAll('.grid a.card:not([hidden])')].map(card => card.getAttribute('data-game'));
  const search = (query: string) => {
    input.value = query;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };

  beforeEach(() => {
    dom = new JSDOM(html, { url: 'https://games.vanshul.com/' });
    document = dom.window.document;
    input = document.querySelector('#game-search')!;
    navigate = vi.fn();
    initCatalog(document, navigate);
  });
  afterEach(() => dom.window.close());

  it('retains every featured link without JavaScript', () => {
    const fallback = new JSDOM(html);
    try {
      expect(fallback.window.document.querySelectorAll('.grid a.card:not([hidden])')).toHaveLength(10);
      expect(fallback.window.document.querySelector('#catalog-search')!.hasAttribute('hidden')).toBe(true);
    } finally {
      fallback.window.close();
    }
  });

  it.each([
    ['  WORDLE  ', ['wordle']],
    ['typing', ['sprint']],
    ['digit-span', ['digit-span']],
    ['memory strict', ['echo']],
    ['color sliders', ['chromatic']],
  ])('filters by all search terms in %s', (query, expected) => {
    search(query);
    expect(visible()).toEqual(expected);
    expect(document.querySelector('#game-count')!.textContent).toBe('1 game');
  });

  it('handles empty results and markup-like input without injecting HTML', () => {
    search('<img src=x onerror=alert(1)>');
    expect(visible()).toEqual([]);
    expect(document.querySelector<HTMLButtonElement>('#randomBtn')!.disabled).toBe(true);
    expect(document.querySelector('#game-count')!.textContent).toBe('No games match.');
    expect(document.querySelector('#catalog-search img')).toBeNull();
  });

  it('clears the search, restores all games, and returns focus to the input', () => {
    search('unmatched');
    document.querySelector<HTMLButtonElement>('button[type="reset"]')!.click();
    expect(input.value).toBe('');
    expect(visible()).toHaveLength(10);
    expect(document.activeElement).toBe(input);
    expect(document.querySelector<HTMLButtonElement>('#randomBtn')!.disabled).toBe(false);
  });

  it('chooses random games only from current matches and does nothing for no matches', () => {
    search('typing');
    document.querySelector<HTMLButtonElement>('#randomBtn')!.click();
    expect(navigate).toHaveBeenCalledExactlyOnceWith('sprint/');
    search('unmatched');
    document.querySelector<HTMLButtonElement>('#randomBtn')!.click();
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('restores filtering on history navigation and never submits a search to the server', () => {
    input.value = 'wordle';
    dom.window.dispatchEvent(new dom.window.Event('pageshow'));
    expect(visible()).toEqual(['wordle']);
    const submit = new dom.window.Event('submit', { bubbles: true, cancelable: true });
    expect(document.querySelector('form')!.dispatchEvent(submit)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});