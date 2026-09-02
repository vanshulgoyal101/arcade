import { describe, it, expect } from 'vitest';
import { mountGame, pointerdown, click, text, gameEnv } from './helpers/dom';

const load = () => mountGame(() => import('../echo/src/main.ts'));

describe('echo/dom', () => {
  gameEnv();

  it('boots with pads, a Start button and mode toggles', async () => {
    const app = await load();
    expect(app.querySelectorAll('#pads .pad').length).toBe(4);
    expect(app.querySelector('#startBtn')).not.toBeNull();
    expect(app.querySelector('#modeToggle')).not.toBeNull();
    expect(app.querySelector('#padToggle')).not.toBeNull();
  });

  it('ignores pad presses before the game starts', async () => {
    const app = await load();
    pointerdown(app.querySelector('#pads .pad')!);
    expect(app.querySelector('#pads .pad.lit')).toBeNull();
    expect(text(app.querySelector('#level'))).toBe('0');
  });

  it('switching pad count rebuilds the board', async () => {
    const app = await load();
    click(app.querySelector('#padToggle button[data-pads="6"]')!);
    expect(app.querySelectorAll('#pads .pad').length).toBe(6);
  });

  it('starting the game hides the Start button', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    expect(app.querySelector('#startBtn')!.classList.contains('hidden')).toBe(true);
  });
});
