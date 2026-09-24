// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const put = vi.fn().mockResolvedValue(undefined);
  const cached = new Response('cached page');
  const caches = {
    keys: vi.fn().mockResolvedValue(['arcade-v1', 'arcade-v2', 'arcade-v3', 'another-app']),
    delete: vi.fn().mockResolvedValue(true),
    open: vi.fn().mockResolvedValue({ put }),
    match: vi.fn().mockResolvedValue(cached),
  };
  const fetch = vi.fn().mockResolvedValue(new Response('fresh page'));
  runInNewContext(readFileSync('sw.js', 'utf8'), {
    self: { location: { origin: 'https://games.vanshul.com' }, addEventListener: (type: string, handler: (event: any) => void) => { handlers[type] = handler; }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } },
    caches, fetch, URL, Response,
  });
  async function request(path = '/wordle/', options: { cache?: string; headers?: Headers } = {}) {
    let response!: Promise<Response>;
    const lifetime: Promise<unknown>[] = [];
    handlers.fetch({
      request: { method: 'GET', url: `https://games.vanshul.com${path}`, mode: path.endsWith('/') ? 'navigate' : 'cors', headers: new Headers(), ...options },
      respondWith: (value: Promise<Response>) => { response = value; },
      waitUntil: (value: Promise<unknown>) => lifetime.push(value),
    });
    return { response: await response, lifetime };
  }
  return { handlers, caches, fetch, put, request };
}

describe('service worker resilience', () => {
  it.each(['code', 'access_token', 'refresh_token', 'token_hash', 'id_token', 'error_description', 'CODE'])('does not intercept authentication parameter %s', async parameter => {
    const environment = worker();
    const result = await environment.request(`/?${parameter}=sensitive`);
    expect(result.response).toBeUndefined();
    expect(environment.fetch).not.toHaveBeenCalled();
    expect(environment.caches.match).not.toHaveBeenCalled();
    expect(environment.put).not.toHaveBeenCalled();
  });

  it.each([
    { cache: 'no-store' },
    { headers: new Headers({ Authorization: 'Bearer test-only' }) },
  ])('leaves private requests to the browser (%j)', async options => {
    const environment = worker();
    expect((await environment.request('/wordle/', options)).response).toBeUndefined();
    expect(environment.caches.match).not.toHaveBeenCalled();
    expect(environment.fetch).not.toHaveBeenCalled();
  });

  it.each(['no-store', 'private, max-age=600', 'max-age=0, no-store', 'private="cookie"'])('does not persist responses marked %s', async control => {
    const environment = worker();
    environment.fetch.mockResolvedValue(new Response('private page', { headers: { 'Cache-Control': control } }));
    expect(await (await environment.request()).response.text()).toBe('private page');
    expect(environment.put).not.toHaveBeenCalled();
  });
  it('does not replace an offline document with a server error', async () => {
    const environment = worker();
    environment.fetch.mockResolvedValue(new Response('server error', { status: 503 }));
    expect(await (await environment.request()).response.text()).toBe('cached page');
    expect(environment.put).not.toHaveBeenCalled();
  });

  it('returns a successful network document even when caching is unavailable', async () => {
    const environment = worker();
    environment.caches.open.mockRejectedValue(new Error('quota exceeded'));
    expect(await (await environment.request()).response.text()).toBe('fresh page');
  });

  it('does not cache a not-found document', async () => {
    const environment = worker();
    environment.fetch.mockResolvedValue(new Response('not found', { status: 404 }));
    expect((await environment.request()).response.status).toBe(404);
    expect(environment.put).not.toHaveBeenCalled();
  });

  it('only removes obsolete Arcade caches', async () => {
    const environment = worker();
    let complete!: Promise<unknown>;
    environment.handlers.activate({ waitUntil: (value: Promise<unknown>) => { complete = value; } });
    await complete;
    expect(environment.caches.delete.mock.calls).toEqual([['arcade-v1'], ['arcade-v2']]);
  });

  it('keeps the background revalidation alive after returning a cached asset', async () => {
    const environment = worker();
    const result = await environment.request('/assets/analytics.js?v=3');
    expect(await result.response.text()).toBe('cached page');
    expect(result.lifetime.length).toBeGreaterThan(0);
    await Promise.all(result.lifetime);
  });
});