// Shareable result card for Interval.

export function intervalShareText(score: number, best: number, newBest: boolean): string {
  return [
    'Interval 🎹 ear training',
    `Score ${score}`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'Can you name what you hear?',
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
