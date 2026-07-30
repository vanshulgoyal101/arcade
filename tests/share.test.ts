import { describe, it, expect, vi } from 'vitest';
import { hueShareText } from '../hue-hunt/src/share';
import { echoShareText } from '../echo/src/share';
import { dailyShareText, endlessShareText } from '../chromatic/src/share';
import { copyToClipboard } from '../shared/clipboard';

describe('share text builders', () => {
  it('hueShareText includes the score and level', () => {
    const t = hueShareText(1234, 7, 1000);
    expect(t).toContain('1234');
    expect(t).toContain('7');
  });

  it('echoShareText reports the reached level', () => {
    expect(echoShareText(9, true, 6, 5, true)).toContain('9');
  });

  it('chromatic daily/endless text includes the key numbers', () => {
    expect(dailyShareText(87.5, 3)).toContain('87.5');
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
