import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { GAME_ORDER, gameName } from '../assets/games.js';

const html = readFileSync('stats/index.html', 'utf8');
afterEach(() => vi.useRealTimers());

describe('stats dates', () => {
  it('keeps every game in fixed order when counts change or are absent', () => {
    const root = document.createElement('div');
    const actions = document.createElement('div');
    document.body.append(root, actions);
    const source = html.slice(html.indexOf('function bars'), html.indexOf('let loading'));
    const render = new Function('root', 'actions', 'GAME_ORDER', 'gameName', 'gameIcon', 'esc', 'nf', 'rangesBar', 'rangeLabel', 'supabase',
      `${source}; return render;`)(root, actions, GAME_ORDER, gameName, () => '', String, new Intl.NumberFormat('en-IN'), () => '', () => 'test', { auth: {} });
    try {
      for (const per_game of [[{ game: 'flashmath', plays: 999 }, { game: 'hue-hunt', plays: 1 }], [{ game: 'wordle', plays: 1000 }], []]) {
        render({ per_game });
        expect([...root.querySelectorAll('.row .k b')].map(element => element.textContent)).toEqual(GAME_ORDER.map(gameName));
        expect([...root.querySelectorAll('.row .v')].map(element => element.textContent)).toEqual(
          GAME_ORDER.map(slug => new Intl.NumberFormat('en-IN').format(per_game.find(game => game.game === slug)?.plays || 0))
        );
      }
    } finally {
      root.remove();
      actions.remove();
    }
  });

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
  it.each(['SIGNED_OUT', 'SIGNED_IN'])('clears private data immediately and rejects stale responses after %s', async event => {
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
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'not authorized' } })
        .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })),
    };
    (dom.window as unknown as { backend: unknown }).backend = backend;
    const module = html.match(/<script type="module">([\s\S]*?)<\/script>/)![1]
      .replace(/import \{ createClient \} from '[^']+';/, 'const createClient = () => globalThis.backend;')
      .replace(/import \{ gameIcon, gameName, GAME_ORDER \} from '[^']+';/, `const gameIcon = () => ""; const gameName = (slug) => slug; const GAME_ORDER = ${JSON.stringify(GAME_ORDER)};`);
    try {
      dom.window.eval(module);
      await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledOnce());
      dom.window.document.querySelector('#root')!.textContent = '12,345 private visits';
      dom.window.document.querySelector('#actions')!.textContent = 'Owner actions';
      session = event === 'SIGNED_OUT' ? null : { user: { id: 'other-user' } };
      onAuth(event);
      expect(dom.window.document.body.textContent).not.toContain('12,345');
      expect(dom.window.document.querySelector('#actions')!.textContent).toBe('');
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