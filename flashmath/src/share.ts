// Shareable result card for Flashmath.

import { renderShareCard, currentAccent, themeVar, type Rect } from '../../shared/card';
import { makeProblem, type Problem } from './game';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function mathShareText(score: number, solved: number, best: number, newBest: boolean): string {
  return [
    'Flashmath 🧮',
    `Score ${score} · ${solved} solved`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'How fast is your mental math?',
  ].join('\n');
}

export function mathShareCard(
  score: number,
  solved: number,
  level: number,
  best: number
): HTMLCanvasElement {
  const problem = makeProblem(Math.max(1, level));
  return renderShareCard({
    title: 'Flashmath',
    emoji: '🧮',
    stat: score.toLocaleString(),
    statLabel: `${solved} solved · reached level ${level} · best ${best}`,
    tagline: 'How fast is your mental math?',
    slug: 'flashmath',
    draw: (ctx, a) => drawProblem(ctx, a, problem),
  });
}

function drawProblem(ctx: CanvasRenderingContext2D, a: Rect, p: Problem): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const left = `${p.a} ${p.op} ${p.b} = `;
  const ans = String(p.answer);
  let fs = 128;
  const measure = () => {
    ctx.font = `800 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    return ctx.measureText(left).width + ctx.measureText(ans).width;
  };
  while (measure() > a.w && fs > 60) fs -= 6;
  const lw = ctx.measureText(left).width;
  const aw = ctx.measureText(ans).width;
  const startX = a.x + (a.w - (lw + aw)) / 2;
  const cy = a.y + a.h / 2;
  ctx.fillStyle = themeVar('--text');
  ctx.fillText(left, startX, cy);
  ctx.fillStyle = currentAccent();
  ctx.fillText(ans, startX + lw, cy);
}
