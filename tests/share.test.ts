import { describe, it, expect, vi, afterEach } from 'vitest';
import { hueShareText } from '../hue-hunt/src/share';
import { echoShareText } from '../echo/src/share';
import { endlessShareText } from '../chromatic/src/share';
import { copyToClipboard } from '../shared/clipboard';
import { shareResult, shareToast } from '../shared/share';

describe('share text builders', () => {
  it('hueShareText includes the score and level', () => {
    const t = hueShareText(1234, 7, 1000);
    expect(t).toContain('1234');
    expect(t).toContain('7');
  });

  it('echoShareText reports the reached level', () => {
    expect(echoShareText(9, true, 6, 5, true)).toContain('9');
  });

  it('chromatic endless text includes the key numbers', () => {
    expect(endlessShareText(50, 4, 60)).toContain('50');
  });
});

describe('shared/clipboard', () => {
  it('uses the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const ok = await copyToClipboard('hello');
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back without throwing when the async API rejects', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: () => Promise.reject(new Error('denied')) },
    });
    const ok = await copyToClipboard('x');
    expect(typeof ok).toBe('boolean');
  });
});

describe('shared/share', () => {
  afterEach(() => {
    Object.assign(navigator, { share: undefined, canShare: undefined });
  });

  it('opens the native share sheet with the image when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.assign(navigator, { share, canShare });
    const blob = new Blob(['img'], { type: 'image/png' });
    const outcome = await shareResult({ title: 'T', text: 'hi', url: 'u', blob });
    expect(outcome).toBe('shared');
    expect(share.mock.calls[0][0].files).toHaveLength(1);
  });

  it('reports a user-cancelled share sheet as cancelled, not shared', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    Object.assign(navigator, { share, canShare: () => true });
    const blob = new Blob(['img'], { type: 'image/png' });
    expect(await shareResult({ title: 'T', text: 'hi', blob })).toBe('cancelled');
  });

  it('falls back to copying the caption text when nothing else is available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: undefined,
      canShare: undefined,
      clipboard: { writeText },
    });
    const blob = new Blob(['img'], { type: 'image/png' });
    const outcome = await shareResult({ title: 'T', text: 'hi', url: 'u', blob });
    expect(outcome).toBe('copied-text');
    expect(writeText).toHaveBeenCalledWith('hi\nu');
  });

  it('maps outcomes to friendly toast messages', () => {
    expect(shareToast('shared')).toMatch(/shared/i);
    expect(shareToast('copied-image')).toMatch(/image/i);
    expect(shareToast('copied-text')).toMatch(/copied/i);
    expect(shareToast('failed')).toMatch(/could not/i);
  });
});
