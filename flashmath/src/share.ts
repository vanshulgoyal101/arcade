// Shareable result card for Flashmath.

export function mathShareText(score: number, solved: number, best: number, newBest: boolean): string {
  return [
    'Flashmath 🧮',
    `Score ${score} · ${solved} solved`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'How fast is your mental math?',
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
