import { describe, it, expect, vi } from 'vitest';
import { mountGame, click, text, gameEnv } from './helpers/dom';

const load = () => mountGame(() => import('../interval/src/main.ts'));

describe('interval/dom', () => {
  gameEnv();

  it('boots with eight interval options and a play button', async () => {
    const app = await load();
    expect(app.querySelectorAll('#options .opt').length).toBe(8);
    expect(app.querySelector('#play')).not.toBeNull();
  });

  it('formats large best scores without changing stored values', async () => {
    const app = await mountGame(() => import('../interval/src/main.ts'), () => {
      localStorage.setItem('interval.v1', JSON.stringify({ bestScore: 162060, muted: true }));
    });
    expect(text(app.querySelector('#best'))).toBe('162.1k');
    expect(JSON.parse(localStorage.getItem('interval.v1')!).bestScore).toBe(162060);
  });

  it('answering reveals exactly one correct option and locks input', async () => {
    const app = await load();
    const opts = app.querySelectorAll<HTMLButtonElement>('#options .opt');
    click(opts[0]);
    expect(app.querySelectorAll('#options .opt.correct').length).toBe(1);
    expect(app.querySelector('#options')!.classList.contains('locked')).toBe(true);
  });

  it('ignores a second answer in the same round', async () => {
    const app = await load();
    const opts = app.querySelectorAll<HTMLButtonElement>('#options .opt');
    click(opts[0]);
    const lives = text(app.querySelector('#lives'));
    const score = text(app.querySelector('#score'));
    click(opts[1]);
    expect(text(app.querySelector('#lives'))).toBe(lives);
    expect(text(app.querySelector('#score'))).toBe(score);
  });

  it.each(['play', 'replay'])('manual %s replaces pending autoplay', async (button) => {
    const app = await load();
    const audio = await import('../interval/src/audio');
    const play = vi.spyOn(audio, 'playInterval').mockImplementation(() => {});
    try {
      click(app.querySelector('#options .opt')!);
      await vi.advanceTimersByTimeAsync(850);
      click(app.querySelector(`#${button}`)!);
      expect(play).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(250);
      expect(play).toHaveBeenCalledTimes(1);
    } finally {
      play.mockRestore();
    }
  });

  it('cancels pending autoplay when an answer arrives first', async () => {
    const app = await load();
    const audio = await import('../interval/src/audio');
    const play = vi.spyOn(audio, 'playInterval').mockImplementation(() => {});
    try {
      click(app.querySelector('#options .opt')!);
      await vi.advanceTimersByTimeAsync(850);
      click(app.querySelector('#options .opt')!);
      await vi.advanceTimersByTimeAsync(250);
      expect(play).not.toHaveBeenCalled();
    } finally {
      play.mockRestore();
    }
  });

  it('still autoplays an unanswered new round once', async () => {
    const app = await load();
    const audio = await import('../interval/src/audio');
    const play = vi.spyOn(audio, 'playInterval').mockImplementation(() => {});
    try {
      click(app.querySelector('#options .opt')!);
      await vi.advanceTimersByTimeAsync(1100);
      expect(play).toHaveBeenCalledTimes(1);
    } finally {
      play.mockRestore();
    }
  });
});
