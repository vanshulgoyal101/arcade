// Shareable result card for Sprint.

import { renderShareCard, currentAccent, themeVar, type Rect } from '../../shared/card';
import type { Stats } from './game';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function sprintShareText(stats: Stats, duration: number, best: number, newBest: boolean): string {
  return [
    'Sprint ⌨️ typing',
    `${stats.wpm} wpm · ${stats.accuracy}% acc (${duration}s)`,
    newBest ? '🏆 New best!' : `Best ${best} wpm`,
    '',
    'How fast can you type?',
  ].join('\n');
}

export function sprintShareCard(stats: Stats, duration: number, best: number): HTMLCanvasElement {
  return renderShareCard({
    title: 'Sprint',
    emoji: '⌨️',
    stat: `${stats.wpm} wpm`,
    statLabel: `${stats.accuracy}% accuracy · ${duration}s · best ${best}`,
    tagline: 'How fast can you type?',
    slug: 'sprint',
    draw: (ctx, a) => drawTyping(ctx, a),
  });
}

function drawTyping(ctx: CanvasRenderingContext2D, a: Rect): void {
  const words = ['the', 'quick', 'brown', 'fox', 'jumps'];
  const typed = 3;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 84px "SF Mono", ui-monospace, Menlo, monospace';
  const gap = ctx.measureText(' ').width;
  const total = words.reduce((s, w) => s + ctx.measureText(w).width, 0) + gap * (words.length - 1);
  let x = a.x + (a.w - total) / 2;
  const y = a.y + a.h / 2;
  const accent = currentAccent();
  const text = themeVar('--text');
  const muted = themeVar('--muted', '#949cb0');
  words.forEach((w, i) => {
    if (i === typed) {
      ctx.fillStyle = accent;
      ctx.fillRect(x - gap / 2 - 4, y - 46, 8, 92);
    }
    ctx.fillStyle = i < typed ? muted : text;
    ctx.fillText(w, x, y);
    x += ctx.measureText(w).width + gap;
  });
}
