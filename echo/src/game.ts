// Echo core: sequence memory with strict/forgiving lives, pad count & speed ramp.

import { configKey, loadStore, saveStore, type EchoStore } from './storage';

export type PressResult = 'ok' | 'complete' | 'wrong-alive' | 'wrong-over';

export class EchoGame {
  strict = false;
  pads = 4;
  sequence: number[] = [];
  inputIndex = 0;
  lives = 3;
  store: EchoStore;

  constructor() {
    this.store = loadStore();
  }

  get level(): number {
    return this.sequence.length;
  }

  get best(): number {
    return this.store.best[configKey(this.strict, this.pads)] ?? 0;
  }

  setStrict(v: boolean): void {
    this.strict = v;
  }
  setPads(n: number): void {
    this.pads = n;
  }

  reset(): void {
    this.sequence = [];
    this.inputIndex = 0;
    this.lives = this.strict ? 1 : 3;
  }

  addStep(): void {
    this.sequence.push(Math.floor(Math.random() * this.pads));
    this.inputIndex = 0;
  }

  /** Playback duration per step shrinks as the sequence grows. */
  stepDuration(): number {
    return Math.max(180, 480 - this.sequence.length * 16);
  }

  gapDuration(): number {
    return Math.max(80, 180 - this.sequence.length * 6);
  }

  press(pad: number): PressResult {
    if (pad === this.sequence[this.inputIndex]) {
      this.inputIndex += 1;
      if (this.inputIndex >= this.sequence.length) return 'complete';
      return 'ok';
    }
    // Wrong input
    this.lives -= 1;
    if (this.lives <= 0) return 'wrong-over';
    this.inputIndex = 0; // replay the same sequence
    return 'wrong-alive';
  }

  /** Record best for the current config; returns true if improved. */
  recordBest(): boolean {
    const reached = this.sequence.length - 1; // last fully-completed level
    const key = configKey(this.strict, this.pads);
    if (reached > (this.store.best[key] ?? 0)) {
      this.store.best[key] = reached;
      saveStore(this.store);
      return true;
    }
    return false;
  }
}
