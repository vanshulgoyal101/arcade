import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('stats/index.html', 'utf8');
afterEach(() => vi.useRealTimers());

describe('stats dates', () => {
  it('includes today in IST when the UTC date is still yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T20:00:00Z'));
    const source = html.slice(html.indexOf('function last30'), html.indexOf('function render'));
    const last30 = new Function(`${source}; return last30;`)();
    const series = last30([{ day: '2026-09-14', visits: 2, plays: 3 }]);
    expect(series).toHaveLength(30);
    expect(series.at(-1)).toEqual({ label: '14', title: '14 Sept', value: 5 });
  });
});

describe('stats auth lifecycle', () => {
  it('does not repaint private data from an in-flight request after sign-out', async () => {
    const dom = new JSDOM('<div id="root"></div><div id="actions"></div>', {
      url: 'https://arcade.test/stats/', runScripts: 'outside-only',
    });
    let session: { user: { id: string } } | null = { user: { id: 'owner' } };
    let onAuth!: (event: string) => void;
    let finish!: (data: unknown) => void;
    const backend = {
      auth: {
        getSession: async () => ({ data: { session }, error: null }),
        onAuthStateChange: (listener: typeof onAuth) => { onAuth = listener; },
      },
      rpc: vi.fn(() => new Promise((resolve) => { finish = resolve; })),
    };
    (dom.window as unknown as { backend: unknown }).backend = backend;
    const module = html.match(/<script type="module">([\s\S]*?)<\/script>/)![1]
      .replace(/import \{ createClient \} from '[^']+';/, 'const createClient = () => globalThis.backend;')
      .replace(/import \{ gameIcon, gameName \} from '[^']+';/, 'const gameIcon = () => ""; const gameName = (slug) => slug;');
    try {
      dom.window.eval(module);
      await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledOnce());
      session = null;
      onAuth('SIGNED_OUT');
      finish({ data: { total_visits: 12345 }, error: null });
      await vi.waitFor(() => expect(dom.window.document.querySelector('#si')).not.toBeNull());
      await new Promise((resolve) => dom.window.setTimeout(resolve, 20));
      expect(dom.window.document.querySelector('.cards')).toBeNull();
      expect(dom.window.document.body.textContent).not.toContain('12,345');
    } finally {
      dom.window.close();
    }
  });
});