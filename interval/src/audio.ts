// WebAudio note synth + feedback cues for Interval.

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

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** A soft plucked note starting at `when` seconds from now. */
function emit(freq: number, when: number, dur: number, vol: number, c: AudioContext): void {
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc2.type = 'sine';
  osc.frequency.value = freq;
  osc2.frequency.value = freq * 2;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc2.start(t);
  osc.stop(t + dur + 0.03);
  osc2.stop(t + dur + 0.03);
}

function note(freq: number, when: number, dur: number, vol = 0.28): void {
  const c = ac();
  if (!c) return;
  // Defer the first note until the context is actually running.
  if (c.state === 'suspended') {
    void c.resume().then(() => emit(freq, when, dur, vol, c)).catch(() => {});
    return;
  }
  emit(freq, when, dur, vol, c);
}

/** Play the root then the interval note, ascending. */
export function playInterval(rootMidi: number, semis: number): void {
  note(midiToFreq(rootMidi), 0, 0.62);
  note(midiToFreq(rootMidi + semis), 0.66, 0.7);
}

export function correct(): void {
  note(midiToFreq(72), 0, 0.16, 0.22);
  note(midiToFreq(76), 0.08, 0.2, 0.18);
}
export function wrong(): void {
  note(150, 0, 0.24, 0.16);
  note(120, 0.02, 0.28, 0.1);
}
export function gameOver(): void {
  [67, 64, 60, 55].forEach((m, i) => note(midiToFreq(m), i * 0.14, 0.24, 0.2));
}
