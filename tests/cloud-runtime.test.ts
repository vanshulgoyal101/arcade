import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('https://esm.sh/@supabase/supabase-js@2.45.4?bundle', () => sdk);

beforeEach(() => {
  vi.resetModules();
  sdk.createClient.mockReset();
  localStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

function client() {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: { display_name: 'Player', avatar: null } });
  const count = vi.fn().mockResolvedValue({ count: null, error: { message: 'offline' } });
  const session = { user: { id: 'user-a', user_metadata: {} } };
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session } }),
    onAuthStateChange: vi.fn(),
  };
  const from = vi.fn((table: string) => table === 'arcade_profiles'
    ? { select: () => ({ eq: () => ({ maybeSingle }) }) }
    : { select: () => ({ eq: () => ({ gt: count }) }) });
  return { auth, rpc, from, maybeSingle };
}

describe('cloud runtime failures', () => {
  it.each(['resolved', 'rejected'])('makes in-game OAuth failures retryable without duplicate requests (%s)', async failure => {
    const backend = client();
    backend.auth.getSession.mockResolvedValue({ data: { session: null } });
    let finish!: () => void;
    const signInWithOAuth = vi.fn(() => new Promise((resolve, reject) => {
      finish = () => failure === 'resolved' ? resolve({ error: new Error('offline') }) : reject(new Error('offline'));
    }));
    Object.assign(backend.auth, { signInWithOAuth });
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    const modal = document.createElement('div');
    modal.innerHTML = '<div class="row"></div>';
    document.body.appendChild(modal);
    try {
      cloud.mountRank(modal, 'wordle', 5);
      await vi.waitFor(() => expect(modal.querySelector('button')).not.toBeNull());
      const button = modal.querySelector('button')!;
      button.click();
      button.click();
      await vi.waitFor(() => expect(signInWithOAuth).toHaveBeenCalledOnce());
      expect(button.disabled).toBe(true);
      finish();
      await vi.waitFor(() => expect(button.disabled).toBe(false));
      expect(button.textContent).toContain('Sign-in failed');
      signInWithOAuth.mockResolvedValueOnce({ error: null });
      button.click();
      await vi.waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(2));
      await vi.waitFor(() => expect(button.disabled).toBe(false));
    } finally {
      modal.remove();
    }
  });

  it.each(['migration', 'owner'])('blocks writes when another tab changes local %s before an auth event arrives', async change => {
    const backend = client();
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    localStorage.setItem(`arcade.sync.${change}`, change === 'migration' ? '1' : 'user-b');
    await cloud.submitScore('wordle', 20);
    expect(await cloud.restoreGame('wordle')).toBe(false);
    expect(backend.rpc).not.toHaveBeenCalled();
  });

  it('releases the game queue after a rejected restore so pending progress can retry', async () => {
    const backend = client();
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    localStorage.setItem('wordle.v1', '{"maxStreak":5}');
    cloud.queuePending('wordle', 5);
    backend.rpc.mockRejectedValueOnce(new Error('offline'));
    expect(await cloud.restoreGame('wordle')).toBe(false);
    await vi.waitFor(() => expect(cloud.readPending()).toEqual({}));
    expect(backend.rpc.mock.calls.map(call => call[0])).toEqual(['restore_my_scores', 'submit_score']);
  });

  it('routes an interrupted account migration to the hub without uploading partial stores', async () => {
    const backend = client();
    sdk.createClient.mockReturnValue(backend);
    const replace = vi.fn();
    vi.stubGlobal('location', { replace, reload: vi.fn() });
    localStorage.setItem('arcade.sync.owner', 'user-a');
    localStorage.setItem('arcade.sync.migration', '1');
    const cloud = await import('../shared/cloud');
    await cloud.submitScore('wordle', 20);
    expect(backend.rpc).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/');
    expect(cloud.isSignedIn()).toBe(false);
  });

  it('does not overwrite progress saved while a restore is in flight', async () => {
    const backend = client();
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    localStorage.setItem('word.v1', JSON.stringify({ practiceBest: 5, learnedIds: ['first'] }));
    let finish!: (response: unknown) => void;
    backend.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const restore = cloud.restoreGame('word');
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledOnce());
    const latest = JSON.stringify({ practiceBest: 5, learnedIds: ['first', 'second'] });
    localStorage.setItem('word.v1', latest);
    finish({ data: [{ game: 'word', best: 10, data: { practiceBest: 10, learnedIds: ['older'] } }] });
    expect(await restore).toBe(false);
    expect(localStorage.getItem('word.v1')).toBe(latest);
  });

  it('restores before retrying so a pending upload does not overwrite the unread cloud snapshot', async () => {
    const backend = client();
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    localStorage.setItem('wordle.v1', '{"maxStreak":5,"played":5}');
    cloud.queuePending('wordle', 5);
    let finish!: (response: unknown) => void;
    backend.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const restore = cloud.restoreGame('wordle');
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalled());
    const callsBeforeRestore = backend.rpc.mock.calls.length;
    finish({ data: [{ game: 'wordle', best: 10, data: { maxStreak: 10, played: 20 } }] });
    expect(await restore).toBe(true);
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledTimes(2));
    expect(callsBeforeRestore).toBe(1);
    expect(backend.rpc.mock.calls[1][1].p_data).toEqual({ maxStreak: 10, played: 20 });
  });

  it('serializes same-game writes so an older backup cannot land last', async () => {
    const backend = client();
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    let finish!: (response: { error: null }) => void;
    backend.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    localStorage.setItem('word.v1', JSON.stringify({ practiceBest: 5, learnedIds: ['first'] }));
    const older = cloud.submitScore('word', 5);
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledOnce());
    localStorage.setItem('word.v1', JSON.stringify({ practiceBest: 5, learnedIds: ['first', 'second'] }));
    const newer = cloud.submitScore('word', 5);
    await cloud.submitScore('echo', 10);
    const gamesBeforeCompletion = backend.rpc.mock.calls.map(call => call[1].p_game);
    finish({ error: null });
    await Promise.all([older, newer]);

    expect(gamesBeforeCompletion).toEqual(['word', 'echo']);
    expect(backend.rpc.mock.calls.map(call => call[1].p_game)).toEqual(['word', 'echo', 'word']);
    expect(backend.rpc.mock.calls[2][1].p_data.learnedIds).toEqual(['first', 'second']);
    expect(cloud.readPending()).toEqual({});
  });

  it('does not propagate callback credentials into OAuth return URLs', async () => {
    const backend = client();
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    Object.assign(backend.auth, { signInWithOAuth });
    sdk.createClient.mockReturnValue(backend);
    vi.stubGlobal('location', {
      origin: 'https://games.vanshul.com', pathname: '/wordle/',
      href: 'https://games.vanshul.com/wordle/?code=private#access_token=private',
    });
    const cloud = await import('../shared/cloud');
    await cloud.signIn();
    expect(signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
      provider: 'google', options: { redirectTo: 'https://games.vanshul.com/wordle/' },
    });
  });
  it('rejects invalid game identifiers and scores before SDK initialization', async () => {
    const cloud = await import('../shared/cloud');
    for (const slug of ['__proto__', 'constructor', 'toString', 'not-a-game']) {
      expect(await cloud.restoreGame(slug)).toBe(false);
      await cloud.submitScore(slug, 10);
      expect(await cloud.getRank(slug, 10)).toBeNull();
    }
    for (const score of [NaN, Infinity, -Infinity]) {
      await cloud.submitScore('wordle', score);
      expect(await cloud.getRank('wordle', score)).toBeNull();
    }
    expect(sdk.createClient).not.toHaveBeenCalled();
    expect(localStorage.getItem('arcade.pending.v1')).toBeNull();
  });
  it('keeps the current game running on a same-user token refresh', async () => {
    const backend = client();
    const reload = vi.fn();
    const replace = vi.fn();
    vi.stubGlobal('location', { reload, replace });
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();

    const callback = backend.auth.onAuthStateChange.mock.calls[0][0];
    expect(callback('TOKEN_REFRESHED', { user: { id: 'user-a', user_metadata: {} } })).toBeUndefined();
    await cloud.submitScore('wordle', 12);

    expect(cloud.isSignedIn()).toBe(true);
    expect(backend.rpc).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not load another account over stores still owned by the previous account', async () => {
    const backend = client();
    const replace = vi.fn();
    vi.stubGlobal('location', { reload: vi.fn(), replace });
    localStorage.setItem('arcade.sync.owner', 'previous-user');
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');

    expect(await cloud.restoreGame('wordle')).toBe(false);
    expect(replace).toHaveBeenCalledWith('/');
    expect(backend.rpc).not.toHaveBeenCalled();
    expect(localStorage.getItem('arcade.sync.owner')).toBe('previous-user');
  });

  it('does not reinstate a profile whose request completes after sign-out', async () => {
    const backend = client();
    vi.stubGlobal('location', { reload: vi.fn(), replace: vi.fn() });
    let finish!: (response: unknown) => void;
    backend.maybeSingle.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    const request = cloud.cloudReady();
    await vi.waitFor(() => expect(backend.maybeSingle).toHaveBeenCalledOnce());
    backend.auth.onAuthStateChange.mock.calls[0][0]('SIGNED_OUT', null);
    finish({ data: { display_name: 'Old account', avatar: 'a:panda' } });
    await request;

    expect(cloud.cloudProfile()).toBeNull();
    expect(cloud.cloudAvatarImage()).toBeNull();
  });

  it('invalidates a late restore after sign-out and reloads the game', async () => {
    const backend = client();
    const reload = vi.fn();
    vi.stubGlobal('location', { reload, replace: vi.fn() });
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    let finish!: (response: unknown) => void;
    backend.rpc.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const request = cloud.restoreGame('wordle');
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledOnce());

    backend.auth.onAuthStateChange.mock.calls[0]?.[0]('SIGNED_OUT', null);
    finish({ data: [{ game: 'wordle', best: 12, data: { maxStreak: 12 } }] });

    expect(await request).toBe(false);
    expect(cloud.isSignedIn()).toBe(false);
    expect(cloud.cloudProfile()).toBeNull();
    expect(localStorage.getItem('wordle.v1')).toBeNull();
    expect(reload).toHaveBeenCalledOnce();
  });

  it.each([null, { message: 'offline' }])('does not mutate retries after an account switch (RPC error: %j)', async (error) => {
    const backend = client();
    const replace = vi.fn();
    vi.stubGlobal('location', { reload: vi.fn(), replace });
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    let finish!: (response: unknown) => void;
    backend.rpc.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const request = cloud.submitScore('wordle', 12);
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledOnce());

    backend.auth.onAuthStateChange.mock.calls[0]?.[0]('SIGNED_IN', { user: { id: 'user-b' } });
    localStorage.setItem('arcade.pending.v1', '{"wordle":5}');
    finish({ error });
    await request;
    await cloud.submitScore('wordle', 20);
    cloud.queuePending('wordle', 30);

    expect(replace).toHaveBeenCalledWith('/');
    expect(backend.rpc).toHaveBeenCalledOnce();
    expect(backend.from).toHaveBeenCalledTimes(1);
    expect(cloud.readPending()).toEqual({ wordle: 5 });
  });

  it('parks a signed-in result before waiting for session initialization', async () => {
    const backend = client();
    let finish!: (response: unknown) => void;
    backend.auth.getSession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    sdk.createClient.mockReturnValue(backend);
    localStorage.setItem('sb-tmngedsmgcgbkbkmsnsw-auth-token', JSON.stringify({ user: { id: 'user-a' } }));
    const cloud = await import('../shared/cloud');

    const request = cloud.submitScore('wordle', 12);
    const pendingBeforeInitialization = cloud.readPending();
    await vi.waitFor(() => expect(backend.auth.getSession).toHaveBeenCalledOnce());
    finish({ data: { session: { user: { id: 'user-a', user_metadata: {} } } } });
    await request;

    expect(pendingBeforeInitialization).toEqual({ wordle: 12 });
  });

  it('can retry initialization after a transient failure', async () => {
    sdk.createClient.mockImplementationOnce(() => { throw new Error('offline'); }).mockReturnValue(client());
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    expect(cloud.isSignedIn()).toBe(false);
    await cloud.cloudReady();
    expect(cloud.isSignedIn()).toBe(true);
  });

  it('never reports first place when count queries resolve with errors', async () => {
    sdk.createClient.mockReturnValue(client());
    const cloud = await import('../shared/cloud');
    expect(await cloud.getRank('wordle', 12)).toEqual({ rank: 0, total: 0, offline: true });
  });

  it('keeps an equal-score backup when progress changes during upload', async () => {
    const backend = client();
    sdk.createClient.mockReturnValue(backend);
    const cloud = await import('../shared/cloud');
    await cloud.cloudReady();
    localStorage.setItem('word.v1', JSON.stringify({ practiceBest: 0, learnedIds: ['first'] }));
    cloud.queuePending('word', 0);
    let finish!: (response: { error: null }) => void;
    backend.rpc.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const request = cloud.flushPending();
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalled());
    localStorage.setItem('word.v1', JSON.stringify({ practiceBest: 0, learnedIds: ['first', 'second'] }));
    cloud.queuePending('word', 0);
    finish({ error: null });
    await request;
    expect(cloud.readPending()).toEqual({ word: 0 });
  });
});