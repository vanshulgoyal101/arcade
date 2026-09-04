// Shareable result card for 2048.

import { renderShareCard, roundRect, type Rect } from '../../shared/card';
import { SIZE, type Board } from './game';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function shareText(score: number, bestTile: number, best: number): string {
  const medal = score >= best && score > 0 ? '🏆 New best!' : `Best ${best}`;
  return ['2048 🔢', `Score ${score} · reached the ${bestTile} tile`, medal, '', 'Can you reach 2048?'].join('\n');
}

export function shareCard(board: Board, score: number, bestTile: number, best: number): HTMLCanvasElement {
  return renderShareCard({
    title: '2048',
    emoji: '🔢',
    stat: score.toLocaleString(),
    statLabel: `Reached ${bestTile} · best ${best.toLocaleString()}`,
    tagline: 'Slide, merge, reach 2048',
    slug: '2048',
    draw: (ctx, a) => drawBoard(ctx, a, board),
  });
}

// Tile colours ramp with the exponent so the card reads like the live board.
function tileFill(v: number): string {
  if (!v) return 'rgba(255,255,255,.05)';
  const step = Math.min(11, Math.log2(v));
  return `hsl(${34 - step * 3} ${58 + step * 3}% ${Math.max(38, 72 - step * 3)}%)`;
}

function drawBoard(ctx: CanvasRenderingContext2D, a: Rect, board: Board): void {
  const gap = 14;
  const cell = Math.floor((Math.min(a.w, a.h) - gap * (SIZE - 1)) / SIZE);
  const span = cell * SIZE + gap * (SIZE - 1);
  const x0 = a.x + (a.w - span) / 2;
  const y0 = a.y + (a.h - span) / 2;

  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = board[i];
    const x = x0 + (i % SIZE) * (cell + gap);
    const y = y0 + Math.floor(i / SIZE) * (cell + gap);
    ctx.fillStyle = tileFill(v);
    roundRect(ctx, x, y, cell, cell, 12);
    ctx.fill();
    if (!v) continue;
    ctx.fillStyle = v <= 4 ? '#3b3324' : '#fff';
    ctx.font = `800 ${Math.floor(cell / (String(v).length > 3 ? 3.4 : 2.4))}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(v), x + cell / 2, y + cell / 2 + 1);
  }
}
