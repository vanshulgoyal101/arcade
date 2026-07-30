// Persistent best score for Interval.

export interface IntervalStore {
  bestScore: number;
  muted: boolean;
}

const KEY = 'interval.v1';
const DEFAULT: IntervalStore = { bestScore: 0, muted: false };

export function loadStore(): IntervalStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<IntervalStore>) };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveStore(s: IntervalStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
