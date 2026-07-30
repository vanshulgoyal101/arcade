// Persistent best wpm per duration for Sprint.

export interface SprintStore {
  best: Record<string, number>; // duration (s) -> best wpm
}

const KEY = 'sprint.v1';

export function loadStore(): SprintStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { best: {} };
    const parsed = JSON.parse(raw) as Partial<SprintStore>;
    return { best: parsed.best ?? {} };
  } catch {
    return { best: {} };
  }
}

export function saveStore(s: SprintStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
