// Tiny Arcade — optional Google sign-in (Supabase) + cloud score sync + leaderboard.
// Hub-only: every game shares this origin, so the localStorage scores and the
// Supabase session are shared across all games. Signing in here saves and syncs
// every game's best score. No build step — this is a plain ES module.

const SUPABASE_URL = 'https://tmngedsmgcgbkbkmsnsw.supabase.co';
// Publishable (public) key — safe to ship; row-level security guards the data.
const SUPABASE_KEY = 'sb_publishable_qFZySs9l19_7bISrvmLHIw_vwt-DUdx';

// Each game's localStorage key + how to read its single headline best (all
// "higher is better"). `data` (the whole blob) is what we sync for restore.
const GAMES = [
  { slug: 'hue-hunt',   name: 'Hue Hunt',       emoji: '🎯', key: 'huehunt.v2',   unit: 'pts',    best: (s) => num(s.bestScore) },
  { slug: 'where',      name: 'Where',          emoji: '🗺️', key: 'where.v1',     unit: 'pts',    best: (s) => Math.max(num(s.bestEasy), num(s.bestHard)) },
  { slug: 'echo',       name: 'Echo',           emoji: '🔊', key: 'echo.v2',      unit: 'lvl',    best: (s) => maxVal(s.best) },
  { slug: 'chromatic',  name: 'Chromatic',      emoji: '🌈', key: 'chromatic.v2', unit: 'pts',    best: (s) => num(s.endlessBest) },
  { slug: 'flash',      name: 'Flash',          emoji: '⚡', key: 'flash.v1',     unit: 'wpm',    best: (s) => num(s.bestWpm) },
  { slug: 'flashmath',  name: 'Flashmath',      emoji: '🧮', key: 'flashmath.v1', unit: 'pts',    best: (s) => num(s.bestScore) },
  { slug: 'sprint',     name: 'Sprint',         emoji: '⌨️', key: 'sprint.v1',    unit: 'wpm',    best: (s) => maxVal(s.best) },
  { slug: 'digit-span', name: 'Digit Span',     emoji: '🔢', key: 'digitspan.v1', unit: 'span',   best: (s) => maxVal(s.best) },
  { slug: 'word',       name: 'Word of the Day', emoji: '📖', key: 'word.v1',     unit: 'pts',    best: (s) => num(s.practiceBest) },
  { slug: 'wordle',     name: 'Wordle',         emoji: '🟩', key: 'wordle.v1',    unit: 'streak', best: (s) => num(s.maxStreak) },
];

function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
function maxVal(o) { return o && typeof o === 'object' ? Math.max(0, ...Object.values(o).map(num)) : 0; }
function readLocal(key) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; } }
function localBest(g) { const s = readLocal(g.key); return s ? num(g.best(s)) : 0; }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---- load the Supabase client (graceful if the CDN is unreachable) ----
let supabase;
try {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch {
  // Offline or CDN blocked — hide the auth UI and bail quietly.
  document.getElementById('account')?.remove();
  document.getElementById('lbBtn')?.remove();
  throw new Error('Supabase unavailable');
}

// ---- DOM ----
const accountEl = document.getElementById('account');
const lbBtn = document.getElementById('lbBtn');
const lbOverlay = document.getElementById('lbOverlay');
const lbBody = document.getElementById('lbBody');

// ---- score sync ----
function displayName(user) {
  const m = user.user_metadata || {};
  return m.full_name || m.name || (user.email ? user.email.split('@')[0] : 'Player');
}

async function uploadScores(user) {
  const rows = [];
  for (const g of GAMES) {
    const s = readLocal(g.key);
    if (!s) continue;
    const best = num(g.best(s));
    if (best <= 0) continue;
    rows.push({
      user_id: user.id, game: g.slug, best, data: s,
      display_name: displayName(user), avatar_url: user.user_metadata?.avatar_url || null,
    });
  }
  if (rows.length) await supabase.from('arcade_scores').upsert(rows, { onConflict: 'user_id,game' });
}

async function restoreScores(user) {
  const { data } = await supabase.from('arcade_scores').select('game,best,data').eq('user_id', user.id);
  if (!data) return;
  for (const row of data) {
    const g = GAMES.find((x) => x.slug === row.game);
    if (!g || !row.data) continue;
    // Cloud wins only when it's strictly better; then take its whole blob.
    if (num(row.best) > localBest(g)) {
      try { localStorage.setItem(g.key, JSON.stringify(row.data)); } catch { /* ignore */ }
    }
  }
}

// ---- account UI ----
let syncedFor = null;

function renderAccount(user) {
  if (!accountEl) return;
  if (!user) {
    accountEl.innerHTML =
      '<button type="button" id="signin" class="acct-btn"><span class="g">G</span> Sign in with Google</button>';
    document.getElementById('signin').addEventListener('click', signIn);
    return;
  }
  const name = displayName(user);
  const avatar = user.user_metadata?.avatar_url;
  accountEl.innerHTML =
    `<span class="acct-chip">${avatar ? `<img src="${esc(avatar)}" alt="" referrerpolicy="no-referrer" />` : ''}` +
    `<span class="acct-name">${esc(name)}</span>` +
    `<button type="button" id="signout" class="acct-out" title="Sign out" aria-label="Sign out">Sign out</button></span>`;
  document.getElementById('signout').addEventListener('click', signOut);
}

async function onUser(user) {
  renderAccount(user);
  if (user && syncedFor !== user.id) {
    syncedFor = user.id;
    try { await restoreScores(user); await uploadScores(user); } catch { /* ignore */ }
  }
  if (!user) syncedFor = null;
}

async function signIn() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });
}

async function signOut() {
  await supabase.auth.signOut();
}

// ---- leaderboard ----
async function loadLeaderboard() {
  if (!lbBody) return;
  lbBody.innerHTML = '<p class="lb-loading">Loading…</p>';
  try {
    const results = await Promise.all(
      GAMES.map((g) =>
        supabase
          .from('arcade_scores')
          .select('display_name,avatar_url,best')
          .eq('game', g.slug)
          .order('best', { ascending: false })
          .limit(5)
          .then((r) => ({ g, rows: r.data || [] }))
      )
    );
    lbBody.innerHTML = results
      .map(({ g, rows }) => {
        const list = rows.length
          ? rows
              .map(
                (r, i) =>
                  `<li><span class="lb-rank">${i + 1}</span>` +
                  `${r.avatar_url ? `<img class="lb-av" src="${esc(r.avatar_url)}" alt="" referrerpolicy="no-referrer" />` : '<span class="lb-av lb-av-x"></span>'}` +
                  `<span class="lb-who">${esc(r.display_name || 'Player')}</span>` +
                  `<span class="lb-score">${esc(r.best)} ${esc(g.unit)}</span></li>`
              )
              .join('')
          : '<li class="lb-empty">No scores yet — be the first!</li>';
        return `<section class="lb-game"><h3>${g.emoji} ${esc(g.name)}</h3><ol>${list}</ol></section>`;
      })
      .join('');
  } catch {
    lbBody.innerHTML = '<p class="lb-loading">Could not load the leaderboard.</p>';
  }
}

function openLeaderboard() {
  if (!lbOverlay) return;
  lbOverlay.classList.add('show');
  loadLeaderboard();
}
function closeLeaderboard() {
  lbOverlay?.classList.remove('show');
}

lbBtn?.addEventListener('click', openLeaderboard);
lbOverlay?.addEventListener('pointerdown', (e) => { if (e.target === lbOverlay) closeLeaderboard(); });
document.getElementById('lbClose')?.addEventListener('click', closeLeaderboard);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLeaderboard(); });

// ---- boot ----
supabase.auth.onAuthStateChange((_event, session) => onUser(session?.user ?? null));
const { data: { session } } = await supabase.auth.getSession();
onUser(session?.user ?? null);
