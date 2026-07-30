// Shareable result card for Flash.

import type { RoundResult } from './game';

export { copyToClipboard } from '../../shared/clipboard';

export function flashShareText(r: RoundResult, bestWpm: number): string {
  const pct = Math.round(r.comprehension * 100);
  const bar = '\u2588'.repeat(Math.round(r.comprehension * 5)).padEnd(5, '\u2591');
  return [
    'Flash \u26a1 speed reading',
    `${r.wpm} wpm \u00b7 ${pct}% understood ${bar}`,
    `Effective ${r.effectiveWpm} wpm \u00b7 best ${Math.max(bestWpm, r.newBest ? r.wpm : bestWpm)}`,
    '',
    'How fast can you read?',
  ].join('\n');
}
