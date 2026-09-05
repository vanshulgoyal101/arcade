// Persistent best scores per Echo configuration.

import { isRecord, storedBoolean, storedNumberMap } from '../../shared/stored';

export interface EchoStore {
  // key `${mode}-${pads}` e.g. "strict-4" -> best level reached
  best: Record<string, number>;
  muted: boolean;
}

const KEY = 'echo.v2';

export function configKey(strict: boolean, pads: number): string {
  return `${strict ? 'strict' : 'forgiving'}-${pads}`;
}

export function loadStore(): EchoStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { best: {}, muted: false };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { best: {}, muted: false };
    return {
      best: storedNumberMap(parsed.best, ['strict-4', 'strict-6', 'forgiving-4', 'forgiving-6']),
      muted: storedBoolean(parsed.muted),
    };
  } catch {
    return { best: {}, muted: false };
  }
}

export function saveStore(s: EchoStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
