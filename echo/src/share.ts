// Shareable result card for Echo.

import { renderShareCard, roundRect, withAlpha, type Rect } from '../../shared/card';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function echoShareText(
  reached: number,
  strict: boolean,
  pads: number,
  best: number,
  newBest: boolean
): string {
  const tags = [strict ? 'Strict' : 'Forgiving', `${pads}-pad`].join(' · ');
  return [
    'Echo 🔊',
    `Reached level ${reached}  (${tags})`,
    newBest ? `🏆 New best!` : `Best ${best}`,
    '',
    'How long is your memory?',
  ].join('\n');
}

const PAD_COLORS = ['#22d3ee', '#f472b6', '#a3e635', '#fbbf24', '#c084fc', '#fb7185'];

export function echoShareCard(
  reached: number,
  strict: boolean,
  pads: number,
  best: number
): HTMLCanvasElement {
  return renderShareCard({
    title: 'Echo',
    emoji: '🔊',
    stat: String(reached),
    statLabel: `Levels recalled · ${strict ? 'Strict' : 'Forgiving'} · ${pads}-pad · best ${best}`,
    tagline: 'How long is your memory?',
    slug: 'echo',
    draw: (ctx, a) => drawPads(ctx, a, pads),
  });
}

function drawPads(ctx: CanvasRenderingContext2D, a: Rect, pads: number): void {
  const cols = pads >= 6 ? 3 : 2;
  const rows = Math.ceil(pads / cols);
  const gap = 24;
  const size = Math.min((a.w - gap * (cols - 1)) / cols, (a.h - gap * (rows - 1)) / rows);
  const gridW = size * cols + gap * (cols - 1);
  const gridH = size * rows + gap * (rows - 1);
  const ox = a.x + (a.w - gridW) / 2;
  const oy = a.y + (a.h - gridH) / 2;
  for (let i = 0; i < pads; i++) {
    const x = ox + (i % cols) * (size + gap);
    const y = oy + Math.floor(i / cols) * (size + gap);
    roundRect(ctx, x, y, size, size, 28);
    ctx.fillStyle = withAlpha(PAD_COLORS[i % PAD_COLORS.length], 0.85);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = withAlpha('#ffffff', 0.25);
    ctx.stroke();
  }
}
