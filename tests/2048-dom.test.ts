import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mountGame, gameEnv } from './helpers/dom';

const submitScore = vi.fn();
const queuePending = vi.fn();
vi.mock('../shared/cloud', () => ({
  submitScore,
  queuePending,
  getRank: vi.fn().mockResolvedValue(null),
  mountRank: vi.fn(),
  cloudReady: vi.fn().mockResolvedValue(undefined),
  cloudProfile: () => null,
  cloudAvatarImage: () => null,
  isSignedIn: () => false,
  signIn: vi.fn(),
  restoreGame: vi.fn().mockResolvedValue(false),
}));

const load = () => mountGame(() => import('../2048/src/main.ts'));
const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
const tiles = (app: HTMLElement) => [...app.querySelectorAll('.tile')].map((c) => c.textContent || '');
const filled = (app: HTMLElement) => tiles(app).filter(Boolean);
const swipe = (app: HTMLElement, dx: number, dy: number) => {
  const board = app.querySelector('#board')!;
  board.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
  board.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100 + dx, clientY: 100 + dy }));
  board.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 100 + dx, clientY: 100 + dy }));
};

describe('2048/dom', () => {
  gameEnv();

  beforeEach(() => {
    submitScore.mockClear();
    queuePending.mockClear();
  });

  it('boots a 16-cell grid holding two tiles', async () => {
    const app = await load();
    expect(app.querySelectorAll('.cell').length).toBe(16);
    expect(filled(app).length).toBe(2);
    expect(app.querySelector('#score')!.textContent).toBe('0');
    expect(app.querySelector('#restart')!.getAttribute('aria-label')).toBe('New game');
    expect(app.querySelector('#mute')!.getAttribute('aria-label')).toBe('Toggle sound');
  });

  it('slides on an arrow key and keeps the board legal', async () => {
    const app = await load();
    press('ArrowLeft');
    vi.advanceTimersByTime(200);
    press('ArrowUp');
    vi.advanceTimersByTime(200);
    press('ArrowRight');
    vi.advanceTimersByTime(200);
    // Every move either does nothing or slides then spawns, so the board can
    // only ever hold 2s and 4s plus merged powers of two.
    for (const t of filled(app)) expect(Number(t) % 2).toBe(0);
    expect(filled(app).length).toBeGreaterThanOrEqual(2);
  });

  it('accepts WASD as well as the arrows', async () => {
    const app = await load();
    const before = tiles(app).join('|');
    for (const k of ['a', 'd', 'w', 's']) {
      press(k);
      vi.advanceTimersByTime(200);
    }
    expect(tiles(app).join('|')).not.toBe(before);
  });

  it('paints each tile with a value hook the stylesheet can target', async () => {
    const app = await load();
    const tile = app.querySelector<HTMLElement>('.tile');
    expect(tile).not.toBeNull();
    expect(tile!.dataset.v).toBe(tile!.textContent);
    // Position drives the transform, so a move can transition rather than snap.
    expect(tile!.style.getPropertyValue('--col')).not.toBe('');
    expect(tile!.style.getPropertyValue('--row')).not.toBe('');
  });

  it('moves on a swipe as soon as it passes the threshold', async () => {
    const app = await load();
    const before = tiles(app).join('|');
    // A single direction can legitimately be a no-op depending on the random
    // starting cells; four directions guarantee at least one valid move.
    for (const [dx, dy] of [[-60, 0], [0, -60], [60, 0], [0, 60]]) {
      swipe(app, dx, dy);
      vi.advanceTimersByTime(200);
    }
    expect(tiles(app).join('|')).not.toBe(before);
  });

  it('ignores a tap or a nudge too small to be a swipe', async () => {
    const app = await load();
    const before = tiles(app).join('|');
    swipe(app, 4, 3);
    vi.advanceTimersByTime(200);
    expect(tiles(app).join('|')).toBe(before);
  });

  it('completes a flick that leaves the board mid-gesture', async () => {
    const app = await load();
    const board = app.querySelector('#board')!;
    const before = tiles(app).join('|');
    board.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
    // Starting near an edge, the finger exits the board before the threshold.
    board.dispatchEvent(new MouseEvent('pointerleave', { bubbles: true, clientX: 94, clientY: 100 }));
    board.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 20, clientY: 100 }));
    vi.advanceTimersByTime(200);
    expect(tiles(app).join('|')).not.toBe(before);
  });

  it('restarts to a fresh two-tile board', async () => {
    const app = await load();
    for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) press(k);
    vi.advanceTimersByTime(200);
    app.querySelector<HTMLButtonElement>('#restart')!.click();
    expect(filled(app).length).toBe(2);
    expect(app.querySelector('#score')!.textContent).toBe('0');
    expect(app.querySelector('.overlay.show')).toBeNull();
  });

  it('shows the score, biggest tile and best in the HUD', async () => {
    const app = await load();
    expect(app.querySelector('#score')).not.toBeNull();
    expect(app.querySelector('#tile')).not.toBeNull();
    expect(app.querySelector('#best')).not.toBeNull();
    expect(Number(app.querySelector('#tile')!.textContent)).toBeGreaterThanOrEqual(2);
  });

  it('queues a new best immediately and debounces its cloud write', async () => {
    const app = await load();
    for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
      press(k);
      vi.advanceTimersByTime(200);
      if (queuePending.mock.calls.length) break;
    }

    expect(queuePending).toHaveBeenCalledWith('2048', expect.any(Number));
    expect(submitScore).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600);
    expect(submitScore).toHaveBeenCalledWith('2048', expect.any(Number));
  });
});
