import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('https://esm.sh/@supabase/supabase-js@2.45.4?bundle', () => sdk);

beforeEach(() => {
  vi.resetModules();
  sdk.createClient.mockReset();
  localStorage.clear();
});

function client() {
  const rpc = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: { display_name: 'Player', avatar: null } });
  const count = vi.fn().mockResolvedValue({ count: null, error: { message: 'offline' } });
  const session = { user: { id: 'user-a', user_metadata: {} } };
  const auth = { getSession: vi.fn().mockResolvedValue({ data: { session } }) };
  const from = vi.fn((table: string) => table === 'arcade_profiles'
    ? { select: () => ({ eq: () => ({ maybeSingle }) }) }
    : { select: () => ({ eq: () => ({ gt: count }) }) });
  return { auth, rpc, from };
}

describe('cloud runtime failures', () => {
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