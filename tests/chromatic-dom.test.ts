import { describe, it, expect, vi } from 'vitest';
import { mountGame, click, text, gameEnv } from './helpers/dom';

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

const load = () => mountGame(() => import('../chromatic/src/main.ts'));

describe('chromatic/dom', () => {
  gameEnv();

  it('boots with three sliders, difficulty buttons and Submit', async () => {
    const app = await load();
    expect(app.querySelector('#s-r')).not.toBeNull();
    expect(app.querySelector('#s-g')).not.toBeNull();
    expect(app.querySelector('#s-b')).not.toBeNull();
    expect(app.querySelectorAll('#diff .diff-btn').length).toBe(3);
    expect(app.querySelector('#submit')).not.toBeNull();
  });

  it('moving a slider updates its value read-out', async () => {
    const app = await load();
    const s = app.querySelector<HTMLInputElement>('#s-r')!;
    s.value = '200';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    expect(text(app.querySelector('#v-r'))).toBe('200');
  });

  it('locks the difficulty once a run is underway', async () => {
    const app = await load();
    expect(app.querySelector('#diff')!.classList.contains('disabled')).toBe(false);
    click(app.querySelector('#submit')!);
    expect(app.querySelector('#diff')!.classList.contains('disabled')).toBe(true);
  });
});
