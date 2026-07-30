// Shared WebAudio primitive: one lazily-created AudioContext + a tone() synth.
// Each game builds its own semantic sound effects on top of tone().

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

export interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
}

export function tone(freq: number, dur = 0.14, opts: ToneOpts = {}): void {
  const c = ac();
  if (!c) return;
  const { type = 'sine', vol = 0.22, attack = 0.01 } = opts;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
