// Shareable result text for Word of the Day.

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

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
