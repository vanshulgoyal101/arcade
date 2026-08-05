// Where core: identify a country from its flag or capital.
// No country repeats within a session: targets are drawn from a shuffled deck
// of countries not yet shown. The chosen difficulty is used first; once its pool
// is exhausted the deck spills into the other pool (easy → hard and vice versa),
// so even a long run stays repeat-free until the whole world has been shown.
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
  private seen = new Set<string>(); // codes shown this session — never repeat
  store: WhereStore;

  constructor() {
    this.store = loadStore();
    this.target = this.pool()[0];
  }

  private pool(): Country[] {
    return countriesFor(this.difficulty);
  }

  // Countries not yet shown this session: the current difficulty's pool first,
  // then the other pool once this one is used up, so a long run never repeats.
  private freshCountries(): Country[] {
    const primary = countriesFor(this.difficulty);
    const secondary = countriesFor(this.difficulty === 'easy' ? 'hard' : 'easy');
    const unseen = (list: Country[]) => list.filter((c) => !this.seen.has(c.code));
    const fromPrimary = unseen(primary);
    if (fromPrimary.length) return fromPrimary;
    const fromSecondary = unseen(secondary);
    if (fromSecondary.length) return fromSecondary;
    // Every country has been shown — unavoidable; start the world over.
    this.seen.clear();
    return primary;
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
    this.seen.clear();
    this.nextRound();
  }

  nextRound(): void {
    // Refill from the unshown countries once the deck runs dry, avoiding an
    // immediate repeat of the country just shown across the refill boundary.
    if (this.deck.length === 0) {
      this.deck = shuffle(this.freshCountries());
      if (this.deck.length > 1 && this.deck[0].code === this.target.code) {
        this.deck.push(this.deck.shift()!);
      }
    }
    this.target = this.deck.shift()!;
    this.seen.add(this.target.code);

    const all = this.pool();
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
    // A missed country is not re-queued — it still won't reappear this session.
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
