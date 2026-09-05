// 2048 core: a 4×4 board of powers of two. Every rule lives here as a pure
// function over a flat 16-cell array (0 = empty), so the model is testable
// without a DOM and main.ts only draws what it is given.

export const SIZE = 4;
export const CELLS = SIZE * SIZE;
export const WIN_TILE = 2048;

export type Board = number[];
export type Direction = 'left' | 'right' | 'up' | 'down';

/** A tile merge or slide, used to animate a move. */
export interface MoveResult {
  board: Board;
  gained: number;
  moved: boolean;
  merged: number[]; // indices that just merged, for the pop animation
  movements: Movement[]; // where every tile travelled, for the slide animation
}

/** One tile's journey during a move, in board indices. */
export interface Movement {
  from: number;
  to: number;
  merged: boolean;
}

/** Where a collapsed line's tiles ended up: the value, and the slots feeding it. */
interface Slot {
  value: number;
  from: number[]; // positions within the line, not board indices
}

export const emptyBoard = (): Board => new Array(CELLS).fill(0);

/** Indices of a row/column, ordered along the direction of travel. */
function line(dir: Direction, i: number): number[] {
  const idx: number[] = [];
  for (let k = 0; k < SIZE; k++) {
    // Rows for horizontal moves, columns for vertical ones.
    idx.push(dir === 'left' || dir === 'right' ? i * SIZE + k : k * SIZE + i);
  }
  // Right/down collapse toward the far end, so walk the line backwards.
  return dir === 'right' || dir === 'down' ? idx.reverse() : idx;
}

/**
 * The one place the merge rule lives: drop the gaps, then fuse each equal pair
 * once, remembering which slots fed each result so a move can be animated.
 */
function collapse(values: number[]): { slots: Slot[]; gained: number } {
  const packed = values.map((value, at) => ({ value, at })).filter((c) => c.value !== 0);
  const slots: Slot[] = [];
  let gained = 0;
  for (let i = 0; i < packed.length; i++) {
    // A tile that just absorbed another can't merge again this move.
    if (i + 1 < packed.length && packed[i].value === packed[i + 1].value) {
      const value = packed[i].value * 2;
      gained += value;
      slots.push({ value, from: [packed[i].at, packed[i + 1].at] });
      i++;
    } else {
      slots.push({ value: packed[i].value, from: [packed[i].at] });
    }
  }
  return { slots, gained };
}

/**
 * Collapse one line toward its start. Returns the new values plus the score
 * gained and which slots merged.
 */
export function slideLine(values: number[]): { values: number[]; gained: number; mergedAt: number[] } {
  const { slots, gained } = collapse(values);
  const out = slots.map((s) => s.value);
  const mergedAt = slots.flatMap((s, k) => (s.from.length > 1 ? [k] : []));
  while (out.length < SIZE) out.push(0);
  return { values: out, gained, mergedAt };
}

/** Apply a move to the whole board without mutating the input. */
export function moveBoard(board: Board, dir: Direction): MoveResult {
  const next = emptyBoard();
  const merged: number[] = [];
  const movements: Movement[] = [];
  let gained = 0;
  for (let i = 0; i < SIZE; i++) {
    const idx = line(dir, i);
    const res = collapse(idx.map((j) => board[j]));
    gained += res.gained;
    res.slots.forEach((slot, k) => {
      const to = idx[k];
      const isMerge = slot.from.length > 1;
      next[to] = slot.value;
      if (isMerge) merged.push(to);
      for (const at of slot.from) movements.push({ from: idx[at], to, merged: isMerge });
    });
  }
  return { board: next, gained, moved: movements.some((m) => m.from !== m.to), merged, movements };
}

export const emptyCells = (board: Board): number[] =>
  board.reduce<number[]>((acc, v, i) => (v === 0 ? (acc.push(i), acc) : acc), []);

/** Place a new tile — 4 one time in ten, otherwise 2. Mutates `board`. */
export function spawnTile(board: Board, rng: () => number = Math.random): number {
  const free = emptyCells(board);
  if (!free.length) return -1;
  const at = free[Math.floor(rng() * free.length)];
  board[at] = rng() < 0.1 ? 4 : 2;
  return at;
}

/** False only when the board is full and no neighbours match. */
export function hasMoves(board: Board): boolean {
  if (emptyCells(board).length) return true;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r * SIZE + c];
      if (c + 1 < SIZE && v === board[r * SIZE + c + 1]) return true;
      if (r + 1 < SIZE && v === board[(r + 1) * SIZE + c]) return true;
    }
  }
  return false;
}

export const highestTile = (board: Board): number => Math.max(0, ...board);

import { loadStore, saveStore, type Store } from './storage';

export type Status = 'playing' | 'won' | 'lost';

export class Game {
  board: Board = emptyBoard();
  score = 0;
  status: Status = 'playing';
  lastMerged: number[] = [];
  lastMovements: Movement[] = [];
  spawned = -1;
  store: Store;
  // A win doesn't have to end the run: acknowledge 2048 once, then carry on.
  private winAcknowledged = false;
  private bestAtStart = 0;

  constructor(private rng: () => number = Math.random) {
    this.store = loadStore();
  }

  get best(): number {
    return this.store.best;
  }

  get bestTile(): number {
    return highestTile(this.board);
  }

  isPlaying(): boolean {
    return this.status === 'playing';
  }

  start(): void {
    this.bestAtStart = this.store.best;
    this.board = emptyBoard();
    this.score = 0;
    this.status = 'playing';
    this.lastMerged = [];
    this.lastMovements = [];
    this.winAcknowledged = false;
    spawnTile(this.board, this.rng);
    this.spawned = spawnTile(this.board, this.rng);
  }

  /** Keep playing after reaching 2048 rather than ending the run. */
  continueAfterWin(): void {
    this.winAcknowledged = true;
    if (this.status === 'won') this.status = 'playing';
  }

  /** Returns true when the board actually changed. */
  move(dir: Direction): boolean {
    if (this.status !== 'playing') return false;
    const res = moveBoard(this.board, dir);
    if (!res.moved) return false;

    this.board = res.board;
    this.score += res.gained;
    this.lastMerged = res.merged;
    this.lastMovements = res.movements;
    this.spawned = spawnTile(this.board, this.rng);

    if (!this.winAcknowledged && highestTile(this.board) >= WIN_TILE) this.status = 'won';
    else if (!hasMoves(this.board)) this.status = 'lost';
    this.persistProgress();
    return true;
  }

  /** Persist the run's score/tile. Returns true when the best score improved. */
  end(): boolean {
    this.persistProgress();
    return this.score > this.bestAtStart;
  }

  /** A 2048 run can last indefinitely, so never wait for game-over to save it. */
  private persistProgress(): void {
    const tile = highestTile(this.board);
    let changed = false;
    if (this.score > this.store.best) {
      this.store.best = this.score;
      changed = true;
    }
    if (tile > this.store.bestTile) {
      this.store.bestTile = tile;
      changed = true;
    }
    if (changed) saveStore(this.store);
  }
}
