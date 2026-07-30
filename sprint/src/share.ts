// Shareable result card for Sprint.

import type { Stats } from './game';

export function sprintShareText(stats: Stats, duration: number, best: number, newBest: boolean): string {
  return [
    'Sprint ⌨️ typing',
    `${stats.wpm} wpm · ${stats.accuracy}% acc (${duration}s)`,
    newBest ? '🏆 New best!' : `Best ${best} wpm`,
    '',
    'How fast can you type?',
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
