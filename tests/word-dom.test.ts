import { describe, it, expect, afterEach, vi } from 'vitest';
import { mountGame, pointerdown, gameEnv } from './helpers/dom';
import { dailyOptions, todayKey } from '../word/src/game';
import { WORDS } from '../word/src/content';

// Word's main.ts imports shared/cloud (submitScore/getRank). Stub it so no
// network runs and we can assert the streak backup fires.
const submitScore = vi.fn();
vi.mock('../shared/cloud', () => ({
  submitScore,
  getRank: vi.fn().mockResolvedValue(null),
  mountRank: vi.fn(),
  cloudReady: vi.fn().mockResolvedValue(undefined),
  cloudProfile: () => null,
  cloudAvatarImage: () => null,
  isSignedIn: () => false,
  signIn: vi.fn(),
  restoreGame: vi.fn().mockResolvedValue(false),
}));

const load = () => mountGame(() => import('../word/src/main.ts'));
const store = () => JSON.parse(localStorage.getItem('word.v1') || '{}');
const correctIndex = () => dailyOptions().findIndex((o) => o.correct);

const practiceWrong = (app: HTMLElement): HTMLElement => {
  const word = app.querySelector('.card h2')!.textContent!.trim();
  const definition = WORDS.find((w) => w.word === word)!.definition;
  return [...app.querySelectorAll<HTMLElement>('#options .option')]
    .find((o) => o.textContent!.trim() !== definition)!;
};

describe('word/dom · daily', () => {
  gameEnv();
  afterEach(() => submitScore.mockClear());

  it('boots the Today tab with a fresh streak and four options', async () => {
    const app = await load();
    expect(app.querySelectorAll('#options .option').length).toBe(4);
    expect(app.querySelector('.pill .v')?.textContent).toContain('0');
  });

  it('a correct answer advances + persists the streak and learned word', async () => {
    const app = await load();
    pointerdown(app.querySelector(`.option[data-i="${correctIndex()}"]`)!);
    const s = store();
    expect(s.daily.streak).toBe(1);
    expect(s.daily.maxStreak).toBe(1);
    expect(s.daily.lastKey).not.toBe('');
    expect(s.learnedIds.length).toBe(1);
  });

  it('backs the streak up to the cloud on completion', async () => {
    const app = await load();
    pointerdown(app.querySelector(`.option[data-i="${correctIndex()}"]`)!);
    expect(submitScore).toHaveBeenCalledWith('word', expect.any(Number), { backup: true });
  });

  it('a wrong answer marks the day done but resets the streak to 0', async () => {
    const app = await load();
    const wrong = dailyOptions().findIndex((o) => !o.correct);
    pointerdown(app.querySelector(`.option[data-i="${wrong}"]`)!);
    const s = store();
    expect(s.daily.streak).toBe(0);
    expect(s.daily.lastKey).not.toBe('');
  });

  it('shows the completed state (no quiz) when already done today', async () => {
    const app = await mountGame(
      () => import('../word/src/main.ts'),
      () =>
        localStorage.setItem(
          'word.v1',
          JSON.stringify({
            daily: { streak: 5, maxStreak: 5, lastKey: todayKey() },
            practiceBest: 0,
            learnedIds: ['x'],
          })
        )
    );
    expect(app.querySelector('#options')).toBeNull();
    expect(app.textContent).toContain('learned today');
  });

  it('does not append a stale daily reveal into Practice', async () => {
    const app = await load();
    pointerdown(app.querySelector(`.option[data-i="${correctIndex()}"]`)!);
    app.querySelector<HTMLButtonElement>('.tab[data-tab="practice"]')!.click();

    await vi.advanceTimersByTimeAsync(800);

    expect(app.querySelector('.tab[data-tab="practice"]')!.classList.contains('active')).toBe(true);
    expect(app.querySelector('.reveal-anim')).toBeNull();
    expect(app.querySelector('#share')).toBeNull();
    expect(app.querySelector('#toPractice')).toBeNull();
  });
});

describe('word/dom · practice lifecycle', () => {
  gameEnv();

  it('does not open the old Practice result after switching to Today', async () => {
    const app = await load();
    app.querySelector<HTMLButtonElement>('.tab[data-tab="practice"]')!.click();

    for (let life = 3; life > 0; life--) {
      pointerdown(practiceWrong(app));
      if (life > 1) app.querySelector<HTMLButtonElement>('#p-next')!.click();
    }
    app.querySelector<HTMLButtonElement>('.tab[data-tab="today"]')!.click();
    await vi.advanceTimersByTimeAsync(1000);

    expect(app.querySelector('.tab[data-tab="today"]')!.classList.contains('active')).toBe(true);
    expect(app.querySelector('#overlay')!.classList.contains('show')).toBe(false);
    expect(app.textContent).not.toContain('Round over');
  });
});
