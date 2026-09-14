import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(process.cwd() + '/assets/auth.js', 'utf8');
const between = (start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Could not extract ${start}`);
  return source.slice(from, to);
};

// auth.js imports the Supabase SDK over HTTPS and initializes the whole hub at
// module load, so execute its exact sync functions with their dependencies
// injected instead of replacing the production behavior with a test copy.
function uploadHarness(error: Error | null, hasProgress = true) {
  const upsert = vi.fn().mockResolvedValue({ error });
  const supabase = { from: vi.fn(() => ({ upsert })) };
  const GAMES = [{ slug: 'wordle', key: 'wordle.v1', best: (s: { best: number }) => s.best }];
  const readLocal = () => (hasProgress ? { best: 12 } : null);
  const factory = new Function(
    'supabase', 'GAMES', 'readLocal', 'num', 'pName', 'pAvatar', 'localStorage', 'PENDING_KEY',
    `${between('async function uploadScores', 'async function restoreScores')} return uploadScores;`
  );
  const upload = factory(
    supabase, GAMES, readLocal, (v: unknown) => Number(v) || 0,
    () => 'Player', () => 'a:panda', localStorage, 'arcade.pending.v1'
  ) as (user: { id: string }) => Promise<void>;
  return { upload, upsert };
}

function clearHarness() {
  const GAMES = [{ key: 'wordle.v1' }, { key: '2048.v1' }];
  const factory = new Function(
    'GAMES', 'localStorage', 'PENDING_KEY',
    `${between('function clearLocalScores', '// Render (or clear)')} return clearLocalScores;`
  );
  return factory(GAMES, localStorage, 'arcade.pending.v1') as () => void;
}

function loadProfileHarness(response: { data: unknown; error: Error | null }, seedError: Error | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue(response);
  const upsert = vi.fn().mockResolvedValue({ error: seedError });
  const supabase = {
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    })),
  };
  const factory = new Function(
    'supabase', 'googleName', 'googleAvatar', 'pickRandomAvatar', 'profile',
    `${between('async function loadProfile', '// Apply an account')} return { loadProfile, getProfile: () => profile };`
  );
  const harness = factory(
    supabase, () => 'Google Name', () => 'https://avatar.test/me.png', () => 'a:panda',
    { display_name: 'Cached Name', avatar: 'a:owl' }
  ) as { loadProfile: (user: { id: string }) => Promise<void>; getProfile: () => unknown };
  return { ...harness, upsert };
}

function saveProfileHarness(profileError: Error | null) {
  const profileUpsert = vi.fn().mockResolvedValue({ error: profileError });
  const scoreEq = vi.fn().mockResolvedValue({ error: null });
  const scoreUpdate = vi.fn(() => ({ eq: scoreEq }));
  const supabase = {
    from: vi.fn((table: string) => table === 'arcade_profiles'
      ? { upsert: profileUpsert }
      : { update: scoreUpdate }),
  };
  const cacheProfile = vi.fn();
  const factory = new Function(
    'supabase', 'currentUser', 'googleName', 'cacheProfile', 'profile',
    `let authVersion = 0;
    ${between('async function saveProfile', '// ---- score sync ----')} return {
      saveProfile, getProfile: () => profile,
      switchUser: () => { currentUser = { id: 'user-b' }; authVersion++; },
    };`
  );
  const harness = factory(
    supabase, { id: 'user-a' }, () => 'Google Name', cacheProfile,
    { display_name: 'Old Name', avatar: 'a:owl' }
  ) as { saveProfile: (name: string, avatar: string) => Promise<void>; getProfile: () => unknown; switchUser: () => void };
  return { ...harness, profileUpsert, scoreUpdate, cacheProfile };
}

function restoreHarness(rows: unknown[], error: Error | null = null) {
  const supabase = { rpc: vi.fn().mockResolvedValue({ data: rows, error }) };
  const GAMES = [{
    slug: 'wordle',
    key: 'wordle.v1',
    best: (s: { maxStreak?: number }) => s.maxStreak || 0,
    applyBest: (s: { maxStreak?: number }, best: number) => { s.maxStreak = Math.max(s.maxStreak || 0, best); },
  }];
  const factory = new Function(
    'supabase', 'GAMES', 'readLocal', 'localBest', 'num', 'localStorage', 'isStore', 'clearLocalScores',
    `${between('async function restoreScores', '// Which signed-in account')} return restoreScores;`
  );
  const clearLocalScores = vi.fn(() => {
    localStorage.removeItem('wordle.v1');
    localStorage.removeItem('arcade.pending.v1');
  });
  const restore = factory(
    supabase,
    GAMES,
    (key: string) => JSON.parse(localStorage.getItem(key) || 'null'),
    () => 0,
    (v: unknown) => Number(v) || 0,
    localStorage,
    (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v),
    clearLocalScores,
  ) as (overwrite?: boolean, isCurrent?: () => boolean) => Promise<void>;
  return { restore, clearLocalScores };
}

function onUserHarness(options: {
  cached?: boolean;
  profileError?: Error | null;
  uploadError?: Error | null;
} = {}) {
  const renderAccount = vi.fn();
  const paintCardBests = vi.fn();
  const loadProfile = options.profileError
    ? vi.fn().mockRejectedValue(options.profileError)
    : vi.fn().mockResolvedValue({ display_name: 'Loaded', avatar: 'a:owl' });
  const uploadScores = options.uploadError
    ? vi.fn().mockRejectedValue(options.uploadError)
    : vi.fn().mockResolvedValue(undefined);
  const restoreScores = vi.fn().mockResolvedValue(undefined);
  const profile = options.cached ? { display_name: 'Cached', avatar: 'a:owl' } : null;
  const factory = new Function(
    'renderAccount', 'paintCardBests', 'signIn', 'hydrateProfileFromCache', 'loadProfile',
    'cacheProfile', 'applyTheme', 'clearLocalScores', 'restoreScores', 'uploadScores',
    'localStorage', 'OWNER_KEY', 'currentUser', 'syncedFor', 'pendingSignIn', 'profile',
    `let authVersion = 0;
    const closeProfile = () => {};
    const closeLeaderboard = () => {};
    ${between('async function onUser', 'async function signIn')} return {
      onUser,
      getSyncedFor: () => syncedFor,
    };`
  );
  const harness = factory(
    renderAccount, paintCardBests, vi.fn(), () => options.cached === true, loadProfile,
    vi.fn(), vi.fn(), vi.fn(), restoreScores, uploadScores, localStorage,
    'arcade.sync.owner', null, null, false, profile
  ) as { onUser: (user: { id: string } | null) => Promise<void>; getSyncedFor: () => string | null };
  return { ...harness, uploadScores, restoreScores, renderAccount, loadProfile };
}

describe('hub score sync', () => {
  beforeEach(() => localStorage.clear());

  it('registers retry listeners only after auth state exists', () => {
    const state = source.indexOf('let currentUser = null;');
    const pageshow = source.indexOf("addEventListener('pageshow'");
    const online = source.indexOf("addEventListener('online'");
    expect(state).toBeGreaterThan(-1);
    expect(pageshow).toBeGreaterThan(state);
    expect(online).toBeGreaterThan(state);
  });

  it('keeps pending retries when Supabase resolves with an error', async () => {
    localStorage.setItem('arcade.pending.v1', JSON.stringify({ wordle: 12 }));
    const { upload } = uploadHarness(new Error('offline'));

    await expect(upload({ id: 'user-a' })).rejects.toThrow('offline');
    expect(localStorage.getItem('arcade.pending.v1')).not.toBeNull();
  });

  it('clears pending retries only after rows actually land', async () => {
    localStorage.setItem('arcade.pending.v1', JSON.stringify({ wordle: 12 }));
    const { upload, upsert } = uploadHarness(null);

    await upload({ id: 'user-a' });
    expect(upsert).toHaveBeenCalledOnce();
    expect(localStorage.getItem('arcade.pending.v1')).toBeNull();
  });

  it('does not clear pending retries when there are no rows to upload', async () => {
    localStorage.setItem('arcade.pending.v1', JSON.stringify({ wordle: 12 }));
    const { upload, upsert } = uploadHarness(null, false);

    await upload({ id: 'user-a' });
    expect(upsert).not.toHaveBeenCalled();
    expect(localStorage.getItem('arcade.pending.v1')).not.toBeNull();
  });

  it('preserves newer scores and games outside an in-flight hub upload', async () => {
    localStorage.setItem('arcade.pending.v1', JSON.stringify({ wordle: 12 }));
    const { upload, upsert } = uploadHarness(null);
    let finish!: (response: { error: null }) => void;
    upsert.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));

    const request = upload({ id: 'user-a' });
    localStorage.setItem('arcade.pending.v1', JSON.stringify({ wordle: 15, echo: 8 }));
    finish({ error: null });
    await request;

    expect(JSON.parse(localStorage.getItem('arcade.pending.v1')!)).toEqual({ wordle: 15, echo: 8 });
  });

  it('clears both scores and their pending writes on an account switch', () => {
    localStorage.setItem('wordle.v1', '{}');
    localStorage.setItem('2048.v1', '{}');
    localStorage.setItem('arcade.pending.v1', JSON.stringify({ wordle: 12 }));

    clearHarness()();

    expect(localStorage.getItem('wordle.v1')).toBeNull();
    expect(localStorage.getItem('2048.v1')).toBeNull();
    expect(localStorage.getItem('arcade.pending.v1')).toBeNull();
  });

  it('never restores a primitive or array as a game store', async () => {
    for (const data of [5, 'bad', true, [], [1, 2]]) {
      localStorage.setItem('wordle.v1', JSON.stringify({ maxStreak: 7 }));
      await restoreHarness([{ game: 'wordle', best: 20, data }]).restore();
      expect(JSON.parse(localStorage.getItem('wordle.v1')!)).toEqual({ maxStreak: 7 });
    }
  });

  it('still restores and heals a valid object store', async () => {
    await restoreHarness([{ game: 'wordle', best: 20, data: { maxStreak: 3, played: 8 } }]).restore(true);
    expect(JSON.parse(localStorage.getItem('wordle.v1')!)).toEqual({ maxStreak: 20, played: 8 });
  });

  it('does not clear the prior account before a switched-account restore succeeds', async () => {
    localStorage.setItem('wordle.v1', JSON.stringify({ maxStreak: 7 }));
    localStorage.setItem('arcade.pending.v1', JSON.stringify({ wordle: 7 }));
    const { restore, clearLocalScores } = restoreHarness([], new Error('offline'));

    await expect(restore(true)).rejects.toThrow('offline');

    expect(clearLocalScores).not.toHaveBeenCalled();
    expect(localStorage.getItem('wordle.v1')).not.toBeNull();
    expect(localStorage.getItem('arcade.pending.v1')).not.toBeNull();
  });

  it('clears the prior account only after an empty new-account snapshot arrives', async () => {
    localStorage.setItem('wordle.v1', JSON.stringify({ maxStreak: 7 }));
    const { restore, clearLocalScores } = restoreHarness([]);

    await restore(true);

    expect(clearLocalScores).toHaveBeenCalledOnce();
    expect(localStorage.getItem('wordle.v1')).toBeNull();
  });

  it('ignores a restore response after its account context expires', async () => {
    localStorage.setItem('wordle.v1', JSON.stringify({ maxStreak: 7 }));
    const { restore, clearLocalScores } = restoreHarness([{ game: 'wordle', best: 20, data: {} }]);
    await restore(true, () => false);
    expect(clearLocalScores).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('wordle.v1')!)).toEqual({ maxStreak: 7 });
  });
});

describe('hub profile sync', () => {
  it('does not mistake a read failure for a missing profile and overwrite it', async () => {
    const { loadProfile, getProfile, upsert } = loadProfileHarness({ data: null, error: new Error('offline') });

    await expect(loadProfile({ id: 'user-a' })).rejects.toThrow('offline');
    expect(upsert).not.toHaveBeenCalled();
    expect(getProfile()).toEqual({ display_name: 'Cached Name', avatar: 'a:owl' });
  });

  it('does not adopt a seeded profile until its insert succeeds', async () => {
    const { loadProfile, getProfile } = loadProfileHarness(
      { data: null, error: null },
      new Error('write failed')
    );

    await expect(loadProfile({ id: 'user-a' })).rejects.toThrow('write failed');
    expect(getProfile()).toEqual({ display_name: 'Cached Name', avatar: 'a:owl' });
  });

  it('commits and caches an edited profile only after the authoritative write lands', async () => {
    const { saveProfile, getProfile, cacheProfile, scoreUpdate } = saveProfileHarness(null);

    await saveProfile('  New Name  ', 'a:panda');

    expect(getProfile()).toEqual({ display_name: 'New Name', avatar: 'a:panda' });
    expect(cacheProfile).toHaveBeenCalledWith('user-a');
    expect(scoreUpdate).toHaveBeenCalledOnce();
  });

  it('keeps the prior profile and cache when a save is rejected', async () => {
    const { saveProfile, getProfile, cacheProfile, scoreUpdate } = saveProfileHarness(new Error('denied'));

    await expect(saveProfile('New Name', 'a:panda')).rejects.toThrow('denied');
    expect(getProfile()).toEqual({ display_name: 'Old Name', avatar: 'a:owl' });
    expect(cacheProfile).not.toHaveBeenCalled();
    expect(scoreUpdate).not.toHaveBeenCalled();
  });

  it('does not cache or restamp a profile save under a different account', async () => {
    const { saveProfile, switchUser, cacheProfile, scoreUpdate } = saveProfileHarness(null);
    const request = saveProfile('New Name', 'a:panda');
    switchUser();
    await request;
    expect(cacheProfile).not.toHaveBeenCalled();
    expect(scoreUpdate).not.toHaveBeenCalled();
  });

  it('ignores a delayed profile load after sign-out', async () => {
    const { onUser, loadProfile, uploadScores, renderAccount } = onUserHarness();
    let finish!: (profile: unknown) => void;
    loadProfile.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const request = onUser({ id: 'user-a' });
    await onUser(null);
    finish({ display_name: 'Old account', avatar: 'a:owl' });
    await request;
    expect(renderAccount).toHaveBeenLastCalledWith(null);
    expect(uploadScores).not.toHaveBeenCalled();
  });

  it('does not upload fallback identity when profile load fails without a cache', async () => {
    const { onUser, getSyncedFor, uploadScores } = onUserHarness({ profileError: new Error('offline') });

    await onUser({ id: 'user-a' });

    expect(uploadScores).not.toHaveBeenCalled();
    expect(getSyncedFor()).toBeNull(); // reconnect/pageshow may retry
  });

  it('can safely sync with an account-matched cached profile during a read outage', async () => {
    const { onUser, getSyncedFor, uploadScores } = onUserHarness({
      cached: true,
      profileError: new Error('offline'),
    });

    await onUser({ id: 'user-a' });

    expect(uploadScores).toHaveBeenCalledOnce();
    expect(getSyncedFor()).toBe('user-a');
  });

  it('keeps a retry path when score sync fails', async () => {
    const { onUser, getSyncedFor } = onUserHarness({
      cached: true,
      uploadError: new Error('offline'),
    });

    await onUser({ id: 'user-a' });

    expect(getSyncedFor()).toBeNull();
  });
});

describe('complete hub module boot', () => {
  it('returns from the auth callback before starting SDK-dependent sync', async () => {
    const dom = new JSDOM('<div id="account"></div><button id="lbBtn"></button>', {
      url: 'https://arcade.test/', runScripts: 'outside-only',
    });
    let locked = false;
    let callback!: (event: string, session: unknown) => unknown;
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const maybeSingle = vi.fn(async () => {
      if (locked) throw new Error('SDK auth lock held');
      return { data: { display_name: 'Saved Player', avatar: 'a:robot' }, error: null };
    });
    const backend = {
      auth: {
        onAuthStateChange: (listener: typeof callback) => { callback = listener; },
      },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
      rpc,
    };
    (dom.window as unknown as { sdk: unknown }).sdk = { createClient: () => backend };
    const executable = source
      .replace(/import \{ gameIcon, gameName \} from '[^']+';/, 'const gameIcon = () => ""; const gameName = (slug) => slug;')
      .replace(/await import\('https:\/\/esm.sh\/[^']+'\)/, 'await Promise.resolve(globalThis.sdk)');
    try {
      await dom.window.eval(`(async () => { ${executable} })()`);
      locked = true;
      const result = callback('INITIAL_SESSION', { user: { id: 'user-a', user_metadata: {} } });
      expect(result).toBeUndefined();
      expect(maybeSingle).not.toHaveBeenCalled();
      locked = false;
      await vi.waitFor(() => expect(dom.window.document.querySelector('#profileBtn')?.textContent).toContain('Saved Player'));
      expect(rpc).toHaveBeenCalledWith('restore_my_scores');
      expect(dom.window.localStorage.getItem('arcade.sync.owner')).toBe('user-a');
    } finally {
      dom.window.close();
    }
  });
});