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

// Minimal line-style medal for the rendered top-3 badge below (rankText above
// stays emoji-based — it's a plain-text formatter also used standalone).
const MEDAL_COLOR = ['#facc15', '#cbd5e1', '#c2793d']; // gold, silver, bronze
function medalIcon(rank: number): string {
  return (
    `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" ` +
    `stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;color:${MEDAL_COLOR[rank - 1]}" aria-hidden="true">` +
    `<circle cx="12" cy="9" r="5.2"/><path d="M9 13.5 7 21l5-2.4 5 2.4-2-7.5"/></svg>`
  );
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
  // Offline but signed in: the score is saved locally and will be sent later, so
  // reassure rather than showing an empty space where the rank normally sits.
  if (info && info.offline) {
    return (
      `<div class="cloud-rank" style="text-align:center;margin:12px 0 0">` +
      `<span style="${pill}">` +
      `<span style="color:var(--accent,#fb7185);font-weight:800">Saved</span>` +
      `<span style="color:var(--muted,#949cb0);font-weight:600">syncs when you’re back online</span>` +
      `</span></div>`
    );
  }
  // Podium ranks get a coloured medal icon instead of rankText's emoji prefix.
  if (info && info.rank >= 1 && info.rank <= 3 && info.total) {
    return (
      `<div class="cloud-rank" style="text-align:center;margin:12px 0 0">` +
      `<span style="${pill}">` +
      `<span style="color:var(--muted,#949cb0);font-weight:600">${label}</span>` +
      `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--accent,#fb7185);font-weight:800">` +
      `${medalIcon(info.rank)}#${info.rank} of ${info.total}</span></span></div>`
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
