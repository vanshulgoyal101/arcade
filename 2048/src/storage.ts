// Persistent best score + best tile for 2048.

export interface Store {
  best: number;
  bestTile: number;
  muted: boolean;
}

const KEY = '2048.v1';

const DEFAULT: Store = { best: 0, bestTile: 0, muted: false };

const num = (v: unknown): number => (typeof v === 'number' && isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      best: num(parsed.best),
      bestTile: num(parsed.bestTile),
      muted: parsed.muted === true,
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveStore(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
