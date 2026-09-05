// Persistent best scores for Where (one per difficulty).

import { isRecord, storedInt } from '../../shared/stored';

export interface WhereStore {
  bestEasy: number;
  bestHard: number;
}

const KEY = 'where.v1';

export function loadStore(): WhereStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { bestEasy: 0, bestHard: 0 };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { bestEasy: 0, bestHard: 0 };
    return {
      bestEasy: storedInt(parsed.bestEasy),
      // Migrate a legacy single best into the harder pool (the old game drew
      // from every country, which is closest to today's Hard mode).
      bestHard: storedInt(parsed.bestHard, storedInt(parsed.bestScore)),
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
