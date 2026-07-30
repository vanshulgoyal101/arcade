// Hue Hunt SFX built on the shared WebAudio primitive.

import { tone } from '../../shared/audio';

export { setMuted, isMuted } from '../../shared/audio';

export function correct(combo: number): void {
  // Rising pluck; pitch climbs with combo for a satisfying streak feel.
  const base = 523.25; // C5
  const semis = Math.min(combo, 12);
  tone(base * Math.pow(2, semis / 12), 0.16, { type: 'triangle', vol: 0.25 });
  tone(base * Math.pow(2, (semis + 4) / 12), 0.14, { type: 'sine', vol: 0.12 });
}

export function wrong(): void {
  tone(150, 0.22, { type: 'sawtooth', vol: 0.18 });
  tone(110, 0.26, { type: 'square', vol: 0.1 });
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
