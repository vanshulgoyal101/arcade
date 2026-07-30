// Shareable result card for Where.

export function whereShareText(score: number, mode: string, best: number, newBest: boolean): string {
  return [
    'Where 🗺️ geography',
    `Score ${score} (${mode})`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'How well do you know the world?',
  ].join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
