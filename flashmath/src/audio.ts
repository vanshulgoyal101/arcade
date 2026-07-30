// WebAudio SFX for Flashmath. Lazily created, no-op when muted.

let ctx: AudioContext | null = null;
let muted = false;

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

function tone(freq: number, dur: number, type: OscillatorType, vol: number): void {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function correct(combo: number): void {
  const base = 523.25;
  const semis = Math.min(combo, 12);
  tone(base * Math.pow(2, semis / 12), 0.14, 'triangle', 0.22);
}
export function wrong(): void {
  tone(150, 0.22, 'sawtooth', 0.18);
  tone(110, 0.26, 'square', 0.1);
}
export function levelUp(): void {
  [523.25, 659.25, 783.99].forEach((f, i) =>
    setTimeout(() => tone(f, 0.14, 'triangle', 0.18), i * 60)
  );
}
export function gameOver(): void {
  [392, 329.63, 261.63, 196].forEach((f, i) =>
    setTimeout(() => tone(f, 0.22, 'sine', 0.2), i * 110)
  );
}
