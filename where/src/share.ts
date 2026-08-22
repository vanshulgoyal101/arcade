// Shareable result card for Where.

import { renderShareCard, themeVar, type Rect } from '../../shared/card';
import { flagEmoji } from './content';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function whereShareText(
  score: number,
  mode: string,
  difficulty: string,
  best: number,
  newBest: boolean
): string {
  const label = `${difficulty === 'hard' ? 'Hard' : 'Easy'} · ${mode === 'flag' ? 'Flags' : 'Capitals'}`;
  return [
    'Where 🗺️ geography',
    `Score ${score} (${label})`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'How well do you know the world?',
  ].join('\n');
}

export function whereShareCard(
  score: number,
  mode: string,
  difficulty: string,
  best: number,
  country: { name: string; capital: string; code: string },
  flag?: HTMLImageElement | null
): HTMLCanvasElement {
  const label = `${difficulty === 'hard' ? 'Hard' : 'Easy'} · ${mode === 'flag' ? 'Flags' : 'Capitals'}`;
  return renderShareCard({
    title: 'Where',
    emoji: '🗺️',
    stat: String(score),
    statLabel: `${label} · best ${best}`,
    tagline: 'How well do you know the world?',
    slug: 'where',
    draw: (ctx, a) => drawCountry(ctx, a, country, flag),
  });
}

function drawCountry(
  ctx: CanvasRenderingContext2D,
  a: Rect,
  country: { name: string; capital: string; code: string },
  flag?: HTMLImageElement | null
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = a.x + a.w / 2;
  const cy = a.y + a.h * 0.36;
  if (flag && flag.complete && flag.naturalWidth > 0) {
    // Real flag image (regional-indicator emoji don't render on Windows), fitted
    // into the upper area with its natural aspect ratio.
    const r = Math.min((a.w * 0.62) / flag.naturalWidth, (a.h * 0.42) / flag.naturalHeight);
    const w = flag.naturalWidth * r;
    const h = flag.naturalHeight * r;
    ctx.drawImage(flag, cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.font = '220px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
    ctx.fillText(flagEmoji(country.code), cx, cy);
  }
  ctx.fillStyle = themeVar('--text');
  ctx.font = '700 72px system-ui, -apple-system, sans-serif';
  ctx.fillText(country.name, a.x + a.w / 2, a.y + a.h * 0.78);
  ctx.fillStyle = themeVar('--muted', '#949cb0');
  ctx.font = '400 40px system-ui, -apple-system, sans-serif';
  ctx.fillText(country.capital, a.x + a.w / 2, a.y + a.h * 0.93);
}
