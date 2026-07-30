// Build a shareable, spoiler-free emoji result card.

import { todayKey } from './color';

export { copyToClipboard } from '../../shared/clipboard';

function bar(acc: number): string {
  // Five blocks; filled proportionally to accuracy.
  const filled = Math.round((acc / 100) * 5);
  const blocks: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < filled) {
      blocks.push(acc >= 97 ? '🟩' : acc >= 90 ? '🟨' : '🟧');
    } else {
      blocks.push('⬛');
    }
  }
  return blocks.join('');
}

export function dailyShareText(acc: number, streak: number): string {
  return [
    `Chromatic ${todayKey()}`,
    `Match ${acc.toFixed(1)}%  ${bar(acc)}`,
    `Streak ${streak} 🔥`,
    '',
    'Can you match the colour?',
  ].join('\n');
}

export function endlessShareText(score: number, level: number, best: number): string {
  return [
    `Chromatic · Endless`,
    `Score ${score} · reached level ${level}`,
    `Best ${best} 🏆`,
    '',
    'How many can you match?',
  ].join('\n');
}
