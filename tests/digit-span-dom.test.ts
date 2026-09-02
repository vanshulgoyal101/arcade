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
  });
});
