// Colour math + deterministic RNG for the daily puzzle.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Maximum possible RGB Euclidean distance (black → white). */
export const MAX_DISTANCE = Math.sqrt(3 * 255 * 255);

export function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function distance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Accuracy from 0 (opposite) to 100 (perfect). */
export function accuracy(a: RGB, b: RGB): number {
  return Math.max(0, 100 - (distance(a, b) / MAX_DISTANCE) * 100);
}

export function toHex(c: RGB): string {
  return (
    '#' +
    [c.r, c.g, c.b]
      .map((x) => clamp255(x).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function toCss(c: RGB): string {
  return `rgb(${clamp255(c.r)}, ${clamp255(c.g)}, ${clamp255(c.b)})`;
}

/** Pick a readable text colour (black/white) for a given background. */
export function contrastText(c: RGB): string {
  const luminance = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
  return luminance > 0.55 ? '#10131c' : '#ffffff';
}

// ---- Seeded RNG (mulberry32 + FNV-1a hash) ----

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A pleasant, saturated target colour so matching stays interesting. */
function colourFromRng(rng: () => number): RGB {
  // Bias away from near-greys by keeping decent spread across channels.
  const base = () => Math.floor(rng() * 256);
  let c: RGB = { r: base(), g: base(), b: base() };
  const spread = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  if (spread < 40) {
    // Nudge one channel to add character.
    const ch = ['r', 'g', 'b'][Math.floor(rng() * 3)] as keyof RGB;
    c = { ...c, [ch]: clamp255(c[ch] + (rng() < 0.5 ? 90 : -90)) };
  }
  return c;
}

export function targetFromSeed(seedStr: string): RGB {
  return colourFromRng(mulberry32(hashSeed(seedStr)));
}

export function randomTarget(): RGB {
  return colourFromRng(Math.random);
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yesterdayKey(date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}
