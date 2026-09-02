import { describe, it, expect, beforeEach } from 'vitest';
import { readPending, queuePending, unqueuePending, submitScore, getRank, mountRank } from '../shared/cloud';

const KEY = 'arcade.pending.v1';
// supabase-js persists the session here; cloud.ts reads it to tell "signed in on
// this device" apart from "guest" when the SDK itself can't be reached.
const SESSION_KEY = 'sb-tmngedsmgcgbkbkmsnsw-auth-token';

describe('cloud/pending submit queue', () => {
  beforeEach(() => localStorage.clear());

  it('parks a score and reads it back', () => {
    queuePending('wordle', 12);
    expect(readPending()).toEqual({ wordle: 12 });
  });

  it('keeps the highest best when a game is parked twice', () => {
    queuePending('echo', 14);
    queuePending('echo', 9);
    expect(readPending()).toEqual({ echo: 14 });
    queuePending('echo', 20);
    expect(readPending()).toEqual({ echo: 20 });
  });

  it('parks several games independently', () => {
    queuePending('wordle', 3);
    queuePending('flash', 80);
    expect(readPending()).toEqual({ wordle: 3, flash: 80 });
  });

  it('drops a game once it lands, leaving the others parked', () => {
    queuePending('wordle', 3);
    queuePending('flash', 80);
    unqueuePending('wordle');
    expect(readPending()).toEqual({ flash: 80 });
  });

  it('removes the storage key entirely once the queue drains', () => {
    queuePending('wordle', 3);
    unqueuePending('wordle');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('ignores unknown slugs on write and on read', () => {
    queuePending('not-a-game', 99);
    expect(readPending()).toEqual({});
    localStorage.setItem(KEY, JSON.stringify({ 'not-a-game': 5, wordle: 7 }));
    expect(readPending()).toEqual({ wordle: 7 });
  });

  it('survives corrupt, non-object and non-numeric queue data', () => {
    localStorage.setItem(KEY, '{not json');
    expect(readPending()).toEqual({});
    localStorage.setItem(KEY, '[1,2,3]');
    expect(readPending()).toEqual({});
    localStorage.setItem(KEY, JSON.stringify({ wordle: 'abc' }));
    expect(readPending()).toEqual({ wordle: 0 });
  });

  it('normalises a parked best to a non-negative integer', () => {
    queuePending('flash', 80.7);
    expect(readPending()).toEqual({ flash: 80 });
    localStorage.clear();
    queuePending('flash', -5);
    expect(readPending()).toEqual({ flash: 0 });
  });

  it('unqueueing something that was never parked is a no-op', () => {
    expect(() => unqueuePending('wordle')).not.toThrow();
    expect(readPending()).toEqual({});
  });
});

// The Supabase SDK is a remote ESM import, so under vitest it genuinely fails to
// load — the same state a player is in when they finish a game offline.
describe('cloud/submitScore when the backend is unreachable', () => {
  beforeEach(() => localStorage.clear());

  it('parks the score when a session exists on this device', async () => {
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    await submitScore('wordle', 12);
    expect(readPending()).toEqual({ wordle: 12 });
  });

  it('keeps the best of several offline runs', async () => {
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    await submitScore('flash', 70);
    await submitScore('flash', 95);
    await submitScore('flash', 80);
    expect(readPending()).toEqual({ flash: 95 });
  });

  it('parks a zero-best backup submit (Word keeps its daily streak)', async () => {
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    await submitScore('word', 0, { backup: true });
    expect(readPending()).toEqual({ word: 0 });
  });

  it('parks nothing for a guest — signed-out players are not on the board', async () => {
    await submitScore('wordle', 12);
    expect(readPending()).toEqual({});
  });

  it('parks nothing for a non-scoring result', async () => {
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    await submitScore('wordle', 0);
    expect(readPending()).toEqual({});
  });
});

describe('cloud/getRank when the backend is unreachable', () => {
  beforeEach(() => localStorage.clear());

  it('reports the score as saved-offline for a signed-in player', async () => {
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    expect(await getRank('wordle', 12)).toEqual({ rank: 0, total: 0, offline: true });
  });

  it('stays silent for a guest and for a non-scoring result', async () => {
    expect(await getRank('wordle', 12)).toBeNull();
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    expect(await getRank('wordle', 0)).toBeNull();
  });
});

describe('cloud/mountRank', () => {
  const modalHtml = '<div id="m"><h2>Time!</h2><div class="row"><button>Again</button></div></div>';
  const settle = async () => {
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
  };

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = modalHtml;
  });

  it('inserts the badge directly above the button row', async () => {
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    const modal = document.querySelector('#m')!;
    mountRank(modal, 'wordle', 12);
    await settle();
    const badge = modal.querySelector('.cloud-rank');
    expect(badge).not.toBeNull();
    expect(badge!.nextElementSibling!.className).toBe('row');
    expect(badge!.textContent).toContain('Saved');
  });

  it('inserts nothing when there is no rank to show', async () => {
    const modal = document.querySelector('#m')!; // guest: no session on this device
    mountRank(modal, 'wordle', 12);
    await settle();
    expect(modal.querySelector('.cloud-rank')).toBeNull();
    expect(modal.children.length).toBe(2);
  });

  it('never throws on a modal that has no button row', async () => {
    document.body.innerHTML = '<div id="bare"></div>';
    localStorage.setItem(SESSION_KEY, '{"access_token":"x"}');
    const bare = document.querySelector('#bare')!;
    expect(() => mountRank(bare, 'wordle', 12)).not.toThrow();
    await settle();
    expect(bare.innerHTML).toBe('');
  });
});
