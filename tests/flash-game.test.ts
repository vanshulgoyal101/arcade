import { describe, it, expect, beforeEach } from 'vitest';
import { FlashGame, MIN_WPM, MAX_WPM } from '../flash/src/game';
import { PASSAGES } from '../flash/src/content';

beforeEach(() => localStorage.clear());

describe('flash/game adaptation', () => {
  it('clamps the target speed within [MIN_WPM, MAX_WPM]', () => {
    const g = new FlashGame();
    g.setWpm(50);
    expect(g.wpm).toBe(MIN_WPM);
    g.setWpm(5000);
    expect(g.wpm).toBe(MAX_WPM);
  });

  it('full comprehension speeds you up; zero slows you down', () => {
    const passage = PASSAGES[0];

    const up = new FlashGame();
    up.setWpm(300);
    const perfect = passage.questions.map((q) => q.answer);
    const rUp = up.finishRound(passage, perfect);
    expect(rUp.comprehension).toBe(1);
    expect(rUp.newWpm).toBeGreaterThan(300);

    const down = new FlashGame();
    down.setWpm(300);
    const wrong = passage.questions.map((q) => (q.answer + 1) % q.options.length);
    const rDown = down.finishRound(passage, wrong);
    expect(rDown.comprehension).toBe(0);
    expect(rDown.newWpm).toBeLessThan(300);
  });

  it('effectiveWpm is speed weighted by comprehension', () => {
    const g = new FlashGame();
    g.setWpm(400);
    const passage = PASSAGES[0];
    const perfect = passage.questions.map((q) => q.answer);
    const r = g.finishRound(passage, perfect);
    expect(r.effectiveWpm).toBe(Math.round(r.wpm * r.comprehension));
  });

  it('sets a new best only when passing well above the stored best', () => {
    const g = new FlashGame();
    g.setWpm(400);
    const passage = PASSAGES[0];
    const perfect = passage.questions.map((q) => q.answer);
    expect(g.finishRound(passage, perfect).newBest).toBe(true);
  });
});
