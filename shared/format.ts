// Compact score/best display shared by the games and the hub leaderboard, so a
// score reads the same everywhere: 29000 -> "29k", 256000 -> "256k", 1e6 -> "1M".
// SI casing (k lower, M/B upper); values under 1000 are shown exactly.
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function fmtScore(n: number): string {
  const v = Number(n);
  if (!isFinite(v)) return '0';
  if (Math.abs(v) < 1000) return String(v);
  return compact.format(v).replace('K', 'k');
}
