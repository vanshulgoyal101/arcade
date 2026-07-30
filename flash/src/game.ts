// Adaptive speed-reading logic: comprehension drives the next target WPM.

import { PASSAGES, type Passage } from './content';
import { loadStore, saveStore, type FlashStore } from './storage';
import { wordCount } from './rsvp';

export const MIN_WPM = 150;
export const MAX_WPM = 900;

export interface RoundResult {
  comprehension: number; // 0..1
  correct: number;
  total: number;
  wpm: number; // speed the passage was read at
  effectiveWpm: number; // wpm * comprehension
  words: number;
  delta: number; // change applied to target wpm
  newWpm: number;
  streak: number;
  newBest: boolean;
}

export class FlashGame {
  store: FlashStore;
  streak = 0;
  private lastPassageId = '';

  constructor() {
    this.store = loadStore();
    this.store.wpm = this.clamp(this.store.wpm);
  }

  private clamp(w: number): number {
    return Math.max(MIN_WPM, Math.min(MAX_WPM, Math.round(w / 5) * 5));
  }

  get wpm(): number {
    return this.store.wpm;
  }

  setWpm(w: number): void {
    this.store.wpm = this.clamp(w);
    saveStore(this.store);
  }

  get lifetimeComprehension(): number {
    return this.store.comprehensionCount === 0
      ? 0
      : this.store.comprehensionSum / this.store.comprehensionCount;
  }

  /** Pick a passage, avoiding an immediate repeat. */
  nextPassage(): Passage {
    const pool = PASSAGES.filter((p) => p.id !== this.lastPassageId);
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.lastPassageId = chosen.id;
    return chosen;
  }

  /** Grade a finished passage and adapt the target speed. */
  finishRound(passage: Passage, answers: number[]): RoundResult {
    const total = passage.questions.length;
    let correct = 0;
    passage.questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct++;
    });
    const comprehension = total === 0 ? 1 : correct / total;
    const readWpm = this.store.wpm;
    const words = wordCount(passage.text);

    // Adapt: reward comprehension with speed, ease off when it drops.
    let delta: number;
    if (comprehension >= 0.85) delta = 25;
    else if (comprehension >= 0.6) delta = 10;
    else if (comprehension >= 0.4) delta = -15;
    else delta = -30;

    const newWpm = this.clamp(readWpm + delta);

    // Streak counts consecutive rounds with solid comprehension.
    if (comprehension >= 0.6) this.streak += 1;
    else this.streak = 0;

    const passedWell = comprehension >= 0.85;
    const newBest = passedWell && readWpm > this.store.bestWpm;

    // Persist progress.
    this.store.wpm = newWpm;
    this.store.passagesDone += 1;
    this.store.wordsRead += words;
    this.store.comprehensionSum += comprehension;
    this.store.comprehensionCount += 1;
    if (newBest) this.store.bestWpm = readWpm;
    if (this.streak > this.store.bestStreak) this.store.bestStreak = this.streak;
    saveStore(this.store);

    return {
      comprehension,
      correct,
      total,
      wpm: readWpm,
      effectiveWpm: Math.round(readWpm * comprehension),
      words,
      delta,
      newWpm,
      streak: this.streak,
      newBest,
    };
  }
}
