// Runtime validation for localStorage JSON. TypeScript types disappear in the
// browser, so every persisted value still has to earn its type at this boundary.

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function storedNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function storedInt(value: unknown, fallback = 0): number {
  return Math.floor(storedNumber(value, fallback));
}

export function storedBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function storedString(value: unknown, fallback = '', maxLength = 64): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

export function storedStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}

export function storedNumberMap(value: unknown, allowedKeys?: readonly string[]): Record<string, number> {
  if (!isRecord(value)) return {};
  const allowed = allowedKeys ? new Set(allowedKeys) : null;
  const out: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (allowed && !allowed.has(key)) continue;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (typeof item === 'number' && Number.isFinite(item) && item >= 0) out[key] = Math.floor(item);
  }
  return out;
}
