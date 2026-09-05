// Persistent state for Word of the Day: daily streak + practice best.

import { isRecord, storedInt, storedString, storedStrings } from '../../shared/stored';

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

export function loadStore(): WordStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDefaults();
    // `p.learned` is the legacy numeric field — deliberately dropped in favour of learnedIds.
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return freshDefaults();
    const daily = isRecord(parsed.daily) ? parsed.daily : {};
    return {
      daily: {
        streak: storedInt(daily.streak),
        maxStreak: storedInt(daily.maxStreak),
        lastKey: storedString(daily.lastKey, '', 10),
      },
      practiceBest: storedInt(parsed.practiceBest),
      learnedIds: storedStrings(parsed.learnedIds),
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
