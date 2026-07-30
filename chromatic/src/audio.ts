// Chromatic SFX built on the shared WebAudio primitive.

import { tone } from '../../shared/audio';

export { setMuted, isMuted } from '../../shared/audio';

/** Soft click as a slider moves. */
export function tick(): void {
  tone(300, 0.03, { type: 'square', vol: 0.03 });
}

/** Result chime whose pitch rises with accuracy (0..100). */
export function result(accuracy: number): void {
  const semis = Math.round((accuracy / 100) * 24); // up to two octaves
  const base = 261.63; // C4
  tone(base * Math.pow(2, semis / 12), 0.3, { type: 'triangle', vol: 0.22 });
  tone(base * Math.pow(2, (semis + 4) / 12), 0.26, { type: 'sine', vol: 0.1 });
}

export function levelUp(): void {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    setTimeout(() => tone(f, 0.16, { type: 'triangle', vol: 0.2 }), i * 70)
  );
}

export function error(): void {
  tone(150, 0.24, { type: 'sawtooth', vol: 0.18 });
  tone(110, 0.28, { type: 'square', vol: 0.1 });
}

export function gameOver(): void {
  [440, 349.23, 261.63, 174.61].forEach((f, i) =>
    setTimeout(() => tone(f, 0.24, { type: 'sine', vol: 0.2 }), i * 120)
  );
}
