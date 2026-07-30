// Persistent high scores for Flashmath.

export interface MathStore {
  bestScore: number;
  bestSolved: number;
  muted: boolean;
}

const KEY = 'flashmath.v1';
const DEFAULT: MathStore = { bestScore: 0, bestSolved: 0, muted: false };

export function loadStore(): MathStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<MathStore>) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveStore(s: MathStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
