// Persistent best span per mode for Digit Span.

export interface DigitStore {
  best: Record<string, number>; // "forward" | "reverse" -> best length
  muted: boolean;
}

const KEY = 'digitspan.v1';

export function loadStore(): DigitStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { best: {}, muted: false };
    const parsed = JSON.parse(raw) as Partial<DigitStore>;
    return { best: parsed.best ?? {}, muted: parsed.muted ?? false };
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
