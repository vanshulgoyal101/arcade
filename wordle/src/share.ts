// Shareable result for Wordle: the classic emoji grid + a themed canvas card.

import { renderShareCard, themeVar, roundRect, type Rect } from '../../shared/card';
import type { Tile, Status } from './game';
import { MAX_GUESSES } from './game';

export { copyToClipboard } from '../../shared/clipboard';
export { shareResult, shareToast } from '../../shared/share';

const EMOJI: Record<Tile, string> = { correct: '🟩', present: '🟨', absent: '⬛' };

/** The spoiler-free emoji grid, Wordle-style. */
export function wordleShareText(results: Tile[][], status: Status): string {
  const score = status === 'won' ? `${results.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = results.map((row) => row.map((t) => EMOJI[t]).join('')).join('\n');
  return `Tiny Wordle ${score}\n\n${grid}\n\nPlay: games.vanshul.com/wordle`;
}

export function wordleShareCard(results: Tile[][], status: Status, streak: number): HTMLCanvasElement {
  const score = status === 'won' ? `${results.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return renderShareCard({
    title: 'Wordle',
    emoji: '🟩',
    stat: score,
    statLabel: status === 'won' ? `Solved · streak ${streak}` : 'So close…',
    tagline: 'Guess the five-letter word in six tries.',
    slug: 'wordle',
    draw: (ctx, a) => drawGrid(ctx, a, results),
  });
}

function drawGrid(ctx: CanvasRenderingContext2D, a: Rect, results: Tile[][]): void {
  const cols = 5;
  const gap = 12;
  const cell = Math.min((a.w - gap * (cols - 1)) / cols, (a.h - gap * (MAX_GUESSES - 1)) / MAX_GUESSES);
  const gridW = cell * cols + gap * (cols - 1);
  const gridH = cell * MAX_GUESSES + gap * (MAX_GUESSES - 1);
  const ox = a.x + (a.w - gridW) / 2;
  const oy = a.y + (a.h - gridH) / 2;

  const colors: Record<Tile, string> = {
    correct: '#6aaa64',
    present: '#c9b458',
    absent: themeVar('--line', '#3a3f4b'),
  };
  const empty = themeVar('--bg', '#0c0d12');
  const emptyLine = themeVar('--line', '#3a3f4b');

  for (let r = 0; r < MAX_GUESSES; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * (cell + gap);
      const y = oy + r * (cell + gap);
      const tile = results[r]?.[c];
      if (tile) {
        ctx.fillStyle = colors[tile];
        roundRect(ctx, x, y, cell, cell, 8);
        ctx.fill();
      } else {
        ctx.fillStyle = empty;
        roundRect(ctx, x, y, cell, cell, 8);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = emptyLine;
        ctx.stroke();
      }
    }
  }
}
