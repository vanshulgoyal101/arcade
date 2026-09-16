// @vitest-environment node
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pages: JSDOM[] = [];
const source = readFileSync('assets/analytics.js', 'utf8');
function page(options: { optOut?: boolean; dnt?: string; gpc?: boolean; path?: string; blockedStorage?: boolean } = {}) {
  const dom = new JSDOM('<input type="checkbox" id="analytics-enabled"><output id="privacy-status"></output>', {
    url: `https://games.vanshul.com${options.path || '/wordle/'}`, runScripts: 'outside-only',
  });
  pages.push(dom);
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  Object.assign(dom.window, { fetch });
  Object.defineProperty(dom.window.navigator, 'doNotTrack', { value: options.dnt });
  Object.defineProperty(dom.window.navigator, 'globalPrivacyControl', { value: options.gpc });
  if (options.optOut) dom.window.localStorage.setItem('arcade.analytics.disabled', '1');
  if (options.blockedStorage) Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  dom.window.eval(source);
  return { window: dom.window, fetch };
}
afterEach(() => { for (const page of pages.splice(0)) page.window.close(); });

describe('analytics privacy', () => {
  it('fails closed when preference storage is unavailable', () => {
    const { window, fetch } = page({ blockedStorage: true });
    expect(fetch).not.toHaveBeenCalled();
    const checkbox = window.document.querySelector<HTMLInputElement>('#analytics-enabled')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new window.Event('change'));
    expect(checkbox.checked).toBe(false);
    expect(window.document.querySelector('#privacy-status')?.textContent).toContain('could not be saved');
  });

  it.each([{ optOut: true }, { dnt: '1' }, { gpc: true }])('does not track an opted-out browser: %j', options => {
    const { window, fetch } = page(options);
    expect(fetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('arcade.vid')).toBeNull();
  });

  it('records only known game page loads and one visit per tab session', () => {
    const { window, fetch } = page();
    expect(fetch).toHaveBeenCalledTimes(2);
    window.eval(source);
    expect(fetch).toHaveBeenCalledTimes(3);
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(Object.keys(payload).sort()).toEqual(['game', 'kind', 'visitor']);
    expect(payload.game).toBe('wordle');
  });

  it('persists an opt-out and removes the existing visitor identifier', () => {
    const { window, fetch } = page({ path: '/privacy/' });
    window.localStorage.setItem('arcade.vid', 'old-visitor');
    const checkbox = window.document.querySelector<HTMLInputElement>('#analytics-enabled')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new window.Event('change'));
    expect(window.localStorage.getItem('arcade.analytics.disabled')).toBe('1');
    expect(window.localStorage.getItem('arcade.vid')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not mislabel unknown routes as games', () => {
    const { fetch } = page({ path: '/invented/' });
    expect(fetch).not.toHaveBeenCalled();
  });
});