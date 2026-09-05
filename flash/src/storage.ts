// Persistent progress for Flash.

import { isRecord, storedInt, storedNumber } from '../../shared/stored';

export interface FlashStore {
  wpm: number; // current target speed
  bestWpm: number; // best speed passed with good comprehension
  passagesDone: number;
  wordsRead: number;
  bestStreak: number;
  comprehensionSum: number; // running totals for lifetime average
  comprehensionCount: number;
}

const KEY = 'flash.v1';

const DEFAULT: FlashStore = {
  wpm: 300,
  bestWpm: 0,
  passagesDone: 0,
  wordsRead: 0,
  bestStreak: 0,
  comprehensionSum: 0,
  comprehensionCount: 0,
};

export function loadStore(): FlashStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT };
    return {
      wpm: storedInt(parsed.wpm, DEFAULT.wpm),
      bestWpm: storedInt(parsed.bestWpm),
      passagesDone: storedInt(parsed.passagesDone),
      wordsRead: storedInt(parsed.wordsRead),
      bestStreak: storedInt(parsed.bestStreak),
      comprehensionSum: storedNumber(parsed.comprehensionSum),
      comprehensionCount: storedInt(parsed.comprehensionCount),
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveStore(s: FlashStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
