import { describe, it, expect, vi } from 'vitest';
import { mountGame, text, gameEnv } from './helpers/dom';

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

const load = () => mountGame(() => import('../sprint/src/main.ts'));
const currentWord = (app: HTMLElement) => text(app.querySelector('.w.current'));
function submit(app: HTMLElement, typed: string): void {
  const field = app.querySelector<HTMLInputElement>('#field')!;
  field.value = typed + ' '; // a trailing space completes the word
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('sprint/dom', () => {
  gameEnv();

  it('boots with an input and a current word', async () => {
    const app = await load();
    expect(app.querySelector('#field')).not.toBeNull();
    expect(currentWord(app).length).toBeGreaterThan(0);
  });

  it('completing the current word advances the stream', async () => {
    const app = await load();
    const w1 = currentWord(app);
    submit(app, w1);
    expect(text(app.querySelector('.w.done'))).toBe(w1);
    expect(currentWord(app)).not.toBe(w1);
  });

  it('marks mistyped characters on a wrong word', async () => {
    const app = await load();
    const w = currentWord(app);
    const wrong = (w[0] === 'x' ? 'y' : 'x') + w.slice(1); // guaranteed first-char miss
    submit(app, wrong);
    expect(app.querySelector('.w.done .c-bad')).not.toBeNull();
  });
});
