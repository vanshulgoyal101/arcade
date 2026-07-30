// Persistent state: endless best score.

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
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      endlessBest: parsed.endlessBest ?? 0,
      muted: parsed.muted ?? false,
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
