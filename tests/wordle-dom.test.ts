import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountGame, pointerdown, gameEnv } from './helpers/dom';
import { ANSWER_WORDS } from '../wordle/src/words';

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

const load = () => mountGame(() => import('../wordle/src/main.ts'));
const press = (app: HTMLElement, k: string) =>
  pointerdown(app.querySelector(`.key[data-key="${k}"]`)!);
const type = (app: HTMLElement, word: string) => [...word].forEach((c) => press(app, c));
const rowText = (row: Element) =>
  [...row.querySelectorAll('.tile')].map((t) => (t.textContent || '').toLowerCase()).join('');

describe('wordle/dom', () => {
  gameEnv();
  let cleanupListeners = () => {};
  beforeEach(() => {
    const listeners = vi.spyOn(window, 'addEventListener');
    cleanupListeners = () => {
      for (const [type, listener, options] of listeners.mock.calls) {
        window.removeEventListener(type, listener, options);
      }
      listeners.mockRestore();
    };
  });
  afterEach(() => cleanupListeners());

  it('boots a 6×5 board and a keyboard', async () => {
    const app = await load();
    expect(app.querySelectorAll('.tile').length).toBe(30);
    expect(app.querySelector('.key[data-key="enter"]')).not.toBeNull();
  });

  it('typing fills the current row', async () => {
    const app = await load();
    type(app, 'crane');
    expect(rowText(app.querySelector('.row')!)).toBe('crane');
  });

  it('accepts keyboard-style key clicks without doubling pointer input', async () => {
    const app = await load();
    const letter = app.querySelector<HTMLButtonElement>('[data-key="c"]')!;
    letter.click();
    expect(rowText(app.querySelector('.row')!)).toBe('c');
    pointerdown(letter);
    letter.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(rowText(app.querySelector('.row')!)).toBe('cc');
  });

  it('does not submit a guess when Enter activates a toolbar button', async () => {
    const app = await load();
    type(app, 'c');
    const stats = app.querySelector<HTMLButtonElement>('#stats')!;
    stats.focus();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    stats.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(app.querySelector('#toast')!.classList.contains('show')).toBe(false);
  });

  it('ignores held letters and secondary pointer presses', async () => {
    const app = await load();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', repeat: true }));
    app.querySelector('[data-key="c"]')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(rowText(app.querySelector('.row')!)).toBe('');
  });

  it('still types letters after using a toolbar button', async () => {
    const app = await load();
    const restart = app.querySelector<HTMLButtonElement>('#restart')!;
    restart.focus();
    restart.click();
    for (const letter of 'crane') {
      restart.dispatchEvent(new KeyboardEvent('keydown', { key: letter, bubbles: true, cancelable: true }));
    }
    expect(rowText(app.querySelector('.row')!)).toBe('crane');
  });

  it('blocks all key activation while statistics cover the board', async () => {
    const app = await load();
    app.querySelector<HTMLButtonElement>('#stats')!.click();
    press(app, 'a');
    app.querySelector<HTMLButtonElement>('[data-key="c"]')!.click();
    expect(rowText(app.querySelector('.row')!)).toBe('');
  });

  it('backspace removes the last letter', async () => {
    const app = await load();
    type(app, 'crane');
    press(app, 'backspace');
    expect(rowText(app.querySelector('.row')!)).toBe('cran');
  });

  it('rejects a word not in the list (no tiles graded)', async () => {
    const app = await load();
    type(app, 'zzzzz');
    press(app, 'enter');
    await vi.advanceTimersByTimeAsync(1600);
    const row = app.querySelector('.row')!;
    expect(row.querySelectorAll('.correct, .present, .absent').length).toBe(0);
    expect(app.querySelector('#toast')?.textContent).toMatch(/word list/i);
  });

  it('accepts a valid guess and grades the row', async () => {
    const app = await load();
    type(app, ANSWER_WORDS[0]); // guaranteed a valid guess
    press(app, 'enter');
    await vi.advanceTimersByTimeAsync(1600);
    const row = app.querySelector('.row')!;
    expect(row.querySelectorAll('.correct, .present, .absent').length).toBe(5);
  });

  it('never paints the previous guess onto a board started mid-reveal', async () => {
    const app = await load();
    type(app, ANSWER_WORDS[0]);
    press(app, 'enter');
    await vi.advanceTimersByTimeAsync(300); // tiles are still flipping

    app.querySelector<HTMLButtonElement>('#restart')!.click();
    await vi.advanceTimersByTimeAsync(2000); // let every stale timeout fire

    expect(app.querySelectorAll('.tile.correct, .tile.present, .tile.absent').length).toBe(0);
    expect(app.querySelectorAll('.tile.reveal').length).toBe(0);
    expect(rowText(app.querySelector('.row')!)).toBe('');
  });
});
