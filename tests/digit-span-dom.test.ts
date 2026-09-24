import { describe, it, expect } from 'vitest';
import { mountGame, click, text, gameEnv } from './helpers/dom';
import { vi } from 'vitest';

const load = () => mountGame(() => import('../digit-span/src/main.ts'));
const pressKey = (app: HTMLElement, k: string) =>
  click(app.querySelector(`#keypad .key[data-k="${k}"]`)!);
const shown = (app: HTMLElement) => text(app.querySelector('#stage .digit'));
const gameOverShown = (app: HTMLElement) =>
  app.querySelector('#overlay')!.classList.contains('show');

describe('digit-span/dom', () => {
  gameEnv();

  it('boots with a Start button and a locked keypad', async () => {
    const app = await load();
    expect(app.querySelector('#startBtn')).not.toBeNull();
    expect(app.querySelector('#keypad')!.classList.contains('locked')).toBe(true);
  });

  it('flashes the sequence then unlocks the keypad', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    expect(shown(app)).toMatch(/^\d$/); // the level-1 digit is showing
    await vi.advanceTimersByTimeAsync(1200); // finish the flash
    expect(app.querySelector('#keypad')!.classList.contains('locked')).toBe(false);
  });

  it('a correct recall continues the game', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    const digit = shown(app);
    await vi.advanceTimersByTimeAsync(1200);
    pressKey(app, digit);
    pressKey(app, 'enter');
    await vi.advanceTimersByTimeAsync(700);
    expect(gameOverShown(app)).toBe(false);
  });

  it('keeps the keypad in place but disables it during playback and feedback', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    const keypad = app.querySelector('#keypad')!;
    const digit = shown(app);
    expect(keypad.classList.contains('hidden')).toBe(false);
    expect([...keypad.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
    await vi.advanceTimersByTimeAsync(1200);
    expect([...keypad.querySelectorAll('button')].every(button => !button.disabled)).toBe(true);
    pressKey(app, digit);
    pressKey(app, 'enter');
    expect(keypad.classList.contains('hidden')).toBe(false);
    expect([...keypad.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
  });

  it('ignores a second Start while a sequence is playing', async () => {
    const app = await load();
    const start = app.querySelector('#startBtn')!;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.2);
    click(start);
    const digit = shown(app);
    random.mockReturnValue(0.8);
    click(start);
    random.mockRestore();
    expect(shown(app)).toBe(digit);
    await vi.advanceTimersByTimeAsync(1200);
    expect(text(app.querySelector('#span'))).toBe('1');
    expect(app.querySelector('#keypad')!.classList.contains('locked')).toBe(false);
    pressKey(app, digit);
    pressKey(app, 'enter');
    expect(gameOverShown(app)).toBe(false);
  });

  it('ignores shortcut and repeated digits, and consumes keypad Enter once', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    const digit = shown(app);
    await vi.advanceTimersByTimeAsync(1200);
    const wrong = digit === '0' ? '1' : '0';
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { repeat: true }]) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: wrong, bubbles: true, ...options }));
    }
    expect(text(app.querySelector('#stage .entry'))).toBe('');
    pressKey(app, digit);
    const button = app.querySelector<HTMLButtonElement>(`[data-k="${digit}"]`)!;
    button.focus();
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(gameOverShown(app)).toBe(false);
    expect(shown(app)).toBe('✓');
  });

  it('a wrong recall ends the game', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    const digit = shown(app);
    const wrong = digit === '0' ? '1' : '0';
    await vi.advanceTimersByTimeAsync(1200);
    pressKey(app, wrong);
    pressKey(app, 'enter');
    await vi.advanceTimersByTimeAsync(200);
    expect(gameOverShown(app)).toBe(true);
    pressKey(app, digit);
    expect(gameOverShown(app)).toBe(true);
    click(app.querySelector('#m-again')!);
    expect(gameOverShown(app)).toBe(false);
    expect(text(app.querySelector('#span'))).toBe('1');
    await vi.advanceTimersByTimeAsync(1200);
    expect(app.querySelector('#keypad')!.classList.contains('locked')).toBe(false);
  });
});
