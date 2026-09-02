import { describe, it, expect, vi } from 'vitest';
import { mountGame, pointerdown, oddChild, plainChild, text, gameEnv } from './helpers/dom';

const load = () => mountGame(() => import('../hue-hunt/src/main.ts'));

describe('hue-hunt/dom', () => {
  gameEnv();

  it('boots a full board and HUD', async () => {
    const app = await load();
    const board = app.querySelector('#board')!;
    expect(board.children.length).toBe(4); // 2×2 at level 1
    expect(text(app.querySelector('#score'))).toBe('0');
    expect(text(app.querySelector('#level'))).toBe('1');
  });

  it('a correct pick scores and marks the tile', async () => {
    const app = await load();
    const board = app.querySelector('#board')!;
    pointerdown(oddChild(board));
    expect(Number(text(app.querySelector('#score')))).toBeGreaterThan(0);
    expect(board.querySelector('.correct')).not.toBeNull();
  });

  // Regression for the lost `advancing` guard: a fast second tap during the
  // 60ms board-rebuild after a correct pick must NOT be graded as a wrong pick.
  it('ignores a second tap on the stale board (no wrong grade)', async () => {
    const app = await load();
    const board = app.querySelector('#board')!;
    pointerdown(oddChild(board)); // correct → schedules rebuild, sets the guard
    pointerdown(plainChild(board)); // stale tap, same board, before rebuild
    expect(board.querySelector('.wrong')).toBeNull();
  });

  it('accepts the next pick after the board rebuilds', async () => {
    const app = await load();
    const board = app.querySelector('#board')!;
    pointerdown(oddChild(board));
    const afterFirst = Number(text(app.querySelector('#score')));
    await vi.advanceTimersByTimeAsync(80); // let the 60ms rebuild run (guard clears in buildBoard)
    pointerdown(oddChild(board));
    expect(Number(text(app.querySelector('#score')))).toBeGreaterThan(afterFirst);
  });
});
