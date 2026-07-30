import { describe, it, expect, beforeEach } from 'vitest';
import { IntervalGame, INTERVALS } from '../interval/src/game';

beforeEach(() => localStorage.clear());

function wrongSemis(correct: number): number {
  return INTERVALS.find((iv) => iv.semis !== correct)!.semis;
}

describe('interval/answering', () => {
  it('a correct answer scores and grows the streak', () => {
    const g = new IntervalGame();
    g.start();
    g.current = INTERVALS[3];
    const r = g.answer(INTERVALS[3].semis);
    expect(r.correct).toBe(true);
    expect(r.gameOver).toBe(false);
    expect(g.score).toBeGreaterThan(0);
    expect(g.streak).toBe(1);
  });

  it('wrong answers cost a life and end the run at zero', () => {
    const g = new IntervalGame();
    g.start();
    g.current = INTERVALS[2];
    g.lives = 1;
    const r = g.answer(wrongSemis(INTERVALS[2].semis));
    expect(r.correct).toBe(false);
    expect(r.gameOver).toBe(true);
    expect(g.finished).toBe(true);
  });

  it('newBest is true only when the score strictly beats the stored best', () => {
    const tie = new IntervalGame();
    tie.start();
    tie.current = INTERVALS[0];
    tie.score = 50;
    tie.store.bestScore = 50;
    tie.lives = 1;
    expect(tie.answer(wrongSemis(INTERVALS[0].semis)).newBest).toBe(false);

    const beat = new IntervalGame();
    beat.start();
    beat.current = INTERVALS[0];
    beat.score = 60;
    beat.store.bestScore = 40;
    beat.lives = 1;
    expect(beat.answer(wrongSemis(INTERVALS[0].semis)).newBest).toBe(true);
  });
});
