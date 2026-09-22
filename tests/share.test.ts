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
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('cleans up the fallback and restores focus even when legacy copying throws', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    const original = document.execCommand;
    document.execCommand = vi.fn(() => { throw new Error('unavailable'); });
    try {
      expect(await copyToClipboard('private result')).toBe(false);
      expect(document.querySelector('textarea')).toBeNull();
      expect(document.activeElement).toBe(button);
    } finally {
      document.execCommand = original;
    }
  });
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
    Object.assign(navigator, { share: undefined, canShare: undefined, userAgentData: undefined });
  });

  it('opens the native share sheet with the image when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    // The image is only attached on mobile (desktop shares clean text+URL).
    Object.assign(navigator, { share, canShare, userAgentData: { mobile: true } });
    const blob = new Blob(['img'], { type: 'image/png' });
    const outcome = await shareResult({ title: 'T', text: 'hi', url: 'u', blob });
    expect(outcome).toBe('shared');
    expect(share.mock.calls[0][0].files).toHaveLength(1);
  });

  it('shares clean text + URL without the image on desktop', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    // Desktop share targets often paste the temp file path, so no file is attached.
    Object.assign(navigator, { share, canShare: () => true, userAgentData: { mobile: false } });
    const blob = new Blob(['img'], { type: 'image/png' });
    const outcome = await shareResult({ title: 'T', text: 'hi', url: 'u', blob });
    expect(outcome).toBe('shared');
    expect(share.mock.calls[0][0].files).toBeUndefined();
    expect(share.mock.calls[0][0].url).toBe('u');
  });

  it('retries native text sharing when mobile image sharing fails', async () => {
    const share = vi.fn()
      .mockRejectedValueOnce(new DOMException('File sharing unavailable', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    Object.assign(navigator, { share, canShare: () => true, userAgentData: { mobile: true } });
    const blob = new Blob(['img'], { type: 'image/png' });

    expect(await shareResult({ title: 'T', text: 'hi', url: 'u', blob })).toBe('shared');
    expect(share).toHaveBeenCalledTimes(2);
    expect(share.mock.calls[1][0]).toEqual({ title: 'T', text: 'hi', url: 'u' });
  });

  it.each([true, false])('keeps cancellation terminal without falsely reporting success (mobile: %s)', async mobile => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    const writeText = vi.fn();
    Object.assign(navigator, { share, canShare: () => true, userAgentData: { mobile }, clipboard: { writeText } });
    const blob = new Blob(['img'], { type: 'image/png' });
    expect(await shareResult({ title: 'T', text: 'hi', blob })).toBe('cancelled');
    expect(share).toHaveBeenCalledOnce();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to native text when a capability check throws', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share,
      canShare: () => { throw new Error('unavailable'); },
      userAgentData: { mobile: true },
    });
    expect(await shareResult({ title: 'T', text: 'caption', blob: new Blob(['image']) })).toBe('shared');
    expect(share).toHaveBeenCalledExactlyOnceWith({ title: 'T', text: 'caption', url: undefined });
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
    expect(shareToast('cancelled')).toMatch(/cancelled/i);
    expect(shareToast('copied-image')).toMatch(/image/i);
    expect(shareToast('copied-text')).toMatch(/copied/i);
    expect(shareToast('failed')).toMatch(/could not/i);
  });
});
