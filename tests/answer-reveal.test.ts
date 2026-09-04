// Ending a run on an unanswered question is confusing, so each game reveals its
// own version of the answer. Hue Hunt's tile ring shipped once and was later
// lost in a revert, so these pin the behaviour down per game.
import { describe, it, expect, vi } from 'vitest';
import { mountGame, pointerdown, gameEnv } from './helpers/dom';

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

describe('hue-hunt reveals the tile you were hunting', () => {
  gameEnv();

  // hue-hunt ends only when its rAF timer runs out, and the shared harness
  // drops rAF callbacks — so mount it by hand with a steppable frame queue.
  async function mountWithFrames(): Promise<{ app: HTMLElement; runOutOfTime: () => void }> {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
    let frame: FrameRequestCallback | null = null;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      frame = cb;
      return 1;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
    vi.resetModules();
    await import('../hue-hunt/src/main.ts');
    return {
      app: document.querySelector<HTMLElement>('#app')!,
      // One frame, far enough ahead that the round timer is spent.
      runOutOfTime: () => frame?.(performance.now() + 60_000),
    };
  }

  it('rings the odd tile and holds it before the results modal', async () => {
    const { app, runOutOfTime } = await mountWithFrames();
    expect(app.querySelectorAll('.tile.reveal').length).toBe(0);

    runOutOfTime();

    const revealed = app.querySelectorAll('.tile.reveal');
    expect(revealed.length).toBe(1);
    // The board must stay visible for a beat, or the answer is never seen.
    expect(app.querySelector('.overlay.show')).toBeNull();

    vi.advanceTimersByTime(900);
    expect(app.querySelector('.overlay.show')).not.toBeNull();
  });

  it('rings the tile that was actually the odd one', async () => {
    const { app, runOutOfTime } = await mountWithFrames();
    const tiles = [...app.querySelectorAll<HTMLElement>('.tile')];
    // The odd tile is the one whose colour differs from the majority.
    const counts = new Map<string, number>();
    for (const t of tiles) counts.set(t.style.background, (counts.get(t.style.background) ?? 0) + 1);
    const oddBg = [...counts.entries()].find(([, n]) => n === 1)![0];

    runOutOfTime();

    expect(app.querySelector<HTMLElement>('.tile.reveal')!.style.background).toBe(oddBg);
  });

  it('drops the pending reveal when a new round starts', async () => {
    const { app, runOutOfTime } = await mountWithFrames();
    runOutOfTime();
    vi.advanceTimersByTime(900);

    app.querySelector<HTMLButtonElement>('#m-again')!.click();
    expect(app.querySelector('.overlay.show')).toBeNull();
    expect(app.querySelectorAll('.tile.reveal').length).toBe(0);

    // A stale timer must not drop the modal back over the fresh board.
    vi.advanceTimersByTime(2000);
    expect(app.querySelector('.overlay.show')).toBeNull();
  });
});

describe('echo reveals the pad you needed', () => {
  gameEnv();

  it('lights the missed pad and holds it before the results modal', async () => {
    const app = await mountGame(() => import('../echo/src/main.ts'));
    app.querySelector<HTMLButtonElement>('#startBtn')!.click();
    // Playback is an async/await chain, so the timers must be advanced with the
    // async API or its continuations never run.
    await vi.advanceTimersByTimeAsync(5000);

    const pads = [...app.querySelectorAll<HTMLButtonElement>('.pad')];
    const status = () => app.querySelector('#status')!.textContent || '';
    // Press pads blind until the run ends. Small steps so the check lands while
    // the revealed pad is still lit (it clears after ~620ms).
    let ended = false;
    for (let i = 0; i < 60 && !ended; i++) {
      pointerdown(pads[i % pads.length]);
      await vi.advanceTimersByTimeAsync(250);
      ended = status().includes('needed');
    }

    expect(ended).toBe(true);
    // Exactly one pad is held lit: the one they should have hit.
    expect(app.querySelectorAll('.pad.lit').length).toBe(1);
    expect(app.querySelector('.overlay.show')).toBeNull();

    await vi.advanceTimersByTimeAsync(900);
    expect(app.querySelector('.overlay.show')).not.toBeNull();
  });
});

describe('where names the country you missed', () => {
  gameEnv();

  it('shows the answer on the game-over modal', async () => {
    const app = await mountGame(() => import('../where/src/main.ts'));
    // Each round's options are shuffled, so a blind pick is sometimes right;
    // keep answering until the lives actually run out.
    for (let i = 0; i < 30 && !app.querySelector('.overlay.show'); i++) {
      const opts = [...app.querySelectorAll<HTMLButtonElement>('#options .opt')];
      if (opts.length) pointerdown(opts[i % opts.length]);
      vi.advanceTimersByTime(1200);
    }
    const modal = app.querySelector('#modal')!;
    expect(modal.textContent).toContain('Out of lives');
    expect(modal.querySelector('.reveal-answer')).not.toBeNull();
    expect(modal.querySelector('.reveal-answer')!.textContent!.length).toBeGreaterThan(1);
  });
});
