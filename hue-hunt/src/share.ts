// Shareable result card for Hue Hunt.

import { renderShareCard, roundRect, withAlpha, type Rect } from '../../shared/card';
import { hslCss, type Round } from './game';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function hueShareText(score: number, level: number, best: number): string {
  const medal = score >= best && score > 0 ? '🏆 New best!' : `Best ${best}`;
  return [
    'Hue Hunt 🎯',
    `Score ${score} · reached level ${level}`,
    medal,
    '',
    'Can you spot the odd colour?',
  ].join('\n');
}

export function hueShareCard(
  round: Round,
  score: number,
  level: number,
  best: number
): HTMLCanvasElement {
  return renderShareCard({
    title: 'Hue Hunt',
    emoji: '🎯',
    stat: score.toLocaleString(),
    statLabel: `Reached level ${level} · best ${best}`,
    tagline: 'Spot the odd colour',
    slug: 'hue-hunt',
    draw: (ctx, a) => drawGrid(ctx, a, round),
  });
}

function drawGrid(ctx: CanvasRenderingContext2D, a: Rect, round: Round): void {
  const n = round.size;
  const gap = n > 5 ? 10 : 14;
  const cell = Math.floor(Math.min((a.w - gap * (n - 1)) / n, (a.h - gap * (n - 1)) / n));
  const grid = cell * n + gap * (n - 1);
  const ox = a.x + (a.w - grid) / 2;
  const oy = a.y + (a.h - grid) / 2;
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const x = ox + c * (cell + gap);
    const y = oy + r * (cell + gap);
    roundRect(ctx, x, y, cell, cell, Math.min(16, cell / 4));
    ctx.fillStyle = hslCss(i === round.oddIndex ? round.odd : round.base);
    ctx.fill();
  }
  // Ring the odd tile.
  const or = Math.floor(round.oddIndex / n);
  const oc = round.oddIndex % n;
  const ox2 = ox + oc * (cell + gap);
  const oy2 = oy + or * (cell + gap);
  ctx.lineWidth = Math.max(4, cell / 12);
  ctx.strokeStyle = '#ffffff';
  roundRect(ctx, ox2 - 3, oy2 - 3, cell + 6, cell + 6, Math.min(18, cell / 4));
  ctx.stroke();
  ctx.strokeStyle = withAlpha('#000000', 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();
}
