// Where core: identify a country from its flag or capital.
// Targets are drawn from a shuffled "deck" so every country in the current
// difficulty pool appears once before any repeats. Missed countries are
// re-queued a bit later for light spaced repetition.
// Two pools (easy = famous countries, hard = the rest) each keep their own best.

import { countriesFor, type Country, type Difficulty } from './content';
import { loadStore, saveStore, type WhereStore } from './storage';

export type Mode = 'flag' | 'capital';

const START_LIVES = 3;
const OPTION_COUNT = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class WhereGame {
  mode: Mode = 'flag';
  difficulty: Difficulty = 'easy';
  score = 0;
  lives = START_LIVES;
  streak = 0;
  finished = false;
  target: Country;
  options: Country[] = [];
  private deck: Country[] = [];
  store: WhereStore;

  constructor() {
    this.store = loadStore();
    this.target = this.pool()[0];
  }

  private pool(): Country[] {
    return countriesFor(this.difficulty);
  }

  get best(): number {
    return this.difficulty === 'easy' ? this.store.bestEasy : this.store.bestHard;
  }

  private setBest(v: number): void {
    if (this.difficulty === 'easy') this.store.bestEasy = v;
    else this.store.bestHard = v;
  }

  setMode(m: Mode): void {
    this.mode = m;
  }

  setDifficulty(d: Difficulty): void {
    if (d === this.difficulty) return;
    this.difficulty = d;
    this.deck = []; // refill from the new pool on the next round
  }

  start(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.streak = 0;
    this.finished = false;
    this.deck = [];
    this.nextRound();
  }

  nextRound(): void {
    const all = this.pool();
    // Refill and reshuffle once the deck is exhausted, avoiding an immediate
    // repeat of the country we just showed across the shuffle boundary.
    if (this.deck.length === 0) {
      this.deck = shuffle(all);
      if (this.deck.length > 1 && this.deck[0].code === this.target.code) {
        this.deck.push(this.deck.shift()!);
      }
    }
    this.target = this.deck.shift()!;

    const opts: Country[] = [this.target];
    while (opts.length < OPTION_COUNT && opts.length < all.length) {
      const c = all[Math.floor(Math.random() * all.length)];
      if (!opts.some((o) => o.code === c.code)) opts.push(c);
    }
    this.options = shuffle(opts);
  }

  answer(name: string): { correct: boolean; gameOver: boolean; newBest: boolean } {
    if (name === this.target.name) {
      this.score += 10 + this.streak * 2;
      this.streak += 1;
      return { correct: true, gameOver: false, newBest: false };
    }
    // Re-queue the missed country for a spaced review, far enough ahead that it
    // doesn't feel like an immediate repeat.
    const pos = Math.min(this.deck.length, 12 + Math.floor(Math.random() * 8));
    this.deck.splice(pos, 0, this.target);
    this.streak = 0;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.finished = true;
      const newBest = this.score > this.best;
      if (newBest) {
        this.setBest(this.score);
        saveStore(this.store);
      }
      return { correct: false, gameOver: true, newBest };
    }
    return { correct: false, gameOver: false, newBest: false };
  }
}
