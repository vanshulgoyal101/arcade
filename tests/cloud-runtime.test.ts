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