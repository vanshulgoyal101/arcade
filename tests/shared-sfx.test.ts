import { describe, it, expect, beforeEach } from 'vitest';
import { loadMuted, saveMuted, setMuted, isMuted } from '../shared/sfx';

beforeEach(() => {
  localStorage.clear();
  setMuted(false);
});

describe('shared/sfx · mute persistence', () => {
  it('defaults to not muted when nothing is stored', () => {
    expect(loadMuted('flash.muted')).toBe(false);
  });

  it('round-trips a saved preference', () => {
    saveMuted('flash.muted', true);
    expect(loadMuted('flash.muted')).toBe(true);
    saveMuted('flash.muted', false);
    expect(loadMuted('flash.muted')).toBe(false);
  });

  it('keeps per-game keys independent', () => {
    saveMuted('word.muted', true);
    expect(loadMuted('word.muted')).toBe(true);
    expect(loadMuted('sprint.muted')).toBe(false);
  });

  it('treats any non-"1" stored value as not muted', () => {
    localStorage.setItem('flash.muted', 'garbage');
    expect(loadMuted('flash.muted')).toBe(false);
  });
});

describe('shared/sfx · runtime mute flag', () => {
  it('reflects the value set via setMuted (re-exported from audio)', () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });
});
