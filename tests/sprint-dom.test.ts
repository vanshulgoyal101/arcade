import { describe, it, expect, vi } from 'vitest';
import { mountGame, text, gameEnv } from './helpers/dom';

vi.mock('../shared/cloud', () => ({
  submitScore: vi.fn(),
  getRank: vi.fn().mockResolvedValue(null),
  mountRank: vi.fn(),
  cloudReady: vi.fn().mockResolvedValue(undefined),
  cloudProfile: () => null,
  cloudAvatarImage: () => null,
  isSignedIn: () => false,
  signIn: vi.fn(),
  restoreGame: vi.fn().mockResolvedValue(false),
}));

const load = () => mountGame(() => import('../sprint/src/main.ts'));
const currentWord = (app: HTMLElement) => text(app.querySelector('.w.current'));
function submit(app: HTMLElement, typed: string): void {
  const field = app.querySelector<HTMLInputElement>('#field')!;
  field.value = typed + ' '; // a trailing space completes the word
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('sprint/dom', () => {
  gameEnv();

  it('boots with an input and a current word', async () => {
    const app = await load();
    expect(app.querySelector('#field')).not.toBeNull();
    expect(currentWord(app).length).toBeGreaterThan(0);
  });

  it('completing the current word advances the stream', async () => {
    const app = await load();
    const w1 = currentWord(app);
    submit(app, w1);
    expect(text(app.querySelector('.w.done'))).toBe(w1);
    expect(currentWord(app)).not.toBe(w1);
  });

  it('marks mistyped characters on a wrong word', async () => {
    const app = await load();
    const w = currentWord(app);
    const wrong = (w[0] === 'x' ? 'y' : 'x') + w.slice(1); // guaranteed first-char miss
    submit(app, wrong);
    expect(app.querySelector('.w.done .c-bad')).not.toBeNull();
  });

  it('preserves completed and upcoming word nodes while typing and deleting', async () => {
    const app = await load();
    submit(app, currentWord(app));
    const field = app.querySelector<HTMLInputElement>('#field')!;
    const words = [...app.querySelectorAll('.w')];
    const word = currentWord(app);
    for (const typed of [word.slice(0, 1), word, word.slice(0, -1), '']) {
      field.value = typed;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      const after = [...app.querySelectorAll('.w')];
      expect(after.length).toBe(words.length);
      after.forEach((element, index) => expect(element).toBe(words[index]));
      expect(app.querySelectorAll('.w.current .c-ok')).toHaveLength(typed.length);
      expect(app.querySelectorAll('.w.current .caret')).toHaveLength(1);
    }
    submit(app, word);
    expect(app.querySelectorAll('.w.done')).toHaveLength(2);
  });

  it('updates HUD text only when its displayed value changes', async () => {
    const app = await load();
    let frame: FrameRequestCallback = () => {};
    const animationFrame = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
      frame = callback;
      return 1;
    });
    const field = app.querySelector<HTMLInputElement>('#field')!;
    field.value = currentWord(app).slice(0, 1);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    const now = performance.now();
    const observer = new MutationObserver(() => {});
    for (const selector of ['#wpm', '#acc', '#time']) {
      observer.observe(app.querySelector(selector)!, { childList: true });
    }
    for (let index = 1; index <= 30; index++) frame(now + index * 16);
    expect(observer.takeRecords()).toHaveLength(0);
    frame(now + 1100);
    expect(text(app.querySelector('#time'))).toBe('29');
    expect(observer.takeRecords()).toHaveLength(1);
    submit(app, currentWord(app));
    frame(now + 1200);
    expect(Number(text(app.querySelector('#wpm')))).toBeGreaterThan(0);
    frame(now + 31_000);
    expect(app.querySelector('#overlay')!.classList.contains('show')).toBe(true);
    app.querySelector<HTMLButtonElement>('#m-again')!.click();
    expect(text(app.querySelector('#wpm'))).toBe('0');
    expect(text(app.querySelector('#time'))).toBe('30');
    observer.disconnect();
    animationFrame.mockRestore();
  });
});
