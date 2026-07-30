// Flashmath core: generates arithmetic problems that scale with level,
// tracks a beat-the-clock timer, combo multiplier and score.

import { loadStore, saveStore, type MathStore } from './storage';

export type Op = '+' | '−' | '×' | '÷';

export interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

export const ROUND_TIME = 30000; // ms cap
const TIME_BONUS = 3000;
const FAST_BONUS = 1200;
const TIME_PENALTY = 4000;
const FAST_MS = 2500;

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Difficulty tier 0..4 grows every 3 levels. */
export function tierFor(level: number): number {
  return Math.min(Math.floor((level - 1) / 3), 4);
}

export function makeProblem(level: number): Problem {
  const tier = tierFor(level);
  const ops: Op[][] = [
    ['+', '−'],
    ['+', '−'],
    ['+', '−', '×'],
    ['+', '−', '×'],
    ['+', '−', '×', '÷'],
  ];
  const op = pick(ops[tier]);

  if (op === '×') {
    const hi = tier >= 3 ? 12 : 9;
    const a = ri(2, hi);
    const b = ri(2, hi);
    return { a, b, op, answer: a * b };
  }
  if (op === '÷') {
    const b = ri(2, 12);
    const answer = ri(2, 12);
    return { a: b * answer, b, op, answer };
  }
  // + / −
  const hi = [10, 25, 50, 99, 150][tier];
  let a = ri(1, hi);
  let b = ri(1, hi);
  if (op === '−' && b > a) [a, b] = [b, a]; // keep it non-negative
  return { a, b, op, answer: op === '+' ? a + b : a - b };
}

export class MathGame {
  level = 1;
  score = 0;
  combo = 0;
  multiplier = 1;
  timeLeft = ROUND_TIME;
  solved = 0;
  playing = false;
  problem: Problem = makeProblem(1);
  problemStart = 0;
  store: MathStore;

  constructor() {
    this.store = loadStore();
  }

  start(now: number): void {
    this.level = 1;
    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.solved = 0;
    this.timeLeft = ROUND_TIME;
    this.playing = true;
    this.problem = makeProblem(1);
    this.problemStart = now;
  }

  /** Grade an answer. Returns points gained (0 if wrong) and fast flag. */
  submit(value: number, now: number): { correct: boolean; points: number; fast: boolean } {
    if (value === this.problem.answer) {
      const fast = now - this.problemStart <= FAST_MS;
      this.combo += 1;
      this.multiplier = Math.min(5, 1 + Math.floor(this.combo / 3));
      const points = (10 * this.level + (fast ? 15 : 0)) * this.multiplier;
      this.score += points;
      this.solved += 1;
      this.level += 1;
      this.timeLeft = Math.min(ROUND_TIME, this.timeLeft + TIME_BONUS + (fast ? FAST_BONUS : 0));
      this.problem = makeProblem(this.level);
      this.problemStart = now;
      return { correct: true, points, fast };
    }
    this.combo = 0;
    this.multiplier = 1;
    this.timeLeft -= TIME_PENALTY;
    return { correct: false, points: 0, fast: false };
  }

  tick(dt: number): void {
    this.timeLeft -= dt;
  }

  /** Finalise; returns whether a new best score was set. */
  end(): boolean {
    this.playing = false;
    let newBest = false;
    if (this.score > this.store.bestScore) {
      this.store.bestScore = this.score;
      newBest = true;
    }
    if (this.solved > this.store.bestSolved) this.store.bestSolved = this.solved;
    saveStore(this.store);
    return newBest;
  }
}
