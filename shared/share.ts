// Native share helper. Prefers the Web Share API with an image file so the OS
// share sheet pops up immediately; degrades to sharing text, then to copying
// the image (and finally the text) to the clipboard.

export { copyToClipboard } from './clipboard';
import { copyToClipboard } from './clipboard';

export type ShareOutcome = 'shared' | 'copied-image' | 'copied-text' | 'failed';

export interface ShareResultOptions {
  /** Title for the share sheet. */
  title: string;
  /** Caption text (already includes the score summary). */
  text: string;
  /** Canonical URL of the game. */
  url?: string;
  /** Generated snippet image; when present it is the primary payload. */
  blob?: Blob | null;
  /** File name used for the shared/clipboard image. */
  filename?: string;
}

interface ShareCapableNavigator extends Navigator {
  share(data?: ShareData): Promise<void>;
  canShare(data?: ShareData): boolean;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export async function shareResult(opts: ShareResultOptions): Promise<ShareOutcome> {
  const { title, text, url, blob, filename = 'result.png' } = opts;
  const nav = navigator as ShareCapableNavigator;
  const canShare = typeof nav.canShare === 'function';
  const canNativeShare = typeof nav.share === 'function';
  const caption = url ? `${text}\n${url}` : text;
  const file = blob ? new File([blob], filename, { type: blob.type || 'image/png' }) : null;

  // 1. Native share sheet with the image attached.
  if (file && canNativeShare && canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ title, text: caption, files: [file] });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'shared'; // user opened the sheet then dismissed
    }
  } else if (canNativeShare) {
    // 2. Native share sheet, text only.
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'shared';
    }
  }

  // 3. Copy the image to the clipboard.
  if (blob && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob }),
      ]);
      return 'copied-image';
    } catch {
      // fall through to text
    }
  }

  // 4. Copy the caption text.
  const ok = await copyToClipboard(caption);
  return ok ? 'copied-text' : 'failed';
}

/** Friendly toast message for a share outcome. */
export function shareToast(outcome: ShareOutcome): string {
  switch (outcome) {
    case 'shared':
      return 'Shared!';
    case 'copied-image':
      return 'Image copied to clipboard!';
    case 'copied-text':
      return 'Result copied to clipboard!';
    default:
      return 'Could not share';
  }
}
