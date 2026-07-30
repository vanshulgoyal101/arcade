// Sprint core: a timed typing test. Tracks correct/incorrect characters for
// wpm + accuracy, and biases upcoming words toward letters you mistype.

import { WORDS } from './content';
import { loadStore, saveStore, type SprintStore } from './storage';

export const DURATIONS = [15, 30, 60] as const;
export type Duration = (typeof DURATIONS)[number];

export interface Stats {
  wpm: number;
  rawWpm: number;
  accuracy: number; // 0..100
  correctChars: number;
  incorrectChars: number;
  words: number;
}

export class SprintGame {
  duration: Duration = 30;
  upcoming: string[] = [];
  correctChars = 0;
  incorrectChars = 0;
  wordsTyped = 0;
  startedAt = 0;
  started = false;
  finished = false;
  private weak: Record<string, number> = {};
  store: SprintStore;

  constructor() {
    this.store = loadStore();
    this.refill();
  }

  get current(): string {
    return this.upcoming[0] ?? '';
  }

  get best(): number {
    return this.store.best[String(this.duration)] ?? 0;
  }

  setDuration(d: Duration): void {
    this.duration = d;
  }

  private weightedWord(): string {
    // Words containing recently-mistyped letters are more likely to appear.
    let bestWord = WORDS[0];
    let bestScore = -1;
    for (let i = 0; i < 5; i++) {
      const w = WORDS[Math.floor(Math.random() * WORDS.length)];
      let score = Math.random();
      for (const ch of w) score += (this.weak[ch] ?? 0) * 0.6;
      if (score > bestScore) {
        bestScore = score;
        bestWord = w;
      }
    }
    return bestWord;
  }

  private refill(): void {
    while (this.upcoming.length < 24) this.upcoming.push(this.weightedWord());
  }

  reset(): void {
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.wordsTyped = 0;
    this.started = false;
    this.finished = false;
    this.startedAt = 0;
    this.upcoming = [];
    this.refill();
  }

  begin(now: number): void {
    this.started = true;
    this.startedAt = now;
  }

  elapsedMs(now: number): number {
    return this.started ? now - this.startedAt : 0;
  }

  timeLeft(now: number): number {
    return Math.max(0, this.duration * 1000 - this.elapsedMs(now));
  }

  /** Grade the typed attempt against the current word and advance. */
  submitWord(typed: string): void {
    const w = this.current;
    const len = Math.max(w.length, typed.length);
    for (let i = 0; i < len; i++) {
      if (typed[i] === w[i]) {
        this.correctChars++;
      } else {
        this.incorrectChars++;
        if (w[i]) this.weak[w[i]] = (this.weak[w[i]] ?? 0) + 1;
      }
    }
    this.correctChars++; // the separating space
    this.wordsTyped++;
    this.upcoming.shift();
    this.refill();
  }

  stats(now: number): Stats {
    const minutes = Math.max(this.elapsedMs(now) / 60000, 1 / 60000);
    const total = this.correctChars + this.incorrectChars;
    return {
      wpm: Math.round(this.correctChars / 5 / minutes),
      rawWpm: Math.round(total / 5 / minutes),
      accuracy: total === 0 ? 100 : Math.round((this.correctChars / total) * 100),
      correctChars: this.correctChars,
      incorrectChars: this.incorrectChars,
      words: this.wordsTyped,
    };
  }

  /** The letters you mistyped most, worst first (for end-of-run feedback). */
  weakLetters(limit = 6): { ch: string; count: number }[] {
    return Object.entries(this.weak)
      .filter(([ch]) => /^[a-z]$/i.test(ch))
      .map(([ch, count]) => ({ ch, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /** Finalise; returns final stats and whether a best was set. */
  finish(now: number): { stats: Stats; newBest: boolean } {
    this.finished = true;
    const stats = this.stats(now);
    const key = String(this.duration);
    let newBest = false;
    if (stats.wpm > (this.store.best[key] ?? 0)) {
      this.store.best[key] = stats.wpm;
      newBest = true;
    }
    saveStore(this.store);
    return { stats, newBest };
  }
}
