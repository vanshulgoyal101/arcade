import { describe, it, expect, vi } from 'vitest';
import { mountGame, click, gameEnv } from './helpers/dom';

vi.mock('../shared/cloud', () => ({
  submitScore: vi.fn(),
  getRank: vi.fn().mockResolvedValue(null),
  cloudReady: vi.fn().mockResolvedValue(undefined),
  cloudProfile: () => null,
  cloudAvatarImage: () => null,
  isSignedIn: () => false,
  signIn: vi.fn(),
}));

const load = () => mountGame(() => import('../flash/src/main.ts'));
const hidden = (el: Element | null) => !!el?.classList.contains('hidden');

describe('flash/dom', () => {
  gameEnv();

  it('boots on the ready panel with a difficulty picker', async () => {
    const app = await load();
    expect(hidden(app.querySelector('#panel-ready'))).toBe(false);
    expect(hidden(app.querySelector('#panel-reader'))).toBe(true);
    expect(app.querySelectorAll('#diffPicker .diff-card').length).toBe(3);
  });

  it('picking a difficulty selects it', async () => {
    const app = await load();
    const card = app.querySelector<HTMLButtonElement>('#diffPicker .diff-card[data-wpm="450"]')!;
    click(card);
    expect(card.classList.contains('active') || card.getAttribute('aria-pressed') === 'true').toBe(
      true
    );
  });

  it('starting a run leaves the ready panel for the reader', async () => {
    const app = await load();
    click(app.querySelector('#startBtn')!);
    expect(hidden(app.querySelector('#panel-ready'))).toBe(true);
    expect(hidden(app.querySelector('#panel-reader'))).toBe(false);
  });
});
