// Game state machine: daily + endless modes, difficulty, scoring.

import {
  accuracy,
  randomTarget,
  targetFromSeed,
  todayKey,
  yesterdayKey,
  type RGB,
} from './color';
import { loadStore, saveStore, type Store } from './storage';

export type Mode = 'daily' | 'endless';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  label: string;
  threshold: number; // accuracy needed to pass a round
}

export const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Easy', threshold: 90 },
  normal: { label: 'Normal', threshold: 94 },
  hard: { label: 'Hard', threshold: 97 },
};

const ENDLESS_START_LIVES = 3;

export interface SubmitResult {
  accuracy: number;
  passed: boolean;
  gameOver: boolean;
  gainedStreak?: boolean;
}

export class Game {
  mode: Mode = 'daily';
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
    this.startDaily();
  }

  get threshold(): number {
    return DIFFICULTY[this.difficulty].threshold;
  }

  get dailyAlreadyDone(): boolean {
    return this.store.daily.day === todayKey() && this.store.daily.done;
  }

  // ---- Daily ----
  startDaily(): void {
    this.mode = 'daily';
    this.finished = this.dailyAlreadyDone;
    this.target = targetFromSeed('chromatic-' + todayKey());
    this.guess = { r: 128, g: 128, b: 128 };
    this.lastResult = this.finished
      ? { accuracy: this.store.daily.bestAccuracy, passed: true, gameOver: true }
      : null;
  }

  // ---- Endless ----
  startEndless(): void {
    this.mode = 'endless';
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

    let result: SubmitResult;
    if (this.mode === 'daily') {
      result = this.commitDaily(acc);
    } else {
      result = this.commitEndless(acc, passed);
    }
    this.lastResult = result;
    return result;
  }

  private commitDaily(acc: number): SubmitResult {
    const key = todayKey();
    const d = this.store.daily;

    // New day resets today's record.
    if (d.day !== key) {
      d.day = key;
      d.bestAccuracy = 0;
      d.done = false;
    }
    d.bestAccuracy = Math.max(d.bestAccuracy, acc);
    d.done = true;

    const continued = d.lastPlayed === yesterdayKey();
    const alreadyToday = d.lastPlayed === key;
    let gainedStreak = false;
    if (!alreadyToday) {
      d.streak = continued ? d.streak + 1 : 1;
      d.lastPlayed = key;
      d.maxStreak = Math.max(d.maxStreak, d.streak);
      gainedStreak = true;
    }

    saveStore(this.store);
    this.finished = true;
    return { accuracy: acc, passed: true, gameOver: true, gainedStreak };
  }

  private commitEndless(acc: number, passed: boolean): SubmitResult {
    if (passed) {
      // Reward accuracy, bonus for higher levels.
      this.score += Math.round(acc) + this.level * 5;
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
