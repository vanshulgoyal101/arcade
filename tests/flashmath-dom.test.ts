import { describe, it, expect, vi } from 'vitest';
import { mountGame, text, gameEnv } from './helpers/dom';

const load = () => mountGame(() => import('../flashmath/src/main.ts'));
const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
const typeNumber = (n: number) => String(n).split('').forEach(key);

function solve(problem: string): number {
  const [a, op, b] = problem.split(' ');
  const x = Number(a);
  const y = Number(b);
  if (op === '+') return x + y;
  if (op === '−') return x - y;
  if (op === '×') return x * y;
  if (op === '÷') return x / y;
  throw new Error(`unknown operator in "${problem}"`);
}

describe('flashmath/dom', () => {
  gameEnv();

  it('boots with a problem and a zero score', async () => {
    const app = await load();
    expect(text(app.querySelector('#problem'))).toMatch(/^\d+ [+−×÷] \d+$/);
    expect(text(app.querySelector('#score'))).toBe('0');
  });

  it('a correct answer scores and moves to the next problem', async () => {
    const app = await load();
    const first = text(app.querySelector('#problem'));
    typeNumber(solve(first));
    key('Enter');
    expect(Number(text(app.querySelector('#score')))).toBeGreaterThan(0);
    expect(text(app.querySelector('#problem'))).not.toBe(first); // advanced
  });

  it('a wrong answer does not score', async () => {
    const app = await load();
    typeNumber(solve(text(app.querySelector('#problem'))) + 1);
    key('Enter');
    expect(text(app.querySelector('#score'))).toBe('0');
  });

  it('builds a combo across several correct answers', async () => {
    const app = await load();
    for (let i = 0; i < 3; i++) {
      typeNumber(solve(text(app.querySelector('#problem'))));
      key('Enter');
    }
    expect(Number(text(app.querySelector('#score')))).toBeGreaterThan(0);
    expect(text(app.querySelector('#level'))).toBe('4'); // level 1 → 4 after 3 solves
  });

  async function loadWithFrame(): Promise<{ app: HTMLElement; expire: () => void; tick: (now: number) => void }> {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
    let frame: FrameRequestCallback | null = null;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      frame = cb;
      return 1;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
    vi.resetModules();
    await import('../flashmath/src/main.ts');
    return {
      app: document.querySelector<HTMLElement>('#app')!,
      expire: () => frame?.(performance.now() + 60_000),
      tick: now => frame?.(now),
    };
  }

  it('leaves countdown text untouched between second boundaries', async () => {
    const { app, tick } = await loadWithFrame();
    const countdown = app.querySelector('#timernum')!;
    const now = performance.now();
    tick(now + 16);
    const initial = text(countdown);
    const observer = new MutationObserver(() => {});
    observer.observe(countdown, { childList: true });
    for (let index = 2; index <= 30; index++) tick(now + index * 16);
    expect(observer.takeRecords()).toHaveLength(0);
    tick(now + 1100);
    expect(Number.parseInt(text(countdown))).toBe(Number.parseInt(initial) - 1);
    expect(observer.takeRecords()).toHaveLength(1);
    observer.disconnect();
  });

  it('starts a replay with an empty answer', async () => {
    const { app, expire } = await loadWithFrame();
    typeNumber(123);
    expire();
    app.querySelector<HTMLButtonElement>('#m-again')!.click();
    expect(text(app.querySelector('#answer'))).toBe('');
  });

  it('does not let an old wrong-answer timer erase new-run input', async () => {
    const { app, expire } = await loadWithFrame();
    typeNumber(solve(text(app.querySelector('#problem'))) + 1);
    key('Enter'); // arms the 300ms wrong-answer cleanup
    expire();
    app.querySelector<HTMLButtonElement>('#m-again')!.click();
    typeNumber(7);

    await vi.advanceTimersByTimeAsync(350);

    expect(text(app.querySelector('#answer'))).toBe('7');
  });
});
