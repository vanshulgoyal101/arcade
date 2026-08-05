import { describe, it, expect } from 'vitest';
import { rankText, rankBadgeHtml } from '../shared/rank';
import { codedAvatarSvg, AVATAR_SVG } from '../shared/avatars';

describe('shared/rank · rankText', () => {
  it('returns empty for missing or empty boards', () => {
    expect(rankText(null)).toBe('');
    expect(rankText(undefined)).toBe('');
    expect(rankText({ rank: 5, total: 0 })).toBe('');
  });

  it('medals the top three', () => {
    expect(rankText({ rank: 1, total: 128 })).toBe('🥇 #1 of 128');
    expect(rankText({ rank: 2, total: 128 })).toBe('🥈 #2 of 128');
    expect(rankText({ rank: 3, total: 128 })).toBe('🥉 #3 of 128');
  });

  it('shows a percentile below the podium', () => {
    expect(rankText({ rank: 4, total: 100 })).toBe('#4 of 100 · top 4%');
  });

  it('clamps the percentile to at least 1% and at most 100%', () => {
    expect(rankText({ rank: 5, total: 1000 })).toBe('#5 of 1000 · top 1%'); // 0.5% rounds up to 1
    expect(rankText({ rank: 1000, total: 1000 })).toBe('#1000 of 1000 · top 100%');
  });
});

describe('shared/rank · rankBadgeHtml', () => {
  it('renders nothing when there is no rank', () => {
    expect(rankBadgeHtml(null)).toBe('');
    expect(rankBadgeHtml({ rank: 0, total: 0 })).toBe('');
  });

  it('nudges signed-out players to sign in instead of showing a rank', () => {
    const html = rankBadgeHtml({ rank: 0, total: 0, signedOut: true });
    expect(html).toContain('Sign in');
    expect(html).toContain('__arcadeSignIn');
    expect(html).not.toContain('of 0');
  });

  it('renders the label and rank text for a ranked player', () => {
    const html = rankBadgeHtml({ rank: 1, total: 50 }, 'Global rank');
    expect(html).toContain('Global rank');
    expect(html).toContain('🥇 #1 of 50');
  });
});

describe('shared/avatars · codedAvatarSvg', () => {
  it('rejects anything that is not an "a:<known-id>" code', () => {
    expect(codedAvatarSvg(null)).toBeNull();
    expect(codedAvatarSvg(undefined)).toBeNull();
    expect(codedAvatarSvg('🎮')).toBeNull();
    expect(codedAvatarSvg('panda')).toBeNull(); // missing "a:" prefix
    expect(codedAvatarSvg('a:unknown')).toBeNull();
  });

  it('wraps a known avatar id in standalone svg markup', () => {
    const svg = codedAvatarSvg('a:panda');
    expect(svg).not.toBeNull();
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain(AVATAR_SVG.panda);
    expect(svg!.endsWith('</svg>')).toBe(true);
  });

  it('every avatar id resolves to a code that renders', () => {
    for (const id of Object.keys(AVATAR_SVG)) {
      expect(codedAvatarSvg(`a:${id}`)).toContain('<svg');
    }
  });
});
