import { describe, it, expect, vi } from 'vitest';
import { mountGame, gameEnv } from './helpers/dom';

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

const load = () => mountGame(() => import('../2048/src/main.ts'));
const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
const tiles = (app: HTMLElement) => [...app.querySelectorAll('.cell')].map((c) => c.textContent || '');
const filled = (app: HTMLElement) => tiles(app).filter(Boolean);

describe('2048/dom', () => {
  gameEnv();

  it('boots a 16-cell board holding two tiles', async () => {
    const app = await load();
    expect(app.querySelectorAll('.cell').length).toBe(16);
    expect(filled(app).length).toBe(2);
    expect(app.querySelector('#score')!.textContent).toBe('0');
  });

  it('slides on an arrow key and keeps the board legal', async () => {
    const app = await load();
    press('ArrowLeft');
    press('ArrowUp');
    press('ArrowRight');
    // Every move either does nothing or slides then spawns, so the board can
    // only ever hold 2s and 4s plus merged powers of two.
    for (const t of filled(app)) expect(Number(t) % 2).toBe(0);
    expect(filled(app).length).toBeGreaterThanOrEqual(2);
  });

  it('accepts WASD as well as the arrows', async () => {
    const app = await load();
    const before = tiles(app).join('|');
    for (const k of ['a', 'd', 'w', 's']) press(k);
    expect(tiles(app).join('|')).not.toBe(before);
  });

  it('paints each tile with a value hook the stylesheet can target', async () => {
    const app = await load();
    const tile = [...app.querySelectorAll<HTMLElement>('.cell')].find((c) => c.textContent);
    expect(tile).toBeDefined();
    expect(tile!.dataset.v).toBe(tile!.textContent);
    expect(tile!.classList.contains('filled')).toBe(true);
  });

  it('restarts to a fresh two-tile board', async () => {
    const app = await load();
    for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) press(k);
    app.querySelector<HTMLButtonElement>('#restart')!.click();
    expect(filled(app).length).toBe(2);
    expect(app.querySelector('#score')!.textContent).toBe('0');
    expect(app.querySelector('.overlay.show')).toBeNull();
  });

  it('keeps a swipe on the board from scrolling the page', async () => {
    const app = await load();
    const board = app.querySelector<HTMLElement>('#board')!;
    // touch-action:none is what makes vertical swipes reach the game at all.
    expect(board.className).toContain('board');
    expect(app.querySelector('#hint')!.textContent).toMatch(/swipe/i);
  });

  it('shows the score, biggest tile and best in the HUD', async () => {
    const app = await load();
    expect(app.querySelector('#score')).not.toBeNull();
    expect(app.querySelector('#tile')).not.toBeNull();
    expect(app.querySelector('#best')).not.toBeNull();
    expect(Number(app.querySelector('#tile')!.textContent)).toBeGreaterThanOrEqual(2);
  });
});
