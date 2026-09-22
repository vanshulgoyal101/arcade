import { describe, it, expect, vi } from 'vitest';
import { mountGame, pointerdown, oddChild, plainChild, text, gameEnv } from './helpers/dom';
import { fmtScore } from '../shared/format';

vi.mock('../shared/cloud', () => ({
  submitScore: vi.fn(),
  mountRank: vi.fn(),
  restoreGame: vi.fn().mockResolvedValue(false),
}));

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

  it.each([162060, 1500000])('compacts HUD and results while retaining exact best %i', async best => {
    let frame: FrameRequestCallback = () => {};
    const app = await mountGame(() => {
      globalThis.requestAnimationFrame = callback => {
        frame = callback;
        return 1;
      };
      return import('../hue-hunt/src/main.ts');
    }, () => {
      localStorage.setItem('huehunt.v2', JSON.stringify({ bestScore: best, bestLevel: 70, muted: true }));
    });
    expect(text(app.querySelector('#best'))).toBe(fmtScore(best));
    const board = app.querySelector('#board')!;
    for (let index = 0; index < 20; index++) {
      pointerdown(oddChild(board));
      await vi.advanceTimersByTimeAsync(80);
    }
    const score = text(app.querySelector('#score'));
    expect(score).toMatch(/^\d+(\.\d)?k$/);
    expect(text(document.querySelector('.popup:last-child'))).toMatch(/^\+\d+(\.\d)?k$/);
    frame(performance.now() + 60_000);
    await vi.advanceTimersByTimeAsync(900);
    expect(text(app.querySelector('#modal .big'))).toBe(score);
    expect(text(app.querySelector('#modal'))).toContain(`Best ${fmtScore(best)}`);
    expect(JSON.parse(localStorage.getItem('huehunt.v2')!).bestScore).toBe(best);
    const { submitScore, mountRank } = await import('../shared/cloud');
    expect(submitScore).toHaveBeenLastCalledWith('hue-hunt', best);
    expect(mountRank).toHaveBeenLastCalledWith(app.querySelector('#modal'), 'hue-hunt', best);
    app.querySelector<HTMLButtonElement>('#m-again')!.click();
    expect(text(app.querySelector('#score'))).toBe('0');
    expect(text(app.querySelector('#best'))).toBe(fmtScore(best));
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

  it('locks the board during the wrong-answer reset', async () => {
    const app = await load();
    const board = app.querySelector('#board')!;

    pointerdown(plainChild(board)); // wrong -> combo reset and transition lock
    const scoreAfterMiss = text(app.querySelector('#score'));
    pointerdown(oddChild(board)); // must not score during the miss animation

    expect(text(app.querySelector('#score'))).toBe(scoreAfterMiss);
    expect(text(app.querySelector('#combo'))).toBe('x1');

    await vi.advanceTimersByTimeAsync(320);
    pointerdown(oddChild(board));
    expect(Number(text(app.querySelector('#score')))).toBeGreaterThan(Number(scoreAfterMiss));
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
