import { describe, it, expect, vi } from 'vitest';
import { mountGame, pointerdown, gameEnv } from './helpers/dom';
import { ANSWER_WORDS } from '../wordle/src/words';

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

const load = () => mountGame(() => import('../wordle/src/main.ts'));
const press = (app: HTMLElement, k: string) =>
  pointerdown(app.querySelector(`.key[data-key="${k}"]`)!);
const type = (app: HTMLElement, word: string) => [...word].forEach((c) => press(app, c));
const rowText = (row: Element) =>
  [...row.querySelectorAll('.tile')].map((t) => (t.textContent || '').toLowerCase()).join('');

describe('wordle/dom', () => {
  gameEnv();

  it('boots a 6×5 board and a keyboard', async () => {
    const app = await load();
    expect(app.querySelectorAll('.tile').length).toBe(30);
    expect(app.querySelector('.key[data-key="enter"]')).not.toBeNull();
  });

  it('typing fills the current row', async () => {
    const app = await load();
    type(app, 'crane');
    expect(rowText(app.querySelector('.row')!)).toBe('crane');
  });

  it('backspace removes the last letter', async () => {
    const app = await load();
    type(app, 'crane');
    press(app, 'backspace');
    expect(rowText(app.querySelector('.row')!)).toBe('cran');
  });

  it('rejects a word not in the list (no tiles graded)', async () => {
    const app = await load();
    type(app, 'zzzzz');
    press(app, 'enter');
    await vi.advanceTimersByTimeAsync(1600);
    const row = app.querySelector('.row')!;
    expect(row.querySelectorAll('.correct, .present, .absent').length).toBe(0);
    expect(app.querySelector('#toast')?.textContent).toMatch(/word list/i);
  });

  it('accepts a valid guess and grades the row', async () => {
    const app = await load();
    type(app, ANSWER_WORDS[0]); // guaranteed a valid guess
    press(app, 'enter');
    await vi.advanceTimersByTimeAsync(1600);
    const row = app.querySelector('.row')!;
    expect(row.querySelectorAll('.correct, .present, .absent').length).toBe(5);
  });

  it('never paints the previous guess onto a board started mid-reveal', async () => {
    const app = await load();
    type(app, ANSWER_WORDS[0]);
    press(app, 'enter');
    await vi.advanceTimersByTimeAsync(300); // tiles are still flipping

    app.querySelector<HTMLButtonElement>('#restart')!.click();
    await vi.advanceTimersByTimeAsync(2000); // let every stale timeout fire

    expect(app.querySelectorAll('.tile.correct, .tile.present, .tile.absent').length).toBe(0);
    expect(app.querySelectorAll('.tile.reveal').length).toBe(0);
    expect(rowText(app.querySelector('.row')!)).toBe('');
  });
});
