// Adversarial DOM tests: restart cycles, input spam/boundaries and corrupt
// storage — the situations that historically hid guard/reset bugs. These drive
// the real main.ts hard and assert nothing breaks.
import { describe, it, expect, vi } from 'vitest';
import { mountGame, pointerdown, click, oddChild, plainChild, text, gameEnv } from './helpers/dom';
import { ANSWER_WORDS } from '../wordle/src/words';

vi.mock('../shared/cloud', () => ({
  submitScore: vi.fn(),
  getRank: vi.fn().mockResolvedValue(null),
  cloudReady: vi.fn().mockResolvedValue(undefined),
  cloudProfile: () => null,
  cloudAvatarImage: () => null,
  isSignedIn: () => false,
  signIn: vi.fn(),
  restoreGame: vi.fn().mockResolvedValue(false),
}));

const IMPORTERS: Record<string, () => Promise<unknown>> = {
  'hue-hunt': () => import('../hue-hunt/src/main.ts'),
  echo: () => import('../echo/src/main.ts'),
  chromatic: () => import('../chromatic/src/main.ts'),
  flash: () => import('../flash/src/main.ts'),
  flashmath: () => import('../flashmath/src/main.ts'),
  sprint: () => import('../sprint/src/main.ts'),
  'digit-span': () => import('../digit-span/src/main.ts'),
  interval: () => import('../interval/src/main.ts'),
  where: () => import('../where/src/main.ts'),
  word: () => import('../word/src/main.ts'),
  wordle: () => import('../wordle/src/main.ts'),
};
const STORAGE_KEYS: Record<string, string> = {
  'hue-hunt': 'huehunt.v2',
  echo: 'echo.v2',
  chromatic: 'chromatic.v2',
  flash: 'flash.v1',
  flashmath: 'flashmath.v1',
  sprint: 'sprint.v1',
  'digit-span': 'digitspan.v1',
  interval: 'interval.v1',
  where: 'where.v1',
  word: 'word.v1',
  wordle: 'wordle.v1',
};

describe('aggressive · corrupt storage still boots', () => {
  gameEnv();
  for (const slug of Object.keys(IMPORTERS)) {
    it(`${slug} boots with truncated JSON in localStorage`, async () => {
      const app = await mountGame(IMPORTERS[slug], () =>
        localStorage.setItem(STORAGE_KEYS[slug], '{"best": 5, "daily": {'),
      );
      expect(app.children.length).toBeGreaterThan(0);
    });
    it(`${slug} boots with wrong-typed values in localStorage`, async () => {
      const app = await mountGame(IMPORTERS[slug], () =>
        localStorage.setItem(
          STORAGE_KEYS[slug],
          JSON.stringify({ best: [], daily: 'x', learnedIds: 7, bestScore: null, muted: 'yes' }),
        ),
      );
      expect(app.children.length).toBeGreaterThan(0);
    });
  }
});

describe('aggressive · digit-span restart cycles', () => {
  gameEnv();
  const shown = (app: HTMLElement) => text(app.querySelector('#stage .digit'));
  const pressKey = (app: HTMLElement, k: string) =>
    click(app.querySelector(`#keypad .key[data-k="${k}"]`)!);

  it('survives repeated play → lose → restart without breaking the guard', async () => {
    const app = await mountGame(IMPORTERS['digit-span']);
    click(app.querySelector('#startBtn')!);
    for (let cycle = 0; cycle < 4; cycle++) {
      const digit = shown(app);
      expect(digit).toMatch(/^\d$/); // a fresh sequence flashed each cycle
      await vi.advanceTimersByTimeAsync(1300); // finish flash → keypad active
      const wrong = digit === '0' ? '1' : '0';
      pressKey(app, wrong);
      pressKey(app, 'enter');
      await vi.advanceTimersByTimeAsync(300);
      expect(app.querySelector('#overlay')!.classList.contains('show')).toBe(true);
      click(app.querySelector('#m-again')!); // → startRun(): must fully reset
    }
  });
});

describe('aggressive · input spam & boundaries', () => {
  gameEnv();

  it('wordle caps the row at five letters however many you type', async () => {
    const app = await mountGame(IMPORTERS.wordle);
    [...'abcdefghij'].forEach((c) => pointerdown(app.querySelector(`.key[data-key="${c}"]`)!));
    const row0 = [...app.querySelector('.row')!.querySelectorAll('.tile')]
      .map((t) => (t.textContent || '').trim())
      .join('');
    expect(row0.length).toBe(5);
  });

  it('wordle reaches game over after six guesses', async () => {
    const app = await mountGame(IMPORTERS.wordle);
    for (let i = 0; i < 6; i++) {
      [...ANSWER_WORDS[i]].forEach((c) => pointerdown(app.querySelector(`.key[data-key="${c}"]`)!));
      pointerdown(app.querySelector('.key[data-key="enter"]')!);
      await vi.advanceTimersByTimeAsync(1600);
    }
    await vi.advanceTimersByTimeAsync(3000); // let the win/lose modal's delayed reveal fire
    expect(app.querySelector('#overlay')!.classList.contains('show')).toBe(true);
  });

  it('flashmath caps the typed answer at six digits', async () => {
    const app = await mountGame(IMPORTERS.flashmath);
    [...'12345678'].forEach((d) => document.dispatchEvent(new KeyboardEvent('keydown', { key: d })));
    expect(text(app.querySelector('#answer')).length).toBeLessThanOrEqual(6);
  });

  it('flashmath ignores Enter with an empty answer (no score, no crash)', async () => {
    const app = await mountGame(IMPORTERS.flashmath);
    for (let i = 0; i < 5; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(text(app.querySelector('#score'))).toBe('0');
  });
});

describe('aggressive · hue-hunt rapid tapping', () => {
  gameEnv();

  it('keeps the combo through fast taps across several rounds', async () => {
    const app = await mountGame(IMPORTERS['hue-hunt']);
    const board = app.querySelector('#board')!;
    let prev = -1;
    for (let round = 0; round < 5; round++) {
      pointerdown(oddChild(board)); // correct pick
      const score = Number(text(app.querySelector('#score')));
      expect(score).toBeGreaterThan(prev); // strictly grew — no wrong-grade reset
      prev = score;
      for (let j = 0; j < 6; j++) pointerdown(plainChild(board)); // spam the stale board
      expect(board.querySelector('.wrong')).toBeNull(); // guard held every time
      await vi.advanceTimersByTimeAsync(80); // rebuild
    }
    expect(text(app.querySelector('#combo'))).not.toBe('x1'); // combo actually built
  });
});
