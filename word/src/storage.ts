// Persistent state for Word of the Day: daily streak + practice best.

export interface DailyRecord {
  streak: number;
  maxStreak: number;
  lastKey: string; // day key of the last completed daily
}

export interface WordStore {
  daily: DailyRecord;
  practiceBest: number;
  learnedIds: string[]; // distinct words revealed via the daily
}

const KEY = 'word.v1';

const DEFAULTS: WordStore = {
  daily: { streak: 0, maxStreak: 0, lastKey: '' },
  practiceBest: 0,
  learnedIds: [],
};

export function loadStore(): WordStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { daily: { ...DEFAULTS.daily }, practiceBest: 0, learnedIds: [] };
    const p = JSON.parse(raw) as Partial<WordStore>;
    return {
      daily: {
        streak: p.daily?.streak ?? 0,
        maxStreak: p.daily?.maxStreak ?? 0,
        lastKey: p.daily?.lastKey ?? '',
      },
      practiceBest: p.practiceBest ?? 0,
      learnedIds: Array.isArray(p.learnedIds) ? p.learnedIds : [],
    };
  } catch {
    return { daily: { ...DEFAULTS.daily }, practiceBest: 0, learnedIds: [] };
  }
}

export function saveStore(s: WordStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
