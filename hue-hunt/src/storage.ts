// Persistent high scores for Hue Hunt.

import { isRecord, storedBoolean, storedInt } from '../../shared/stored';

export interface HueStore {
  bestScore: number;
  bestLevel: number;
  muted: boolean;
}

const KEY = 'huehunt.v2';

const DEFAULT: HueStore = { bestScore: 0, bestLevel: 0, muted: false };

export function loadStore(): HueStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT };
    return {
      bestScore: storedInt(parsed.bestScore),
      bestLevel: storedInt(parsed.bestLevel),
      muted: storedBoolean(parsed.muted),
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveStore(s: HueStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
