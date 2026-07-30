// Shareable result card for Hue Hunt.

export { copyToClipboard } from '../../shared/clipboard';

export function hueShareText(score: number, level: number, best: number): string {
  const medal = score >= best && score > 0 ? '🏆 New best!' : `Best ${best}`;
  return [
    'Hue Hunt 🎯',
    `Score ${score} · reached level ${level}`,
    medal,
    '',
    'Can you spot the odd colour?',
  ].join('\n');
}
