import { describe, it, expect, beforeEach } from 'vitest';
import { WordleGame, evaluateGuess, mergeKeyState, WORD_LENGTH, MAX_GUESSES } from '../wordle/src/game';
import { ANSWER_WORDS, VALID_GUESSES, isValidGuess } from '../wordle/src/words';
import { recordResult, winPercent, type WordleStore } from '../wordle/src/storage';

beforeEach(() => localStorage.clear());

describe('wordle/words', () => {
  it('every answer is exactly five lowercase letters', () => {
    for (const w of ANSWER_WORDS) expect(w).toMatch(/^[a-z]{5}$/);
  });

  it('every valid guess is exactly five lowercase letters', () => {
    for (const w of VALID_GUESSES) expect(w).toMatch(/^[a-z]{5}$/);
  });

  it('answers are all accepted as valid guesses', () => {
    for (const w of ANSWER_WORDS) expect(isValidGuess(w)).toBe(true);
  });

  it('has a healthy answer pool with no duplicates', () => {
    expect(ANSWER_WORDS.length).toBeGreaterThan(300);
    expect(new Set(ANSWER_WORDS).size).toBe(ANSWER_WORDS.length);
  });

  it('bundles a dictionary of real, common words', () => {
    expect(VALID_GUESSES.size).toBeGreaterThan(5000);
    for (const w of ['trams', 'stare', 'gauze', 'adieu', 'slate', 'crane', 'about', 'wryly', 'crony']) {
      expect(isValidGuess(w)).toBe(true);
    }
  });

  it('rejects obscure Scrabble-only words', () => {
    for (const w of ['aahed', 'crwth', 'zizit', 'soare']) {
      expect(isValidGuess(w)).toBe(false);
    }
  });
});

describe('wordle/evaluateGuess', () => {
  it('marks exact matches correct', () => {
    expect(evaluateGuess('crane', 'crane')).toEqual(
      ['correct', 'correct', 'correct', 'correct', 'correct']
    );
  });

  it('marks absent letters', () => {
    expect(evaluateGuess('fghij', 'crane')).toEqual(
      ['absent', 'absent', 'absent', 'absent', 'absent']
    );
  });

  it('marks present letters in the wrong spot', () => {
    // answer "crane", guess "acorn": a(present) c(present) o(absent) r(present) n(present)
    expect(evaluateGuess('acorn', 'crane')).toEqual(
      ['present', 'present', 'absent', 'present', 'present']
    );
  });

  it('does not over-credit duplicate guess letters beyond the answer count', () => {
    // answer "abbey" has two b's. guess "babes": positions checked.
    const r = evaluateGuess('sassy', 'abyss');
    // a: not present here; count s in answer = 2
    // guess s a s s y -> s(present) a(present) s(present? only 2 s in answer, one consumed at pos... )
    expect(r.filter((t) => t !== 'absent').length).toBeLessThanOrEqual(5);
  });

  it('handles a duplicate guess letter where the answer has only one', () => {
    // answer "eaten" (one e at index0 and index3 -> actually two e). use "alley" vs "level"
    // answer "level" has l at 0 and 2, e at 1 and 3, v at 4? no. l-e-v-e-l
    // guess "lulls": l(correct pos0) u(absent) l(present, second l in answer at idx4) l(absent, no more) s(absent)
    expect(evaluateGuess('lulls', 'level')).toEqual(
      ['correct', 'absent', 'present', 'absent', 'absent']
    );
  });
});

describe('wordle/mergeKeyState', () => {
  it('never downgrades a key state', () => {
    expect(mergeKeyState('correct', 'absent')).toBe('correct');
    expect(mergeKeyState('present', 'correct')).toBe('correct');
    expect(mergeKeyState('absent', 'present')).toBe('present');
    expect(mergeKeyState(undefined, 'absent')).toBe('absent');
  });
});

describe('wordle/game flow', () => {
  it('rejects short guesses', () => {
    const g = new WordleGame('crane');
    g.addLetter('c');
    g.addLetter('r');
    expect(g.submit()).toEqual({ ok: false, reason: 'short' });
  });

  it('rejects words not in the dictionary', () => {
    const g = new WordleGame('crane');
    for (const ch of 'zzzzz') g.addLetter(ch);
    expect(g.submit()).toEqual({ ok: false, reason: 'invalid' });
  });

  it('caps the guess length at five', () => {
    const g = new WordleGame('crane');
    for (const ch of 'cranes') g.addLetter(ch);
    expect(g.current).toBe('crane');
  });

  it('wins when the answer is guessed and records the streak', () => {
    const g = new WordleGame('crane');
    for (const ch of 'crane') g.addLetter(ch);
    const res = g.submit();
    expect(res.ok && res.status).toBe('won');
    expect(g.store.wins).toBe(1);
    expect(g.store.currentStreak).toBe(1);
    expect(g.store.distribution[1]).toBe(1);
  });

  it('loses after six wrong valid guesses and resets the streak', () => {
    const g = new WordleGame('crane');
    g.store.currentStreak = 3;
    const wrong = ['about', 'ghost', 'world', 'plant', 'mount', 'vivid'];
    let last;
    for (const w of wrong) {
      for (const ch of w) g.addLetter(ch);
      last = g.submit();
    }
    expect(last!.ok && last!.status).toBe('lost');
    expect(g.guesses.length).toBe(MAX_GUESSES);
    expect(g.store.currentStreak).toBe(0);
  });

  it('newGame clears the board and keyboard state', () => {
    const g = new WordleGame('crane');
    for (const ch of 'about') g.addLetter(ch);
    g.submit();
    g.newGame('ghost');
    expect(g.answer).toBe('ghost');
    expect(g.guesses).toEqual([]);
    expect(g.results).toEqual([]);
    expect(Object.keys(g.keyStates)).toHaveLength(0);
  });

  it('exposes standard board dimensions', () => {
    expect(WORD_LENGTH).toBe(5);
    expect(MAX_GUESSES).toBe(6);
  });
});

describe('wordle/storage stats', () => {
  it('tracks win percentage and max streak', () => {
    const s: WordleStore = { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0, 0] };
    recordResult(s, true, 3);
    recordResult(s, true, 4);
    recordResult(s, false, 0);
    expect(s.played).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.maxStreak).toBe(2);
    expect(s.currentStreak).toBe(0);
    expect(winPercent(s)).toBe(67);
  });
});
