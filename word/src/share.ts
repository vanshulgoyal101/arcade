// Shareable result text for Word of the Day.

import { renderShareCard, currentAccent, themeVar, wrapText, type Rect } from '../../shared/card';
import type { Word } from './content';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

export function dailyShareText(word: string, correct: boolean, streak: number): string {
  return [
    'Word of the Day 📖',
    `${correct ? '✅' : '📖'} ${word}`,
    `Streak ${streak} 🔥`,
    '',
    'Grow your vocabulary, one word a day.',
  ].join('\n');
}

export function practiceShareText(score: number, best: number, newBest: boolean): string {
  return [
    'Word of the Day 📖 — Practice',
    `Score ${score}`,
    newBest ? '🏆 New best!' : `Best ${best}`,
    '',
    'How many word meanings can you get?',
  ].join('\n');
}

export function dailyShareCard(word: Word, streak: number): HTMLCanvasElement {
  return renderShareCard({
    title: 'Word of the Day',
    emoji: '📖',
    stat: `${streak} 🔥`,
    statLabel: 'Day streak',
    tagline: 'Grow your vocabulary, one word a day.',
    slug: 'word',
    draw: (ctx, a) => drawWord(ctx, a, word),
  });
}

export function practiceShareCard(word: Word, score: number, best: number): HTMLCanvasElement {
  return renderShareCard({
    title: 'Word · Practice',
    emoji: '📖',
    stat: String(score),
    statLabel: `Meanings matched · best ${best}`,
    tagline: 'How many word meanings can you get?',
    slug: 'word',
    draw: (ctx, a) => drawWord(ctx, a, word),
  });
}

function drawWord(ctx: CanvasRenderingContext2D, a: Rect, word: Word): void {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let y = a.y + 96;
  ctx.fillStyle = currentAccent();
  ctx.font = '800 88px Georgia, "Times New Roman", serif';
  ctx.fillText(word.word, a.x, y);
  y += 52;
  ctx.fillStyle = themeVar('--muted', '#949cb0');
  ctx.font = 'italic 400 38px Georgia, serif';
  ctx.fillText(`${word.pos} · ${word.say}`, a.x, y);
  y += 82;
  ctx.fillStyle = themeVar('--text');
  ctx.font = '400 46px system-ui, -apple-system, sans-serif';
  for (const line of wrapText(ctx, word.definition, a.w)) {
    ctx.fillText(line, a.x, y);
    y += 60;
  }
}
