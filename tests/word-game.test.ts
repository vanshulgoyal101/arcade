import { beforeEach, describe, expect, it } from 'vitest';
import {
  todayKey,
  yesterdayKey,
  nextDailyStreak,
  dailyWord,
  meaningOptions,
  dailyOptions,
  PracticeGame,
  START_LIVES,
} from '../word/src/game';
import { WORDS } from '../word/src/content';

beforeEach(() => localStorage.clear());

describe('nextDailyStreak', () => {
  const rec = (streak: number, maxStreak: number, lastKey: string) => ({ streak, maxStreak, lastKey });

  it('extends the streak on a correct answer the next day', () => {
    const r = nextDailyStreak(rec(3, 5, 'D1'), true, 'D2', 'D1');
    expect(r).toEqual({ streak: 4, maxStreak: 5, lastKey: 'D2' });
  });

  it('breaks the streak on a wrong answer (but keeps maxStreak and marks the day)', () => {
    const r = nextDailyStreak(rec(4, 6, 'D1'), false, 'D2', 'D1');
    expect(r).toEqual({ streak: 0, maxStreak: 6, lastKey: 'D2' });
  });

  it('starts a fresh streak of 1 after skipping a day', () => {
    expect(nextDailyStreak(rec(9, 9, 'D1'), true, 'D3', 'D2').streak).toBe(1);
  });

  it('raises maxStreak when the streak sets a new high', () => {
    expect(nextDailyStreak(rec(5, 5, 'D1'), true, 'D2', 'D1').maxStreak).toBe(6);
  });

  it('is a no-op when today was already completed', () => {
    expect(nextDailyStreak(rec(4, 6, 'D2'), true, 'D2', 'D1')).toEqual(rec(4, 6, 'D2'));
  });
});

describe('date helpers', () => {
  it('formats todayKey as YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('yesterdayKey is the day before today', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(yesterdayKey()).toBe(todayKey(d));
  });
});

describe('dailyWord', () => {
  it('is deterministic for a given key and drawn from WORDS', () => {
    const a = dailyWord('2026-07-31');
    const b = dailyWord('2026-07-31');
    expect(a).toBe(b);
    expect(WORDS).toContain(a);
  });

  it('varies across different days', () => {
    const keys = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'];
    const words = new Set(keys.map((k) => dailyWord(k).word));
    // Not a strict guarantee, but with 30 words 5 distinct days should differ.
    expect(words.size).toBeGreaterThan(1);
  });
});

describe('meaningOptions', () => {
  it('returns four options with exactly one correct = the word definition', () => {
    const word = WORDS[0];
    const opts = meaningOptions(word, () => 0.5);
    expect(opts).toHaveLength(4);
    const correct = opts.filter((o) => o.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].text).toBe(word.definition);
  });

  it('distractor texts are all distinct from the answer', () => {
    const word = WORDS[0];
    const opts = meaningOptions(word, () => 0.5);
    const wrong = opts.filter((o) => !o.correct).map((o) => o.text);
    expect(wrong).not.toContain(word.definition);
    expect(new Set(wrong).size).toBe(wrong.length);
  });
});

describe('dailyOptions', () => {
  it('is deterministic (stable order) for the same key', () => {
    const a = dailyOptions('2026-07-31').map((o) => o.text);
    const b = dailyOptions('2026-07-31').map((o) => o.text);
    expect(a).toEqual(b);
  });
});

describe('PracticeGame', () => {
  function correctIndexOf(game: PracticeGame): number {
    return game.round.options.findIndex((o) => o.correct);
  }

  it('starts with full lives and a round after reset', () => {
    const game = new PracticeGame(0);
    game.reset();
    expect(game.lives).toBe(START_LIVES);
    expect(game.score).toBe(0);
    expect(game.round.options).toHaveLength(4);
  });

  it('scores and builds a streak on correct answers', () => {
    const game = new PracticeGame(0);
    game.reset();
    const r1 = game.answer(correctIndexOf(game));
    expect(r1.correct).toBe(true);
    expect(game.score).toBe(10); // 10 + streak(0)*2
    expect(game.streak).toBe(1);

    const r2 = game.answer(correctIndexOf(game));
    expect(r2.correct).toBe(true);
    expect(game.score).toBe(10 + 12); // second answer: 10 + streak(1)*2
    expect(game.streak).toBe(2);
  });

  it('loses a life and resets streak on a wrong answer', () => {
    const game = new PracticeGame(0);
    game.reset();
    const wrongIndex = game.round.options.findIndex((o) => !o.correct);
    const res = game.answer(wrongIndex);
    expect(res.correct).toBe(false);
    expect(game.lives).toBe(START_LIVES - 1);
    expect(game.streak).toBe(0);
  });

  it('ends after losing all lives and reports a new best', () => {
    const game = new PracticeGame(0);
    game.reset();
    // Earn some points, then miss until out of lives.
    game.answer(correctIndexOf(game)); // score 10
    let last;
    for (let i = 0; i < START_LIVES; i++) {
      const wrongIndex = game.round.options.findIndex((o) => !o.correct);
      last = game.answer(wrongIndex);
    }
    expect(last!.over).toBe(true);
    expect(last!.newBest).toBe(true);
    expect(game.best).toBe(10);
  });

  it('does not set a new best when score does not beat it', () => {
    const game = new PracticeGame(100);
    game.reset();
    let last;
    for (let i = 0; i < START_LIVES; i++) {
      const wrongIndex = game.round.options.findIndex((o) => !o.correct);
      last = game.answer(wrongIndex);
    }
    expect(last!.over).toBe(true);
    expect(last!.newBest).toBe(false);
    expect(game.best).toBe(100);
  });
});
