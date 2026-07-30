// Shareable result card for Interval.

import { renderShareCard, currentAccent, themeVar, withAlpha, type Rect } from '../../shared/card';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function intervalShareText(score: number, best: number, newBest: boolean): string {
  return [
    'Interval 🎹 ear training',
    `Score ${score}`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'Can you name what you hear?',
  ].join('\n');
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
function noteName(midi: number): string {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

export function intervalShareCard(
  score: number,
  best: number,
  rootMidi: number,
  semis: number,
  name: string
): HTMLCanvasElement {
  return renderShareCard({
    title: 'Interval',
    emoji: '🎹',
    stat: String(score),
    statLabel: `Ear training · best ${best}`,
    tagline: 'Can you name what you hear?',
    slug: 'interval',
    draw: (ctx, a) => drawInterval(ctx, a, rootMidi, semis, name),
  });
}

function drawInterval(
  ctx: CanvasRenderingContext2D,
  a: Rect,
  rootMidi: number,
  semis: number,
  name: string
): void {
  const accent = currentAccent();
  const text = themeVar('--text');
  const cy = a.y + a.h * 0.4;
  const r = 92;
  const x1 = a.x + a.w * 0.3;
  const x2 = a.x + a.w * 0.7;
  ctx.strokeStyle = withAlpha(accent, 0.6);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x1, cy);
  ctx.quadraticCurveTo((x1 + x2) / 2, cy - 120, x2, cy);
  ctx.stroke();
  const notes: Array<[number, number, boolean]> = [
    [x1, rootMidi, false],
    [x2, rootMidi + semis, true],
  ];
  for (const [x, midi, fill] of notes) {
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill ? accent : withAlpha(text, 0.12);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = withAlpha(accent, 0.8);
    ctx.stroke();
    ctx.fillStyle = fill ? '#0c0d12' : text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 46px system-ui, -apple-system, sans-serif';
    ctx.fillText(noteName(midi), x, cy);
  }
  ctx.fillStyle = text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 64px system-ui, -apple-system, sans-serif';
  ctx.fillText(name, a.x + a.w / 2, a.y + a.h - 40);
}
