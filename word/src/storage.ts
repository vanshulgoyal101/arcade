// Persistent state for Word of the Day: daily streak + practice best.

export interface DailyRecord {
  streak: number;
  maxStreak: number;
  lastKey: string; // day key of the last completed daily
}

export interface WordStore {
  daily: DailyRecord;
  practiceBest: number;
  learnedIds: string[]; // distinct words whose daily has been completed
}

const KEY = 'word.v1';

function freshDefaults(): WordStore {
  return { daily: { streak: 0, maxStreak: 0, lastKey: '' }, practiceBest: 0, learnedIds: [] };
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function loadStore(): WordStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDefaults();
    // `p.learned` is the legacy numeric field — deliberately dropped in favour of learnedIds.
    const p = JSON.parse(raw) as { daily?: Partial<DailyRecord>; practiceBest?: unknown; learnedIds?: unknown };
    return {
      daily: {
        streak: num(p.daily?.streak),
        maxStreak: num(p.daily?.maxStreak),
        lastKey: typeof p.daily?.lastKey === 'string' ? p.daily.lastKey : '',
      },
      practiceBest: num(p.practiceBest),
      learnedIds: Array.isArray(p.learnedIds) ? p.learnedIds.filter((x): x is string => typeof x === 'string') : [],
    };
  } catch {
    return freshDefaults();
  }
}

export function saveStore(s: WordStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
