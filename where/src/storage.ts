// Persistent best scores for Where (one per difficulty).

export interface WhereStore {
  bestEasy: number;
  bestHard: number;
}

const KEY = 'where.v1';

export function loadStore(): WhereStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { bestEasy: 0, bestHard: 0 };
    const parsed = JSON.parse(raw) as Partial<WhereStore> & { bestScore?: number };
    return {
      bestEasy: parsed.bestEasy ?? 0,
      // Migrate a legacy single best into the harder pool (the old game drew
      // from every country, which is closest to today's Hard mode).
      bestHard: parsed.bestHard ?? parsed.bestScore ?? 0,
    };
  } catch {
    return { bestEasy: 0, bestHard: 0 };
  }
}

export function saveStore(s: WhereStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
