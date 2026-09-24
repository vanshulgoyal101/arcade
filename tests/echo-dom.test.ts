import { describe, it, expect, vi } from 'vitest';
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

  it('ignores duplicate Start actions during an active run', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    const firstPad = app.querySelector('#pads .pad');
    click(app.querySelector('#startBtn')!);
    expect(app.querySelector('#pads .pad')).toBe(firstPad);
    await vi.advanceTimersByTimeAsync(2000);
    expect(text(app.querySelector('#level'))).toBe('1');
    expect(text(app.querySelector('#status'))).toContain('Your turn');
  });

  it('keeps settings locked until the missed-pad reveal has finished', async () => {
    const app = await load();
    click(app.querySelector('[data-strict="true"]')!);
    click(app.querySelector('#startBtn')!);
    await vi.advanceTimersByTimeAsync(500);
    const pads = [...app.querySelectorAll<HTMLButtonElement>('#pads .pad')];
    const correct = pads.findIndex(pad => pad.classList.contains('lit'));
    expect(correct).toBeGreaterThanOrEqual(0);
    await vi.advanceTimersByTimeAsync(1500);
    pointerdown(pads[(correct + 1) % pads.length]);
    click(app.querySelector('[data-strict="false"]')!);
    click(app.querySelector('[data-pads="6"]')!);
    expect(app.querySelector('[data-strict="true"]')!.classList.contains('active')).toBe(true);
    expect(app.querySelectorAll('#pads .pad')).toHaveLength(4);
    expect(app.querySelector('.overlay.show')).toBeNull();
    await vi.advanceTimersByTimeAsync(900);
    expect(text(app.querySelector('#modal'))).toContain('Strict');
    expect(text(app.querySelector('#modal'))).toContain('4-pad');
    click(app.querySelector('#m-again')!);
    await vi.advanceTimersByTimeAsync(2000);
    expect(app.querySelector('.overlay.show')).toBeNull();
    expect(text(app.querySelector('#status'))).toContain('Your turn');
  });

  it.each(['keyboard', 'secondary pointer'])('handles %s pad activation correctly', async (input) => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    await vi.advanceTimersByTimeAsync(500);
    const correct = app.querySelector<HTMLButtonElement>('#pads .pad.lit')!;
    expect(correct).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1500);
    if (input === 'keyboard') {
      correct.click();
      expect(text(app.querySelector('#status'))).toContain('Nice!');
    } else {
      correct.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
      expect(text(app.querySelector('#status'))).toContain('Your turn');
      expect(app.querySelector('#pads .pad.lit')).toBeNull();
    }
  });
});
