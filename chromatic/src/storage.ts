// Persistent state: daily streaks + endless best score.

export interface DailyRecord {
  day: string; // todayKey when last played
  bestAccuracy: number; // 0..100 for that day
  done: boolean;
  streak: number;
  lastPlayed: string; // day of last completed daily
  maxStreak: number;
}

export interface Store {
  daily: DailyRecord;
  endlessBest: number;
  muted: boolean;
}

const KEY = 'chromatic.v2';

const DEFAULT: Store = {
  daily: {
    day: '',
    bestAccuracy: 0,
    done: false,
    streak: 0,
    lastPlayed: '',
    maxStreak: 0,
  },
  endlessBest: 0,
  muted: false,
};

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      daily: { ...DEFAULT.daily, ...parsed.daily },
      endlessBest: parsed.endlessBest ?? 0,
      muted: parsed.muted ?? false,
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage may be unavailable; game still works in-memory */
  }
}
