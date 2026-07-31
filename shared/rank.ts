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
  const pct = Math.min(100, Math.max(1, Math.round((info.rank / info.total) * 100)));
  return `#${info.rank} of ${info.total} · top ${pct}%`;
}

/** A ready-to-insert badge (or empty string). Self-styled via theme vars. */
export function rankBadgeHtml(info: RankInfo | null | undefined, label = 'Global rank'): string {
  const pill =
    'display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;' +
    'background:var(--bg,#0c0d12);border:1px solid var(--line,#2a2d3a);font-size:.9rem';
  // Signed-out players get a gentle sign-in nudge instead of a (meaningless) rank.
  if (info && info.signedOut) {
    return (
      `<div class="cloud-rank" style="text-align:center;margin:12px 0 0">` +
      `<button type="button" onclick="window.__arcadeSignIn&&window.__arcadeSignIn()" style="${pill};cursor:pointer;font-family:inherit">` +
      `<span style="color:var(--accent,#fb7185);font-weight:800">Sign in</span>` +
      `<span style="color:var(--muted,#949cb0);font-weight:600">to join the leaderboard</span>` +
      `</button></div>`
    );
  }
  const t = rankText(info);
  if (!t) return '';
  return (
    `<div class="cloud-rank" style="text-align:center;margin:12px 0 0">` +
    `<span style="${pill}">` +
    `<span style="color:var(--muted,#949cb0);font-weight:600">${label}</span>` +
    `<span style="color:var(--accent,#fb7185);font-weight:800">${t}</span></span></div>`
  );
}
