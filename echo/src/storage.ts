// Persistent best scores per Echo configuration.

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
    const parsed = JSON.parse(raw) as Partial<EchoStore>;
    return { best: parsed.best ?? {}, muted: parsed.muted ?? false };
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
