// Build a shareable, spoiler-free emoji result card.

export { copyToClipboard } from '../../shared/clipboard';

export function endlessShareText(score: number, level: number, best: number): string {
  return [
    `Chromatic · Endless`,
    `Score ${score} · reached level ${level}`,
    `Best ${best} 🏆`,
    '',
    'How many can you match?',
  ].join('\n');
}
