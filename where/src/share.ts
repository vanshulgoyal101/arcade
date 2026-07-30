// Shareable result card for Where.

import { renderShareCard, themeVar, type Rect } from '../../shared/card';
import { flagEmoji } from './content';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function whereShareText(score: number, mode: string, best: number, newBest: boolean): string {
  return [
    'Where 🗺️ geography',
    `Score ${score} (${mode})`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'How well do you know the world?',
  ].join('\n');
}

export function whereShareCard(
  score: number,
  mode: string,
  best: number,
  country: { name: string; capital: string; code: string }
): HTMLCanvasElement {
  return renderShareCard({
    title: 'Where',
    emoji: '🗺️',
    stat: String(score),
    statLabel: `${mode === 'flag' ? 'Flags' : 'Capitals'} · best ${best}`,
    tagline: 'How well do you know the world?',
    slug: 'where',
    draw: (ctx, a) => drawCountry(ctx, a, country),
  });
}

function drawCountry(
  ctx: CanvasRenderingContext2D,
  a: Rect,
  country: { name: string; capital: string; code: string }
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '220px "Apple Color Emoji", "Segoe UI Emoji", system-ui, sans-serif';
  ctx.fillText(flagEmoji(country.code), a.x + a.w / 2, a.y + a.h * 0.36);
  ctx.fillStyle = themeVar('--text');
  ctx.font = '700 72px system-ui, -apple-system, sans-serif';
  ctx.fillText(country.name, a.x + a.w / 2, a.y + a.h * 0.78);
  ctx.fillStyle = themeVar('--muted', '#949cb0');
  ctx.font = '400 40px system-ui, -apple-system, sans-serif';
  ctx.fillText(country.capital, a.x + a.w / 2, a.y + a.h * 0.93);
}
