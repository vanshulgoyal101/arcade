import { describe, it, expect, vi } from 'vitest';
import { mountGame, pointerdown, text, gameEnv } from './helpers/dom';

vi.mock('../shared/cloud', () => ({
  submitScore: vi.fn(),
  getRank: vi.fn().mockResolvedValue(null),
  cloudReady: vi.fn().mockResolvedValue(undefined),
  cloudProfile: () => null,
  cloudAvatarImage: () => null,
  isSignedIn: () => false,
  signIn: vi.fn(),
}));

const load = () => mountGame(() => import('../where/src/main.ts'));

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

  it('locks the difficulty toggle once a run is underway', async () => {
    const app = await load();
    const diffBtns = app.querySelectorAll<HTMLButtonElement>('#diffToggle button');
    expect([...diffBtns].every((b) => !b.disabled)).toBe(true);
    pointerdown(app.querySelector<HTMLButtonElement>('#options .opt')!);
    expect([...diffBtns].every((b) => b.disabled)).toBe(true);
  });
});
