import { describe, it, expect, vi } from 'vitest';
import { mountGame, pointerdown, text, gameEnv } from './helpers/dom';
import { COUNTRIES } from '../where/src/content';

vi.mock('../shared/cloud', () => ({
  submitScore: vi.fn(),
  getRank: vi.fn().mockResolvedValue(null),
  mountRank: vi.fn(),
  cloudReady: vi.fn().mockResolvedValue(undefined),
  cloudProfile: () => null,
  cloudAvatarImage: () => null,
  isSignedIn: () => false,
  signIn: vi.fn(),
  restoreGame: vi.fn().mockResolvedValue(false),
}));

const load = () => mountGame(() => import('../where/src/main.ts'));

const lives = (app: HTMLElement): number => {
  const label = app.querySelector('#lives [aria-label]')?.getAttribute('aria-label') || '';
  return Number(label.match(/^\d+/)?.[0] || 0);
};

const pickWrong = (app: HTMLElement): void => {
  const src = app.querySelector<HTMLImageElement>('#prompt img')!.src;
  const code = src.match(/\/([a-z]{2})\.png/)![1].toUpperCase();
  const answer = COUNTRIES.find((c) => c.code === code)!.name;
  const wrong = [...app.querySelectorAll<HTMLButtonElement>('#options .opt')]
    .find((b) => b.dataset.name !== answer)!;
  pointerdown(wrong);
};

describe('where/dom', () => {
  gameEnv();

  it('boots with four options and a HUD', async () => {
    const app = await load();
    expect(app.querySelectorAll('#options .opt').length).toBe(4);
    expect(app.querySelector('#score')).not.toBeNull();
    expect(app.querySelector('#lives')).not.toBeNull();
  });

  it('locks input after the first answer (no double grading)', async () => {
    const app = await load();
    const opts = app.querySelectorAll<HTMLButtonElement>('#options .opt');
    pointerdown(opts[0]);
    const score = text(app.querySelector('#score'));
    const lives = text(app.querySelector('#lives'));
    pointerdown(opts[1]); // second answer must be ignored
    expect(text(app.querySelector('#score'))).toBe(score);
    expect(text(app.querySelector('#lives'))).toBe(lives);
  });

  it('always highlights exactly one correct option per round', async () => {
    const app = await load();
    const opts = app.querySelectorAll<HTMLButtonElement>('#options .opt');
    pointerdown(opts[0]);
    expect(app.querySelectorAll('#options .opt.correct').length).toBe(1);
  });

  it('accepts native keyboard activation of an answer exactly once', async () => {
    const app = await load();
    const option = app.querySelector<HTMLButtonElement>('#options .opt')!;
    option.click();
    expect(app.querySelectorAll('#options .opt.correct')).toHaveLength(1);
    expect(app.querySelector('#options')!.classList.contains('locked')).toBe(true);
    const score = text(app.querySelector('#score'));
    const remaining = lives(app);
    option.click();
    expect(text(app.querySelector('#score'))).toBe(score);
    expect(lives(app)).toBe(remaining);
  });

  it('does not answer on a secondary pointer press', async () => {
    const app = await load();
    app.querySelector('#options .opt')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
    expect(app.querySelector('#options')!.classList.contains('locked')).toBe(false);
    expect(app.querySelectorAll('#options .opt.correct')).toHaveLength(0);
    expect(lives(app)).toBe(3);
  });

  it('locks the difficulty toggle once a run is underway', async () => {
    const app = await load();
    const diffBtns = app.querySelectorAll<HTMLButtonElement>('#diffToggle button');
    expect([...diffBtns].every((b) => !b.disabled)).toBe(true);
    pointerdown(app.querySelector<HTMLButtonElement>('#options .opt')!);
    expect([...diffBtns].every((b) => b.disabled)).toBe(true);
  });

  it('does not let a previous mode open game-over over a fresh run', async () => {
    const app = await load();
    for (let remaining = 3; remaining > 0; remaining--) {
      pickWrong(app);
      expect(lives(app)).toBe(remaining - 1);
      if (remaining > 1) await vi.advanceTimersByTimeAsync(900);
    }

    // Switch modes during the final answer's 750ms game-over delay.
    app.querySelector<HTMLButtonElement>('#modeToggle [data-mode="capital"]')!.click();
    expect(lives(app)).toBe(3); // fresh run started
    await vi.advanceTimersByTimeAsync(1000);

    expect(app.querySelector('#overlay')!.classList.contains('show')).toBe(false);
    expect(lives(app)).toBe(3);
  });
});
