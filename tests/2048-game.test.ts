import { describe, it, expect, beforeEach } from 'vitest';
import {
  slideLine, moveBoard, hasMoves, spawnTile, emptyCells, highestTile, emptyBoard, Game, SIZE, CELLS,
} from '../2048/src/game';

// Readable 4×4 fixtures: rows of four, flattened.
const b = (...rows: number[][]) => rows.flat();

describe('2048/slideLine', () => {
  it('drops gaps toward the start', () => {
    expect(slideLine([0, 2, 0, 4]).values).toEqual([2, 4, 0, 0]);
  });

  it('merges one equal pair and scores the sum', () => {
    const r = slideLine([2, 2, 0, 0]);
    expect(r.values).toEqual([4, 0, 0, 0]);
    expect(r.gained).toBe(4);
  });

  it('merges two separate pairs in one move', () => {
    const r = slideLine([2, 2, 4, 4]);
    expect(r.values).toEqual([4, 8, 0, 0]);
    expect(r.gained).toBe(12);
  });

  it('never merges the same tile twice in one move', () => {
    // 4+4 becomes 8; the trailing 8 must NOT then merge into 16.
    const r = slideLine([4, 4, 8, 0]);
    expect(r.values).toEqual([8, 8, 0, 0]);
    expect(r.gained).toBe(8);
  });

  it('merges the leading pair first, not the trailing one', () => {
    expect(slideLine([2, 2, 2, 0]).values).toEqual([4, 2, 0, 0]);
    expect(slideLine([0, 2, 2, 2]).values).toEqual([4, 2, 0, 0]);
  });

  it('leaves a line that cannot move alone', () => {
    const r = slideLine([2, 4, 8, 16]);
    expect(r.values).toEqual([2, 4, 8, 16]);
    expect(r.gained).toBe(0);
  });

  it('always returns a full-width line', () => {
    for (const line of [[0, 0, 0, 0], [2, 2, 2, 2], [0, 0, 0, 2]]) {
      expect(slideLine(line).values.length).toBe(SIZE);
    }
  });
});

describe('2048/moveBoard', () => {
  it('slides left', () => {
    const r = moveBoard(b([0, 0, 0, 2], [0, 0, 4, 0], [0, 8, 0, 0], [16, 0, 0, 0]), 'left');
    expect(r.board).toEqual(b([2, 0, 0, 0], [4, 0, 0, 0], [8, 0, 0, 0], [16, 0, 0, 0]));
  });

  it('slides right, merging toward the far edge', () => {
    const r = moveBoard(b([2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]), 'right');
    expect(r.board.slice(0, 4)).toEqual([0, 0, 0, 4]);
  });

  it('slides up and down', () => {
    const col = b([2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    expect(moveBoard(col, 'up').board[0]).toBe(4);
    expect(moveBoard(col, 'down').board[12]).toBe(4);
  });

  it('reports no move when nothing shifts', () => {
    const stuck = b([2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]);
    expect(moveBoard(stuck, 'left').moved).toBe(false);
    expect(moveBoard(stuck, 'up').moved).toBe(false);
  });

  it('does not mutate the board it was given', () => {
    const before = b([2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    const copy = [...before];
    moveBoard(before, 'left');
    expect(before).toEqual(copy);
  });

  it('reports where tiles merged so the view can animate them', () => {
    const r = moveBoard(b([2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]), 'left');
    expect(r.merged).toEqual([0]);
  });

  it('conserves the tile total across a move', () => {
    const board = b([2, 2, 4, 4], [8, 0, 8, 2], [2, 4, 2, 4], [0, 16, 16, 0]);
    const sum = (x: number[]) => x.reduce((a, c) => a + c, 0);
    for (const dir of ['left', 'right', 'up', 'down'] as const) {
      expect(sum(moveBoard(board, dir).board)).toBe(sum(board));
    }
  });
});

describe('2048/hasMoves', () => {
  it('is true while a cell is free', () => {
    expect(hasMoves(emptyBoard())).toBe(true);
  });

  it('is true on a full board with an adjacent pair', () => {
    expect(hasMoves(b([2, 2, 4, 8], [4, 8, 16, 32], [2, 4, 8, 16], [4, 8, 16, 32]))).toBe(true);
  });

  it('is false when full with no neighbouring equals', () => {
    expect(hasMoves(b([2, 4, 8, 16], [4, 8, 16, 2], [8, 16, 2, 4], [16, 2, 4, 8]))).toBe(false);
  });

  it('spots a vertical pair the row scan would miss', () => {
    expect(hasMoves(b([2, 4, 8, 16], [2, 8, 16, 2], [8, 16, 2, 4], [16, 2, 4, 8]))).toBe(true);
  });
});

describe('2048/spawnTile', () => {
  it('fills an empty cell and returns its index', () => {
    const board = emptyBoard();
    const at = spawnTile(board, () => 0.5);
    expect(at).toBeGreaterThanOrEqual(0);
    expect(board[at]).toBe(2);
    expect(emptyCells(board).length).toBe(CELLS - 1);
  });

  it('spawns a 4 only on a low roll', () => {
    const four = emptyBoard();
    spawnTile(four, () => 0.05);
    expect(highestTile(four)).toBe(4);
  });

  it('returns -1 and changes nothing on a full board', () => {
    const full = new Array(CELLS).fill(2);
    expect(spawnTile(full, () => 0.5)).toBe(-1);
    expect(full.every((v) => v === 2)).toBe(true);
  });

  it('only ever produces 2s and 4s', () => {
    for (let i = 0; i < 200; i++) {
      const board = emptyBoard();
      spawnTile(board, Math.random);
      expect([2, 4]).toContain(highestTile(board));
    }
  });
});

describe('2048/Game', () => {
  beforeEach(() => localStorage.clear());

  it('starts with exactly two tiles and no score', () => {
    const g = new Game(() => 0.5);
    g.start();
    expect(CELLS - emptyCells(g.board).length).toBe(2);
    expect(g.score).toBe(0);
    expect(g.status).toBe('playing');
  });

  it('scores merges and spawns a tile on a successful move', () => {
    const g = new Game(() => 0.5);
    g.start();
    g.board = b([2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    expect(g.move('left')).toBe(true);
    expect(g.score).toBe(4);
    expect(CELLS - emptyCells(g.board).length).toBe(2); // merged tile + spawn
  });

  it('ignores a move that changes nothing, and spawns no tile', () => {
    const g = new Game(() => 0.5);
    g.start();
    g.board = b([2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    const before = [...g.board];
    expect(g.move('left')).toBe(false);
    expect(g.board).toEqual(before);
  });

  it('declares a win at 2048 and then plays on when asked', () => {
    const g = new Game(() => 0.5);
    g.start();
    g.board = b([1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    g.move('left');
    expect(g.status).toBe('won');

    g.continueAfterWin();
    expect(g.status).toBe('playing');
    // Reaching 2048 again must not re-trigger the win banner.
    g.board = b([1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    g.move('left');
    expect(g.status).toBe('playing');
  });

  it('ends the run when the board locks up', () => {
    const g = new Game(() => 0.5); // 0.5 always spawns a 2, in the only free cell
    g.start();
    // Sliding the last row left frees the far corner; the spawned 2 then leaves
    // a full board with no equal orthogonal neighbours anywhere.
    g.board = b([2, 4, 8, 16], [4, 8, 16, 2], [8, 16, 2, 4], [0, 16, 2, 4]);
    expect(g.move('left')).toBe(true);
    expect(g.board).toEqual(b([2, 4, 8, 16], [4, 8, 16, 2], [8, 16, 2, 4], [16, 2, 4, 2]));
    expect(g.status).toBe('lost');
    expect(g.move('right')).toBe(false); // no moves accepted once lost
  });

  it('records a new best score and best tile', () => {
    const g = new Game(() => 0.5);
    g.start();
    g.score = 120;
    g.board = b([64, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    expect(g.end()).toBe(true);
    expect(g.store.best).toBe(120);
    expect(g.store.bestTile).toBe(64);
  });

  it('never lowers a stored best', () => {
    const g = new Game(() => 0.5);
    g.start();
    g.score = 500;
    g.board = b([128, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    g.end();

    const g2 = new Game(() => 0.5);
    g2.start();
    g2.score = 10;
    g2.board = b([8, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    expect(g2.end()).toBe(false);
    expect(g2.store.best).toBe(500);
    expect(g2.store.bestTile).toBe(128);
  });

  it('clears the previous run when restarted', () => {
    const g = new Game(() => 0.5);
    g.start();
    g.score = 300;
    g.board = b([2, 4, 8, 16], [4, 8, 16, 2], [8, 16, 2, 4], [16, 2, 4, 8]);
    g.status = 'lost';
    g.start();
    expect(g.score).toBe(0);
    expect(g.status).toBe('playing');
    expect(CELLS - emptyCells(g.board).length).toBe(2);
  });
});
