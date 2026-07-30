// Echo SFX built on the shared WebAudio primitive: a musical tone per pad.

import { tone } from '../../shared/audio';

export { setMuted, isMuted } from '../../shared/audio';

// Pentatonic-ish scale so any sequence sounds pleasant. Index = pad.
const PAD_FREQ = [261.63, 329.63, 392.0, 523.25, 440.0, 293.66];

function play(freq: number, dur: number, type: OscillatorType, vol: number): void {
  tone(freq, dur, { type, vol });
}

export function padTone(index: number, dur = 0.32): void {
  play(PAD_FREQ[index % PAD_FREQ.length], dur, 'sine', 0.25);
  play(PAD_FREQ[index % PAD_FREQ.length] * 2, dur * 0.8, 'triangle', 0.06);
}

export function error(): void {
  play(140, 0.35, 'sawtooth', 0.2);
  play(90, 0.4, 'square', 0.12);
}

export function levelUp(): void {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    setTimeout(() => play(f, 0.18, 'triangle', 0.18), i * 60)
  );
}

export function gameOver(): void {
  [440, 349.23, 261.63, 174.61].forEach((f, i) =>
    setTimeout(() => play(f, 0.24, 'sine', 0.2), i * 120)
  );
}
