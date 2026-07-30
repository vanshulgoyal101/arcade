// Wordle core logic — pure and DOM-free so it can be unit tested.
// Evaluation matches the official rules, including duplicate-letter handling:
// exact matches are resolved first, then remaining letters are matched to the
// pool of un-consumed answer letters, so surplus copies show as absent.

import { ANSWER_WORDS, isValidGuess, randomAnswer } from './words';
import { loadStore, saveStore, recordResult, type WordleStore } from './storage';

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export type Tile = 'correct' | 'present' | 'absent';
export type Status = 'playing' | 'won' | 'lost';

export type SubmitResult =
  | { ok: false; reason: 'short' | 'invalid' }
  | { ok: true; result: Tile[]; status: Status; row: number; newRecord: boolean };

/** Score a guess against an answer, honouring duplicate letters correctly. */
export function evaluateGuess(guess: string, answer: string): Tile[] {
  const g = guess.toLowerCase();
  const a = answer.toLowerCase();
  const tiles: Tile[] = new Array(WORD_LENGTH).fill('absent');
  const counts: Record<string, number> = {};

  for (const ch of a) counts[ch] = (counts[ch] ?? 0) + 1;

  // Pass 1: exact position matches consume a letter from the pool.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === a[i]) {
      tiles[i] = 'correct';
      counts[g[i]]--;
    }
  }
  // Pass 2: present-but-misplaced only if an unconsumed copy remains.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (tiles[i] === 'correct') continue;
    const ch = g[i];
    if ((counts[ch] ?? 0) > 0) {
      tiles[i] = 'present';
      counts[ch]--;
    }
  }
  return tiles;
}

const RANK: Record<Tile, number> = { absent: 0, present: 1, correct: 2 };

/** Merge a new tile status into the keyboard state, never downgrading. */
export function mergeKeyState(prev: Tile | undefined, next: Tile): Tile {
  if (prev === undefined) return next;
  return RANK[next] > RANK[prev] ? next : prev;
}

export class WordleGame {
  answer: string;
  guesses: string[] = [];
  results: Tile[][] = [];
  current = '';
  status: Status = 'playing';
  keyStates: Record<string, Tile> = {};
  store: WordleStore;

  constructor(answer?: string) {
    this.store = loadStore();
    this.answer = (answer ?? randomAnswer()).toLowerCase();
  }

  get best(): number {
    return this.store.maxStreak;
  }

  newGame(answer?: string): void {
    this.answer = (answer ?? randomAnswer()).toLowerCase();
    this.guesses = [];
    this.results = [];
    this.current = '';
    this.status = 'playing';
    this.keyStates = {};
  }

  addLetter(ch: string): boolean {
    if (this.status !== 'playing') return false;
    if (this.current.length >= WORD_LENGTH) return false;
    if (!/^[a-zA-Z]$/.test(ch)) return false;
    this.current += ch.toLowerCase();
    return true;
  }

  removeLetter(): boolean {
    if (this.status !== 'playing') return false;
    if (this.current.length === 0) return false;
    this.current = this.current.slice(0, -1);
    return true;
  }

  submit(): SubmitResult {
    if (this.status !== 'playing') return { ok: false, reason: 'invalid' };
    if (this.current.length < WORD_LENGTH) return { ok: false, reason: 'short' };
    if (!isValidGuess(this.current)) return { ok: false, reason: 'invalid' };

    const guess = this.current;
    const result = evaluateGuess(guess, this.answer);
    const row = this.guesses.length;
    this.guesses.push(guess);
    this.results.push(result);
    for (let i = 0; i < WORD_LENGTH; i++) {
      const ch = guess[i];
      this.keyStates[ch] = mergeKeyState(this.keyStates[ch], result[i]);
    }
    this.current = '';

    let newRecord = false;
    if (guess === this.answer) {
      this.status = 'won';
      newRecord = this.finish(true, this.guesses.length);
    } else if (this.guesses.length >= MAX_GUESSES) {
      this.status = 'lost';
      newRecord = this.finish(false, 0);
    }
    return { ok: true, result, status: this.status, row, newRecord };
  }

  private finish(won: boolean, guessCount: number): boolean {
    const prevMax = this.store.maxStreak;
    recordResult(this.store, won, guessCount);
    saveStore(this.store);
    return won && this.store.maxStreak > prevMax;
  }
}

export { ANSWER_WORDS };
