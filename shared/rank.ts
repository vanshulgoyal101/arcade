// Tiny presentation helpers for showing a player's leaderboard rank in a
// game-over modal. Pure formatting — no cloud calls — so games can render
// whatever `getRank()` / `getDailyRank()` resolve to.

import type { RankInfo } from './cloud';

/** A friendly one-liner, e.g. "#4 of 128 · top 3%". Empty when unranked. */
export function rankText(info: RankInfo | null | undefined): string {
  if (!info || !info.total) return '';
  if (info.rank <= 1) return `🥇 #1 of ${info.total}`;
  if (info.rank <= 3) {
    const medal = info.rank === 2 ? '🥈' : '🥉';
    return `${medal} #${info.rank} of ${info.total}`;
  }
  const pct = Math.max(1, Math.round((info.rank / info.total) * 100));
  return `#${info.rank} of ${info.total} · top ${pct}%`;
}

/** A ready-to-insert badge (or empty string). Style with `.cloud-rank`. */
export function rankBadgeHtml(info: RankInfo | null | undefined, label = 'Global rank'): string {
  const t = rankText(info);
  return t ? `<div class="cloud-rank"><span class="cloud-rank-k">${label}</span><span class="cloud-rank-v">${t}</span></div>` : '';
}
