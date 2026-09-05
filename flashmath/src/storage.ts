// Persistent high scores for Flashmath.

import { isRecord, storedBoolean, storedInt } from '../../shared/stored';

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
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT };
    return {
      bestScore: storedInt(parsed.bestScore),
      bestSolved: storedInt(parsed.bestSolved),
      muted: storedBoolean(parsed.muted),
    };
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
