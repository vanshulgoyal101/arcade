// Game state machine: endless mode, difficulty, scoring.

import { accuracy, randomTarget, type RGB } from './color';
import { loadStore, saveStore, type Store } from './storage';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  label: string;
  threshold: number; // accuracy needed to pass a round
  points: number; // score multiplier — harder difficulties reward more
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Easy', threshold: 90, points: 1 },
  normal: { label: 'Normal', threshold: 94, points: 1.5 },
  hard: { label: 'Hard', threshold: 97, points: 2 },
};

const ENDLESS_START_LIVES = 3;

export interface SubmitResult {
  accuracy: number;
  passed: boolean;
  gameOver: boolean;
}

export class Game {
  difficulty: Difficulty = 'normal';
  target: RGB;
  guess: RGB = { r: 128, g: 128, b: 128 };

  // Endless state
  level = 1;
  lives = ENDLESS_START_LIVES;
  score = 0;

  finished = false;
  lastResult: SubmitResult | null = null;

  store: Store;

  constructor() {
    this.store = loadStore();
    this.target = randomTarget();
    this.startEndless();
  }

  get threshold(): number {
    const base = DIFFICULTY[this.difficulty].threshold;
    // Ramp the required accuracy up with the level (capped) so higher levels get harder.
    return Math.min(base + Math.floor((this.level - 1) / 4), base + 4, 98);
  }

  get pointsMultiplier(): number {
    return DIFFICULTY[this.difficulty].points;
  }

  // ---- Endless ----
  startEndless(): void {
    this.finished = false;
    this.level = 1;
    this.lives = ENDLESS_START_LIVES;
    this.score = 0;
    this.guess = { r: 128, g: 128, b: 128 };
    this.nextEndlessTarget();
  }

  private nextEndlessTarget(): void {
    this.target = randomTarget();
  }

  setDifficulty(d: Difficulty): void {
    this.difficulty = d;
  }

  setGuess(next: Partial<RGB>): void {
    this.guess = { ...this.guess, ...next };
  }

  submit(): SubmitResult {
    const acc = Math.round(accuracy(this.guess, this.target) * 10) / 10;
    const passed = acc >= this.threshold;
    const result = this.commitEndless(acc, passed);
    this.lastResult = result;
    return result;
  }

  private commitEndless(acc: number, passed: boolean): SubmitResult {
    if (passed) {
      // Reward accuracy + level, scaled by the difficulty's point multiplier.
      const mult = DIFFICULTY[this.difficulty].points;
      this.score += Math.round((Math.round(acc) + this.level * 5) * mult);
      this.level += 1;
      this.nextEndlessTarget();
      this.guess = { r: 128, g: 128, b: 128 };
      return { accuracy: acc, passed: true, gameOver: false };
    }

    this.lives -= 1;
    if (this.lives <= 0) {
      this.finished = true;
      if (this.score > this.store.endlessBest) {
        this.store.endlessBest = this.score;
        saveStore(this.store);
      }
      return { accuracy: acc, passed: false, gameOver: true };
    }
    // Missed but still alive: fresh target for the next attempt.
    this.nextEndlessTarget();
    this.guess = { r: 128, g: 128, b: 128 };
    return { accuracy: acc, passed: false, gameOver: false };
  }
}
