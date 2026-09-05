// Persistent best wpm per duration for Sprint.

import { isRecord, storedNumberMap } from '../../shared/stored';

export interface SprintStore {
  best: Record<string, number>; // duration (s) -> best wpm
}

const KEY = 'sprint.v1';

export function loadStore(): SprintStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { best: {} };
    const parsed: unknown = JSON.parse(raw);
    return { best: isRecord(parsed) ? storedNumberMap(parsed.best, ['15', '30', '60']) : {} };
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
