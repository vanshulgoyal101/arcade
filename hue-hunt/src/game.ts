// Hue Hunt core: difficulty curve, colour generation, scoring & combo.

import { loadStore, saveStore, type HueStore } from './storage';

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface Round {
  size: number; // grid is size x size
  oddIndex: number;
  base: HSL;
  odd: HSL;
}

export const ROUND_TIME = 6000; // ms cap
const TIME_BONUS = 1500; // ms added on a correct find
const TIME_PENALTY = 1800; // ms lost on a wrong tap
const FAST_MS = 1400; // find faster than this = "fast" bonus

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

/** Grid grows from 2x2 up to 7x7 as levels climb. */
export function gridSize(level: number): number {
  return Math.min(2 + Math.floor((level - 1) / 2), 7);
}

/** Colour difference shrinks with level, making the odd tile subtler. */
export function colorDelta(level: number): number {
  return Math.max(50 - (level - 1) * 2.5, 5);
}

function baseColor(): HSL {
  return { h: randInt(360), s: 55 + randInt(25), l: 45 + randInt(15) };
}

export function makeRound(level: number): Round {
  const size = gridSize(level);
  const delta = colorDelta(level);
  const base = baseColor();
  const dir = Math.random() < 0.5 ? -1 : 1;
  const odd: HSL = {
    h: (base.h + dir * Math.round(delta / 3) + 360) % 360,
    s: base.s,
    l: Math.max(8, Math.min(92, base.l + (dir * delta) / 2)),
  };
  return { size, base, odd, oddIndex: randInt(size * size) };
}

export function hslCss(c: HSL): string {
  return `hsl(${c.h} ${c.s}% ${c.l}%)`;
}

export class HueGame {
  level = 1;
  score = 0;
  combo = 0;
  multiplier = 1;
  timeLeft = ROUND_TIME;
  playing = false;
  round: Round = makeRound(1);
  roundStart = 0;
  store: HueStore;

  constructor() {
    this.store = loadStore();
  }

  start(now: number): void {
    this.level = 1;
    this.score = 0;
    this.combo = 0;
    this.multiplier = 1;
    this.timeLeft = ROUND_TIME;
    this.playing = true;
    this.round = makeRound(1);
    this.roundStart = now;
  }

  private updateMultiplier(): void {
    this.multiplier = Math.min(5, 1 + Math.floor(this.combo / 3));
  }

  /** Returns points gained and whether it was a fast find. */
  correctPick(now: number): { points: number; fast: boolean } {
    const elapsed = now - this.roundStart;
    const fast = elapsed <= FAST_MS;
    this.combo += 1;
    this.updateMultiplier();

    const base = 10 * this.level;
    const speedBonus = fast ? 15 : 0;
    const points = (base + speedBonus) * this.multiplier;
    this.score += points;

    this.timeLeft = Math.min(ROUND_TIME, this.timeLeft + TIME_BONUS + (fast ? 400 : 0));
    this.level += 1;
    this.round = makeRound(this.level);
    this.roundStart = now;
    return { points, fast };
  }

  wrongPick(): void {
    this.combo = 0;
    this.multiplier = 1;
    this.timeLeft -= TIME_PENALTY;
  }

  tick(dtMs: number): void {
    this.timeLeft -= dtMs;
  }

  /** Finalise a run; returns whether a new best score was set. */
  end(): boolean {
    this.playing = false;
    const reachedLevel = this.level - 1;
    let newBest = false;
    if (this.score > this.store.bestScore) {
      this.store.bestScore = this.score;
      newBest = true;
    }
    if (reachedLevel > this.store.bestLevel) {
      this.store.bestLevel = reachedLevel;
    }
    saveStore(this.store);
    return newBest;
  }
}
