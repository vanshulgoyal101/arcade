// Interval ear-training core: identify the interval between two notes.
// Missed intervals resurface more often (light spaced repetition).

import { loadStore, saveStore, type IntervalStore } from './storage';

export interface Interval {
  name: string;
  short: string;
  semis: number;
}

// A clean set of eight common intervals.
export const INTERVALS: Interval[] = [
  { name: 'Minor 2nd', short: 'm2', semis: 1 },
  { name: 'Major 2nd', short: 'M2', semis: 2 },
  { name: 'Minor 3rd', short: 'm3', semis: 3 },
  { name: 'Major 3rd', short: 'M3', semis: 4 },
  { name: 'Perfect 4th', short: 'P4', semis: 5 },
  { name: 'Perfect 5th', short: 'P5', semis: 7 },
  { name: 'Major 6th', short: 'M6', semis: 9 },
  { name: 'Octave', short: 'P8', semis: 12 },
];

const START_LIVES = 3;
const ROOT_MIN = 55; // G3
const ROOT_MAX = 64; // E4

export class IntervalGame {
  score = 0;
  lives = START_LIVES;
  streak = 0;
  rootMidi = 60;
  current: Interval = INTERVALS[0];
  finished = false;
  private weak: Record<number, number> = {};
  store: IntervalStore;

  constructor() {
    this.store = loadStore();
  }

  get best(): number {
    return this.store.bestScore;
  }

  start(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.streak = 0;
    this.finished = false;
    this.nextRound();
  }

  nextRound(): void {
    // Weight toward intervals the player has missed.
    let best = INTERVALS[0];
    let bestScore = -1;
    for (let i = 0; i < 4; i++) {
      const iv = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
      const s = Math.random() + (this.weak[iv.semis] ?? 0) * 0.7;
      if (s > bestScore) {
        bestScore = s;
        best = iv;
      }
    }
    this.current = best;
    this.rootMidi = Math.floor(Math.random() * (ROOT_MAX - ROOT_MIN + 1)) + ROOT_MIN;
  }

  /** Answer with a semitone count. Returns correctness + whether the run ended. */
  answer(semis: number): { correct: boolean; gameOver: boolean; newBest: boolean } {
    if (semis === this.current.semis) {
      this.score += 10 + this.streak * 2;
      this.streak += 1;
      return { correct: true, gameOver: false, newBest: false };
    }
    this.weak[this.current.semis] = (this.weak[this.current.semis] ?? 0) + 1;
    this.streak = 0;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.finished = true;
      const newBest = this.score > this.store.bestScore;
      if (newBest) {
        this.store.bestScore = this.score;
        saveStore(this.store);
      }
      return { correct: false, gameOver: true, newBest };
    }
    return { correct: false, gameOver: false, newBest: false };
  }
}
