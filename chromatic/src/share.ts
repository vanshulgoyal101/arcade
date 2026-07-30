// Build a shareable result card for Chromatic.

import { renderShareCard, roundRect, withAlpha, themeVar, type Rect } from '../../shared/card';
import { toCss, type RGB } from './color';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function endlessShareText(score: number, level: number, best: number): string {
  return [
    `Chromatic · Endless`,
    `Score ${score} · reached level ${level}`,
    `Best ${best} 🏆`,
    '',
    'How many can you match?',
  ].join('\n');
}

export function chromaticShareCard(
  score: number,
  level: number,
  best: number,
  target: RGB,
  guess: RGB,
  accuracy: number
): HTMLCanvasElement {
  return renderShareCard({
    title: 'Chromatic',
    emoji: '🎨',
    stat: score.toLocaleString(),
    statLabel: `Reached level ${level} · best ${best}`,
    tagline: 'How many can you match?',
    slug: 'chromatic',
    draw: (ctx, a) => drawSwatches(ctx, a, target, guess, accuracy),
  });
}

function drawSwatches(
  ctx: CanvasRenderingContext2D,
  a: Rect,
  target: RGB,
  guess: RGB,
  accuracy: number
): void {
  const gap = 40;
  const w = (a.w - gap) / 2;
  const h = a.h - 70;
  const labels = ['Target', 'Your match'];
  const colors = [toCss(target), toCss(guess)];
  for (let i = 0; i < 2; i++) {
    const x = a.x + i * (w + gap);
    roundRect(ctx, x, a.y, w, h, 24);
    ctx.fillStyle = colors[i];
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = withAlpha('#ffffff', 0.2);
    ctx.stroke();
    ctx.fillStyle = themeVar('--muted', '#949cb0');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 34px system-ui, -apple-system, sans-serif';
    ctx.fillText(labels[i], x + w / 2, a.y + h + 48);
  }
  const cx = a.x + a.w / 2;
  const cy = a.y + h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 82, 0, Math.PI * 2);
  ctx.fillStyle = '#0c0d12';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = withAlpha('#ffffff', 0.3);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 44px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${Math.round(accuracy)}%`, cx, cy);
}
