// Persistent best score for Where.

export interface WhereStore {
  bestScore: number;
}

const KEY = 'where.v1';

export function loadStore(): WhereStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { bestScore: 0 };
    const parsed = JSON.parse(raw) as Partial<WhereStore>;
    return { bestScore: parsed.bestScore ?? 0 };
  } catch {
    return { bestScore: 0 };
  }
}

export function saveStore(s: WhereStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
