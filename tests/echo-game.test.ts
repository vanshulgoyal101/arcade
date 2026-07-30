import { describe, it, expect, beforeEach } from 'vitest';
import { EchoGame } from '../echo/src/game';
import { configKey } from '../echo/src/storage';

beforeEach(() => localStorage.clear());

describe('echo/game', () => {
  it('forgiving mode has 3 lives, strict mode has 1', () => {
    const g = new EchoGame();
    g.setStrict(false);
    g.reset();
    expect(g.lives).toBe(3);
    g.setStrict(true);
    g.reset();
    expect(g.lives).toBe(1);
  });

  it('repeating a one-step sequence returns "complete"', () => {
    const g = new EchoGame();
    g.setPads(4);
    g.reset();
    g.addStep();
    expect(g.press(g.sequence[0])).toBe('complete');
  });

  it('a wrong press in strict mode ends the run', () => {
    const g = new EchoGame();
    g.setStrict(true);
    g.setPads(4);
    g.reset();
    g.addStep();
    const wrong = (g.sequence[0] + 1) % 4;
    expect(g.press(wrong)).toBe('wrong-over');
  });

  it('a wrong press in forgiving mode costs a life but stays alive', () => {
    const g = new EchoGame();
    g.setStrict(false);
    g.setPads(4);
    g.reset();
    g.addStep();
    const wrong = (g.sequence[0] + 1) % 4;
    expect(g.press(wrong)).toBe('wrong-alive');
    expect(g.lives).toBe(2);
  });

  it('playback speeds up as the sequence grows', () => {
    const g = new EchoGame();
    g.reset();
    g.addStep();
    const early = g.stepDuration();
    for (let i = 0; i < 10; i++) g.addStep();
    expect(g.stepDuration()).toBeLessThan(early);
  });

  it('recordBest stores the reached level per configuration', () => {
    const g = new EchoGame();
    g.setStrict(false);
    g.setPads(4);
    g.reset();
    g.addStep();
    g.addStep();
    expect(g.recordBest()).toBe(true);
    expect(g.store.best[configKey(false, 4)]).toBe(1);
  });
});
