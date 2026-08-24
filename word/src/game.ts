// Word of the Day — pure logic: deterministic daily word, meaning-quiz option
// building, and an endless "practice" quiz with lives and resurfacing misses.

import { WORDS, type Word } from './content';

export type Mode = 'today' | 'practice';

export interface Option {
  text: string;
  correct: boolean;
}

// ---- date helpers ----
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

// ---- daily streak ----
export interface DailyStreak {
  streak: number;
  maxStreak: number;
  lastKey: string;
}

/**
 * Advance the daily-streak record for one day's result. Idempotent per day: if
 * `today` was already completed the record is returned unchanged. A correct
 * answer extends the streak when the previous completion was `yesterday`, else
 * it starts a fresh streak of 1; a wrong answer resets the streak to 0. Always
 * stamps `lastKey` = today and preserves the all-time `maxStreak`.
 */
export function nextDailyStreak(
  record: DailyStreak,
  correct: boolean,
  today: string = todayKey(),
  yesterday: string = yesterdayKey()
): DailyStreak {
  if (record.lastKey === today) return record;
  const streak = correct ? (record.lastKey === yesterday ? record.streak + 1 : 1) : 0;
  return { streak, maxStreak: Math.max(record.maxStreak, streak), lastKey: today };
}

// ---- seeded RNG (FNV-1a -> mulberry32) so the daily word is stable per date ----
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailyWord(key: string = todayKey()): Word {
  return WORDS[hashSeed('word-' + key) % WORDS.length];
}

// ---- meaning-quiz options ----
function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Four definitions: the word's own plus three distinct distractors. */
export function meaningOptions(word: Word, rnd: () => number = Math.random): Option[] {
  const distractors = shuffle(
    WORDS.filter((w) => w.word !== word.word),
    rnd
  )
    .slice(0, 3)
    .map((w) => ({ text: w.definition, correct: false }));
  return shuffle([{ text: word.definition, correct: true }, ...distractors], rnd);
}

/** Deterministic options for the daily word so they don't reshuffle on reload. */
export function dailyOptions(key: string = todayKey()): Option[] {
  return meaningOptions(dailyWord(key), mulberry32(hashSeed('opts-' + key)));
}

// ---- practice mode: endless meaning quiz ----
export interface Round {
  word: Word;
  options: Option[];
}

export interface AnswerResult {
  correct: boolean;
  correctIndex: number;
  over: boolean;
  newBest: boolean;
}

export const START_LIVES = 3;

export class PracticeGame {
  score = 0;
  lives = START_LIVES;
  streak = 0;
  best: number;
  round!: Round;

  private queue: Word[] = [];
  private lastWord = '';

  constructor(best: number) {
    this.best = best;
  }

  reset(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.streak = 0;
    this.queue = [];
    this.lastWord = '';
    this.next();
  }

  private pickWord(): Word {
    if (this.queue.length) return this.queue.shift()!;
    let w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (WORDS.length > 1) {
      while (w.word === this.lastWord) w = WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    return w;
  }

  next(): void {
    const word = this.pickWord();
    this.lastWord = word.word;
    this.round = { word, options: meaningOptions(word) };
  }

  answer(index: number): AnswerResult {
    const opt = this.round.options[index];
    const correctIndex = this.round.options.findIndex((o) => o.correct);
    let newBest = false;

    if (opt?.correct) {
      this.score += 10 + this.streak * 2;
      this.streak += 1;
    } else {
      this.lives -= 1;
      this.streak = 0;
      // resurface the missed word soon so it gets practised again
      this.queue.push(this.round.word);
    }

    const over = this.lives <= 0;
    if (over && this.score > this.best) {
      this.best = this.score;
      newBest = true;
    }
    return { correct: !!opt?.correct, correctIndex, over, newBest };
  }
}
