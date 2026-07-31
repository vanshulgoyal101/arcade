// Where core: identify a country from its flag or capital.
// Missed countries resurface sooner (light spaced repetition).
// Two difficulty pools (easy = famous countries, hard = the rest) each track
// their own best score.

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
  private miss: Record<string, number> = {};
  private recent: string[] = [];
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
    this.difficulty = d;
  }

  start(): void {
    this.score = 0;
    this.lives = START_LIVES;
    this.streak = 0;
    this.finished = false;
    this.recent = [];
    this.miss = {};
    this.nextRound();
  }

  private weightedTarget(): Country {
    const all = this.pool();
    // Skip recently shown countries so questions don't repeat back-to-back.
    const avoid = new Set(this.recent);
    const source = all.filter((c) => !avoid.has(c.name));
    const from = source.length >= OPTION_COUNT ? source : all;
    let best = from[0];
    let bestScore = -1;
    for (let i = 0; i < 6; i++) {
      const c = from[Math.floor(Math.random() * from.length)];
      const s = Math.random() + (this.miss[c.name] ?? 0) * 0.8;
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    return best;
  }

  nextRound(): void {
    const all = this.pool();
    this.target = this.weightedTarget();
    this.recent.push(this.target.name);
    const cap = Math.min(12, Math.floor(all.length / 2));
    while (this.recent.length > cap) this.recent.shift();
    const opts: Country[] = [this.target];
    while (opts.length < OPTION_COUNT) {
      const c = all[Math.floor(Math.random() * all.length)];
      if (!opts.some((o) => o.name === c.name)) opts.push(c);
    }
    this.options = shuffle(opts);
  }

  answer(name: string): { correct: boolean; gameOver: boolean; newBest: boolean } {
    if (name === this.target.name) {
      this.score += 10 + this.streak * 2;
      this.streak += 1;
      return { correct: true, gameOver: false, newBest: false };
    }
    this.miss[this.target.name] = (this.miss[this.target.name] ?? 0) + 1;
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
