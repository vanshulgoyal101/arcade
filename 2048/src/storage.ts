// Persistent best score + best tile for 2048.

import { isRecord, storedBoolean, storedInt } from '../../shared/stored';

export interface Store {
  best: number;
  bestTile: number;
  muted: boolean;
}

const KEY = '2048.v1';

const DEFAULT: Store = { best: 0, bestTile: 0, muted: false };

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT };
    return {
      best: storedInt(parsed.best),
      bestTile: storedInt(parsed.bestTile),
      muted: storedBoolean(parsed.muted),
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
