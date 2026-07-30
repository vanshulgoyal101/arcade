// WebAudio for Digit Span: a soft tone per flashed digit + feedback cues.

let ctx: AudioContext | null = null;
let muted = false;

// Each digit maps to a note of a C-major scale for a pleasant readback.
const DIGIT_MIDI = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx =
      ctx ??
      new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(v: boolean): void {
  muted = v;
}
export function isMuted(): boolean {
  return muted;
}

function midiToFreq(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number): void {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function digit(n: number): void {
  tone(midiToFreq(DIGIT_MIDI[n % 10]), 0.32, 'sine', 0.24);
}
export function key(): void {
  tone(660, 0.05, 'triangle', 0.12);
}
export function correct(): void {
  [72, 76, 79].forEach((m, i) => setTimeout(() => tone(midiToFreq(m), 0.16, 'triangle', 0.2), i * 70));
}
export function wrong(): void {
  tone(150, 0.28, 'sawtooth', 0.18);
  tone(110, 0.32, 'square', 0.1);
}
