// Persistent progress for Flash.

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
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<FlashStore>) };
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
