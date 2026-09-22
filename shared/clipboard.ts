// Shared clipboard helper: async Clipboard API with a legacy fallback.

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for insecure contexts / older browsers.
    const focused = document.activeElement;
    const ta = document.createElement('textarea');
    try {
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      ta.remove();
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    }
  }
}
