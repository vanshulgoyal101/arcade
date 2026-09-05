// Persistent state: endless best score.

import { isRecord, storedBoolean, storedInt } from '../../shared/stored';

export interface Store {
  endlessBest: number;
  muted: boolean;
}

const KEY = 'chromatic.v2';

const DEFAULT: Store = {
  endlessBest: 0,
  muted: false,
};

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return structuredClone(DEFAULT);
    return {
      endlessBest: storedInt(parsed.endlessBest),
      muted: storedBoolean(parsed.muted),
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage may be unavailable; game still works in-memory */
  }
}
