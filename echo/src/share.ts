// Shareable result card for Echo.

export { copyToClipboard } from '../../shared/clipboard';

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
