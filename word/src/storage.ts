// Persistent state for Word of the Day: daily streak + practice best.

export interface DailyRecord {
  streak: number;
  maxStreak: number;
  lastKey: string; // day key of the last completed daily
  lastCorrect: boolean;
}

export interface WordStore {
  daily: DailyRecord;
  practiceBest: number;
  learned: number; // distinct days a word was revealed
}

const KEY = 'word.v1';

const DEFAULTS: WordStore = {
  daily: { streak: 0, maxStreak: 0, lastKey: '', lastCorrect: false },
  practiceBest: 0,
  learned: 0,
};

export function loadStore(): WordStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, daily: { ...DEFAULTS.daily } };
    const p = JSON.parse(raw) as Partial<WordStore>;
    return {
      daily: { ...DEFAULTS.daily, ...(p.daily ?? {}) },
      practiceBest: p.practiceBest ?? 0,
      learned: p.learned ?? 0,
    };
  } catch {
    return { ...DEFAULTS, daily: { ...DEFAULTS.daily } };
  }
}

export function saveStore(s: WordStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
