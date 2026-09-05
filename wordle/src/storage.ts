// Persistent Wordle stats (games played, streaks, guess distribution).

import { isRecord, storedInt } from '../../shared/stored';

export interface WordleStore {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Wins bucketed by number of guesses used, index 1..6. Index 0 unused. */
  distribution: number[];
}

const KEY = 'wordle.v1';

function fresh(): WordleStore {
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0, 0] };
}

export function loadStore(): WordleStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fresh();
    const dist = Array.isArray(parsed.distribution) ? parsed.distribution.slice(0, 7) : [];
    while (dist.length < 7) dist.push(0);
    return {
      played: storedInt(parsed.played),
      wins: storedInt(parsed.wins),
      currentStreak: storedInt(parsed.currentStreak),
      maxStreak: storedInt(parsed.maxStreak),
      distribution: dist.map((n) => storedInt(n)),
    };
  } catch {
    return fresh();
  }
}

export function saveStore(s: WordleStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Fold a finished game into the stats. guessCount is 1..6 on a win, else ignored. */
export function recordResult(s: WordleStore, won: boolean, guessCount: number): void {
  s.played += 1;
  if (won) {
    s.wins += 1;
    s.currentStreak += 1;
    if (s.currentStreak > s.maxStreak) s.maxStreak = s.currentStreak;
    if (guessCount >= 1 && guessCount <= 6) s.distribution[guessCount] += 1;
  } else {
    s.currentStreak = 0;
  }
}

export function winPercent(s: WordleStore): number {
  return s.played === 0 ? 0 : Math.round((s.wins / s.played) * 100);
}
