// RSVP engine: flashes words one at a time with an Optimal Recognition Point
// (the pivot letter kept fixed in the centre, Spritz-style).

export interface Token {
  raw: string;
  left: string;
  pivot: string;
  right: string;
  delayFactor: number; // multiplies the base per-word time
}

/** Which letter to centre on, based on word length. */
function pivotIndex(word: string): number {
  const len = word.replace(/[^\p{L}\p{N}]/gu, '').length || word.length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

function delayFactor(word: string): number {
  let f = 1;
  // Longer words need a little more dwell time.
  if (word.length > 8) f += (word.length - 8) * 0.04;
  // Pauses at punctuation help comprehension.
  if (/[,;:\u2014\u2013)]$/.test(word)) f *= 1.5;
  if (/[.!?\u2026]$/.test(word)) f *= 2.2;
  return Math.min(f, 3);
}

export function tokenize(text: string): Token[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((raw) => {
      const p = pivotIndex(raw);
      return {
        raw,
        left: raw.slice(0, p),
        pivot: raw.slice(p, p + 1),
        right: raw.slice(p + 1),
        delayFactor: delayFactor(raw),
      };
    });
}

export function wordCount(text: string): number {
  return tokenize(text).length;
}

type RenderFn = (token: Token, index: number, total: number) => void;

export class RsvpPlayer {
  private tokens: Token[];
  private wpm: number;
  private render: RenderFn;
  private onDone: () => void;

  private index = 0;
  private timer = 0;
  private running = false;

  constructor(text: string, wpm: number, render: RenderFn, onDone: () => void) {
    this.tokens = tokenize(text);
    this.wpm = wpm;
    this.render = render;
    this.onDone = onDone;
  }

  get total(): number {
    return this.tokens.length;
  }
  get current(): number {
    return this.index;
  }
  get isRunning(): boolean {
    return this.running;
  }

  setWpm(wpm: number): void {
    this.wpm = wpm;
  }

  private baseMs(): number {
    return 60000 / this.wpm;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.step();
  }

  pause(): void {
    this.running = false;
    clearTimeout(this.timer);
  }

  resume(): void {
    if (this.running || this.index >= this.tokens.length) return;
    this.running = true;
    this.step();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.timer);
  }

  private step = (): void => {
    if (!this.running) return;
    if (this.index >= this.tokens.length) {
      this.running = false;
      this.onDone();
      return;
    }
    const token = this.tokens[this.index];
    this.render(token, this.index, this.tokens.length);
    const ms = this.baseMs() * token.delayFactor;
    this.index += 1;
    this.timer = window.setTimeout(this.step, ms);
  };
}
