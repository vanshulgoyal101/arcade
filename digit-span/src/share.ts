// Shareable result card for Digit Span.

import { renderShareCard, roundRect, withAlpha, themeVar, type Rect } from '../../shared/card';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function digitShareText(reached: number, mode: string, best: number, newBest: boolean): string {
  return [
    'Digit Span 🔢',
    `Recalled ${reached} digits (${mode})`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'How many can you hold in mind?',
  ].join('\n');
}

export function digitShareCard(
  digits: number[],
  reached: number,
  mode: string,
  best: number
): HTMLCanvasElement {
  return renderShareCard({
    title: 'Digit Span',
    emoji: '🔢',
    stat: String(reached),
    statLabel: `Digits recalled · ${mode} · best ${best}`,
    tagline: 'How many can you hold in mind?',
    slug: 'digit-span',
    draw: (ctx, a) => drawDigits(ctx, a, digits),
  });
}

function drawDigits(ctx: CanvasRenderingContext2D, a: Rect, digits: number[]): void {
  const count = Math.max(1, digits.length);
  const perRow = count > 6 ? Math.ceil(count / 2) : count;
  const rows = Math.ceil(count / perRow);
  const gap = 18;
  const size = Math.min((a.w - gap * (perRow - 1)) / perRow, (a.h - gap * (rows - 1)) / rows, 150);
  const gridW = size * perRow + gap * (perRow - 1);
  const gridH = size * rows + gap * (rows - 1);
  const ox = a.x + (a.w - gridW) / 2;
  const oy = a.y + (a.h - gridH) / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  digits.forEach((d, i) => {
    const x = ox + (i % perRow) * (size + gap);
    const y = oy + Math.floor(i / perRow) * (size + gap);
    roundRect(ctx, x, y, size, size, 18);
    ctx.fillStyle = withAlpha('#000000', 0.25);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = withAlpha(themeVar('--muted', '#949cb0'), 0.5);
    ctx.stroke();
    ctx.fillStyle = themeVar('--text');
    ctx.font = `700 ${Math.round(size * 0.5)}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(String(d), x + size / 2, y + size / 2 + 2);
  });
}
