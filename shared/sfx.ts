// Reusable, tactile UI sound effects built on the shared tone() primitive.
// Used by the games that don't need bespoke instrument synths (where, word,
// sprint, flash) so their taps feel as alive as the rest of the arcade.

import { tone } from './audio';

export { setMuted, isMuted } from './audio';

// A soft, short tick for neutral taps (tabs, mode toggles, difficulty cards).
export function click(): void {
  tone(880, 0.035, { type: 'triangle', vol: 0.1, attack: 0.005 });
}

// A brighter two-note blip when committing to a choice (selecting an answer).
export function select(): void {
  tone(523.25, 0.06, { type: 'triangle', vol: 0.16, attack: 0.005 });
  tone(783.99, 0.05, { type: 'sine', vol: 0.08 });
}

// Rising pluck; pitch climbs with a streak for a satisfying run.
export function correct(combo = 0): void {
  const base = 523.25; // C5
  const semis = Math.min(combo, 12);
  tone(base * Math.pow(2, semis / 12), 0.16, { type: 'triangle', vol: 0.24 });
  tone(base * Math.pow(2, (semis + 4) / 12), 0.14, { type: 'sine', vol: 0.11 });
}

export function wrong(): void {
  tone(150, 0.22, { type: 'sawtooth', vol: 0.17 });
  tone(110, 0.26, { type: 'square', vol: 0.09 });
}

export function levelUp(): void {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    setTimeout(() => tone(f, 0.16, { type: 'triangle', vol: 0.2 }), i * 70)
  );
}

export function gameOver(): void {
  [392, 329.63, 261.63, 196].forEach((f, i) =>
    setTimeout(() => tone(f, 0.22, { type: 'sine', vol: 0.2 }), i * 110)
  );
}

// Tight blip for a countdown beat.
export function tick(): void {
  tone(660, 0.06, { type: 'sine', vol: 0.14 });
}

// Warm chime for revealing content (e.g. a word of the day).
export function reveal(): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    setTimeout(() => tone(f, 0.2, { type: 'triangle', vol: 0.16 }), i * 80)
  );
}

// Mute preference persisted per game under its own key (schema-independent).
export function loadMuted(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(key: string, v: boolean): void {
  try {
    localStorage.setItem(key, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}
