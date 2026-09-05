// Persistent best score for Interval.

import { isRecord, storedBoolean, storedInt } from '../../shared/stored';

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
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT };
    return {
      bestScore: storedInt(parsed.bestScore),
      muted: storedBoolean(parsed.muted),
    };
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
