// Digit Span core: recall a growing sequence of digits, forward or reversed.

import { loadStore, saveStore, type DigitStore } from './storage';

export type Mode = 'forward' | 'reverse';

export class DigitGame {
  mode: Mode = 'forward';
  sequence: number[] = [];
  store: DigitStore;

  constructor() {
    this.store = loadStore();
  }

  get level(): number {
    return this.sequence.length;
  }

  get best(): number {
    return this.store.best[this.mode] ?? 0;
  }

  setMode(m: Mode): void {
    this.mode = m;
  }

  reset(): void {
    this.sequence = [];
  }

  addDigit(): void {
    this.sequence.push(Math.floor(Math.random() * 10));
  }

  /** The order the player must reproduce. */
  expected(): number[] {
    return this.mode === 'reverse' ? [...this.sequence].reverse() : this.sequence;
  }

  check(input: number[]): boolean {
    const exp = this.expected();
    if (input.length !== exp.length) return false;
    return exp.every((d, i) => d === input[i]);
  }

  /** How long each digit is shown (ms), easing slightly as it grows. */
  flashDuration(): number {
    return Math.max(450, 800 - this.sequence.length * 15);
  }

  /** Record best for the current mode; returns true if improved. */
  recordBest(): boolean {
    const reached = this.sequence.length - 1; // last fully-recalled length
    if (reached > (this.store.best[this.mode] ?? 0)) {
      this.store.best[this.mode] = reached;
      saveStore(this.store);
      return true;
    }
    return false;
  }
}
