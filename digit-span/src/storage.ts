// Persistent best span per mode for Digit Span.

import { isRecord, storedBoolean, storedNumberMap } from '../../shared/stored';

export interface DigitStore {
  best: Record<string, number>; // "forward" | "reverse" -> best length
  muted: boolean;
}

const KEY = 'digitspan.v1';

export function loadStore(): DigitStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { best: {}, muted: false };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { best: {}, muted: false };
    return {
      best: storedNumberMap(parsed.best, ['forward', 'reverse']),
      muted: storedBoolean(parsed.muted),
    };
  } catch {
    return { best: {}, muted: false };
  }
}

export function saveStore(s: DigitStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
