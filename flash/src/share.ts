// Shareable result card for Flash.

import { renderShareCard, currentAccent, themeVar, withAlpha, type Rect } from '../../shared/card';
import type { RoundResult } from './game';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function flashShareText(r: RoundResult, bestWpm: number): string {
  const pct = Math.round(r.comprehension * 100);
  const bar = '\u2588'.repeat(Math.round(r.comprehension * 5)).padEnd(5, '\u2591');
  return [
    'Flash \u26a1 speed reading',
    `${r.wpm} wpm \u00b7 ${pct}% understood ${bar}`,
    `Effective ${r.effectiveWpm} wpm \u00b7 best ${Math.max(bestWpm, r.newBest ? r.wpm : bestWpm)}`,
    '',
    'How fast can you read?',
  ].join('\n');
}

export function flashShareCard(r: RoundResult, bestWpm: number): HTMLCanvasElement {
  const pct = Math.round(r.comprehension * 100);
  const best = Math.max(bestWpm, r.newBest ? r.wpm : bestWpm);
  return renderShareCard({
    title: 'Flash',
    emoji: '⚡',
    stat: `${r.wpm} wpm`,
    statLabel: `${pct}% understood · effective ${r.effectiveWpm} · best ${best}`,
    tagline: 'How fast can you read?',
    slug: 'flash',
    draw: (ctx, a) => drawRsvp(ctx, a, 'reading'),
  });
}

function drawRsvp(ctx: CanvasRenderingContext2D, a: Rect, word: string): void {
  const accent = currentAccent();
  const text = themeVar('--text');
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '700 128px system-ui, -apple-system, "Segoe UI", sans-serif';
  const pivot = Math.max(0, Math.round(word.length * 0.4) - 1);
  const pre = word.slice(0, pivot);
  const piv = word[pivot];
  const post = word.slice(pivot + 1);
  const preW = ctx.measureText(pre).width;
  const pivW = ctx.measureText(piv).width;
  const startX = cx - preW - pivW / 2;
  ctx.fillStyle = text;
  ctx.fillText(pre, startX, cy);
  ctx.fillStyle = accent;
  ctx.fillText(piv, startX + preW, cy);
  ctx.fillStyle = text;
  ctx.fillText(post, startX + preW + pivW, cy);
  const pcx = startX + preW + pivW / 2;
  ctx.strokeStyle = withAlpha(accent, 0.7);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(pcx, a.y + 12);
  ctx.lineTo(pcx, a.y + 64);
  ctx.moveTo(pcx, a.y + a.h - 64);
  ctx.lineTo(pcx, a.y + a.h - 12);
  ctx.stroke();
}
