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
function isUrl(a) { return typeof a === 'string' && /^https?:/.test(a); }
function avatarHtml(a, cls) {
  return isUrl(a)
    ? `<img class="${cls}" src="${esc(a)}" alt="" referrerpolicy="no-referrer" />`
    : `<span class="${cls} av-emoji">${esc(a || '🎮')}</span>`;
}

// Avatars a player can pick (emoji rendered in a coloured disc). Their Google
// photo is offered too, when available.
const PRESET_AVATARS = ['🐼','🦊','🐙','🐸','🦖','👾','🚀','🎮','🎧','🕹️','🌟','⚡','🔥','🍀','🌈','🦄','🐝','🐳'];
function pickRandomAvatar() { return PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]; }

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
const pfOverlay = document.getElementById('pfOverlay');
const pfBody = document.getElementById('pfBody');

// ---- profile ----
let currentUser = null;
let profile = null; // { display_name, avatar }

function googleName(user) {
  const m = user.user_metadata || {};
  return m.full_name || m.name || (user.email ? user.email.split('@')[0] : 'Player');
}
function googleAvatar(user) { return user.user_metadata?.avatar_url || null; }
function pName() { return profile?.display_name || (currentUser ? googleName(currentUser) : 'Player'); }
function pAvatar() { return profile?.avatar || (currentUser ? googleAvatar(currentUser) : null) || '🎮'; }

async function loadProfile(user) {
  const { data } = await supabase
    .from('arcade_profiles')
    .select('display_name,avatar,theme')
    .eq('user_id', user.id)
    .maybeSingle();
  if (data && (data.display_name || data.avatar)) {
    profile = { display_name: data.display_name || googleName(user), avatar: data.avatar || googleAvatar(user) || '🎮', theme: data.theme || null };
  } else {
    // First sign-in: seed a profile from the Google identity.
    profile = { display_name: googleName(user), avatar: googleAvatar(user) || pickRandomAvatar(), theme: null };
    await supabase.from('arcade_profiles').upsert(
      { user_id: user.id, display_name: profile.display_name, avatar: profile.avatar },
      { onConflict: 'user_id' }
    );
  }
}

// Apply an account's saved colour theme to this device (mirrors the inline
// theme script in index.html).
function applyTheme(theme) {
  if (theme !== 'classic' && theme !== 'refined') return;
  try { localStorage.setItem('arcade.theme', theme); } catch { /* ignore */ }
  const root = document.documentElement;
  if (theme === 'classic') root.setAttribute('data-theme', 'classic');
  else root.removeAttribute('data-theme');
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', theme === 'classic' ? '#12141c' : '#0c0d12');
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.textContent = theme === 'classic' ? '🎨 New colours' : '🎨 Classic colours';
    btn.setAttribute('aria-pressed', String(theme === 'classic'));
  }
}

async function saveProfile(name, avatar) {
  profile = { display_name: (name || '').trim().slice(0, 24) || googleName(currentUser), avatar: avatar || '🎮' };
  await supabase.from('arcade_profiles').upsert(
    { user_id: currentUser.id, display_name: profile.display_name, avatar: profile.avatar, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  // Re-stamp the player's score rows so the leaderboard shows the new identity.
  await supabase.from('arcade_scores')
    .update({ display_name: profile.display_name, avatar_url: profile.avatar })
    .eq('user_id', currentUser.id);
}

// ---- score sync ----

async function uploadScores(user) {
  const rows = [];
  for (const g of GAMES) {
    const s = readLocal(g.key);
    if (!s) continue;
    const best = num(g.best(s));
    if (best <= 0) continue;
    rows.push({
      user_id: user.id, game: g.slug, best, data: s,
      display_name: pName(), avatar_url: pAvatar(),
    });
  }
  if (rows.length) await supabase.from('arcade_scores').upsert(rows, { onConflict: 'user_id,game' });
}

async function restoreScores(user, overwrite = false) {
  const { data } = await supabase.from('arcade_scores').select('game,best,data').eq('user_id', user.id);
  if (!data) return;
  for (const row of data) {
    const g = GAMES.find((x) => x.slug === row.game);
    if (!g || !row.data) continue;
    // On an account switch we overwrite; otherwise cloud wins only when better.
    if (overwrite || num(row.best) > localBest(g)) {
      try { localStorage.setItem(g.key, JSON.stringify(row.data)); } catch { /* ignore */ }
    }
  }
}

// Which signed-in account the local scores currently belong to.
const OWNER_KEY = 'arcade.sync.owner';
function clearLocalScores() {
  for (const g of GAMES) { try { localStorage.removeItem(g.key); } catch { /* ignore */ } }
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
  accountEl.innerHTML =
    `<button type="button" id="profileBtn" class="acct-chip" aria-label="Your profile">` +
    `${avatarHtml(pAvatar(), 'acct-av')}<span class="acct-name">${esc(pName())}</span>` +
    `<span class="acct-caret">▾</span></button>`;
  document.getElementById('profileBtn').addEventListener('click', openProfile);
}

// ---- profile editor ----
function openProfile() {
  if (!pfOverlay || !currentUser) return;
  const current = pAvatar();
  const options = [];
  const gPhoto = googleAvatar(currentUser);
  if (gPhoto) options.push(gPhoto);
  for (const e of PRESET_AVATARS) options.push(e);

  pfBody.innerHTML =
    `<label class="pf-label" for="pfName">Display name</label>` +
    `<input id="pfName" class="pf-input" type="text" maxlength="24" value="${esc(pName())}" placeholder="Your name" />` +
    `<div class="pf-label-row"><span class="pf-label">Avatar</span>` +
    `<button type="button" id="pfRandom" class="pf-random">🎲 Random</button></div>` +
    `<div class="pf-avatars" id="pfAvatars">` +
    options.map((o) => `<button type="button" class="pf-av${o === current ? ' sel' : ''}" data-av="${esc(o)}">${avatarHtml(o, 'pf-av-inner')}</button>`).join('') +
    `</div>` +
    `<div class="pf-actions">` +
    `<button type="button" id="pfSignout" class="pf-signout">Sign out</button>` +
    `<button type="button" id="pfSave" class="pf-save">Save</button>` +
    `</div>`;

  let selected = current;
  const marks = () => pfBody.querySelectorAll('.pf-av').forEach((x) => x.classList.toggle('sel', x.dataset.av === selected));
  pfBody.querySelectorAll('.pf-av').forEach((b) => b.addEventListener('click', () => { selected = b.dataset.av; marks(); }));
  document.getElementById('pfRandom').addEventListener('click', () => { selected = pickRandomAvatar(); marks(); });
  document.getElementById('pfSignout').addEventListener('click', signOut);
  document.getElementById('pfSave').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Saving…';
    try { await saveProfile(document.getElementById('pfName').value, selected); } catch { /* ignore */ }
    closeProfile();
    renderAccount(currentUser);
  });
  pfOverlay.classList.add('show');
}
function closeProfile() { pfOverlay?.classList.remove('show'); }

async function onUser(user) {
  currentUser = user;
  if (!user) { profile = null; syncedFor = null; renderAccount(null); return; }
  if (syncedFor !== user.id) {
    syncedFor = user.id;
    try { await loadProfile(user); } catch { /* ignore */ }
    applyTheme(profile?.theme);
    renderAccount(user);
    const owner = localStorage.getItem(OWNER_KEY);
    try {
      if (owner && owner !== user.id) {
        // A different account signed in on this browser — don't carry over the
        // previous account's scores; this account's cloud data is authoritative.
        clearLocalScores();
        await restoreScores(user, true);
      } else {
        // Same account, or a guest claiming their local scores for the first time.
        await restoreScores(user);
        await uploadScores(user);
      }
      localStorage.setItem(OWNER_KEY, user.id);
    } catch { /* ignore */ }
  } else {
    renderAccount(user);
  }
}

async function signIn() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + location.pathname },
  });
}

async function signOut() {
  if (!confirm('Sign out of Tiny Arcade on this device?')) return;
  // Clear this account's scores from the browser so the next person (or a
  // different account) doesn't see them; they stay safe in the cloud.
  clearLocalScores();
  try { localStorage.removeItem(OWNER_KEY); } catch { /* ignore */ }
  await supabase.auth.signOut();
}

// ---- leaderboard ----
async function loadLeaderboard() {
  if (!lbBody) return;
  lbBody.innerHTML = '<p class="lb-loading">Loading…</p>';
  try {
    const uid = currentUser?.id || null;
    // My best per game (one query) so I can show my own rank when I'm outside
    // the shown top 5.
    const myBest = {};
    if (uid) {
      const { data } = await supabase.from('arcade_scores').select('game,best').eq('user_id', uid);
      for (const r of data || []) myBest[r.game] = num(r.best);
    }
    const results = await Promise.all(
      GAMES.map((g) =>
        supabase
          .from('arcade_scores')
          .select('user_id,display_name,avatar_url,best')
          .eq('game', g.slug)
          .order('best', { ascending: false })
          .limit(5)
          .then((r) => ({ g, rows: r.data || [] }))
      )
    );
    // Rank lookup only for games where I have a score but I'm not in the top 5.
    const ranks = {};
    if (uid) {
      const need = results.filter(
        ({ g, rows }) => myBest[g.slug] != null && !rows.some((r) => r.user_id === uid)
      );
      await Promise.all(
        need.map(async ({ g }) => {
          const { count } = await supabase
            .from('arcade_scores')
            .select('user_id', { count: 'exact', head: true })
            .eq('game', g.slug)
            .gt('best', myBest[g.slug]);
          ranks[g.slug] = (count || 0) + 1;
        })
      );
    }
    lbBody.innerHTML = results
      .map(({ g, rows }) => {
        const list = rows.length
          ? rows
              .map((r, i) => {
                const you = uid && r.user_id === uid;
                const rank = i < 3
                  ? `<span class="lb-rank lb-medal">${['🥇', '🥈', '🥉'][i]}</span>`
                  : `<span class="lb-rank">${i + 1}</span>`;
                return (
                  `<li class="${you ? 'lb-you' : ''}">${rank}` +
                  `${avatarHtml(r.avatar_url || '🎮', 'lb-av')}` +
                  `<span class="lb-who">${esc(r.display_name || 'Player')}${you ? '<span class="lb-tag">You</span>' : ''}</span>` +
                  `<span class="lb-score">${esc(r.best)} ${esc(g.unit)}</span></li>`
                );
              })
              .join('')
          : '<li class="lb-empty">No scores yet — be the first!</li>';
        // My own row when I'm not already in the shown list.
        const mine = ranks[g.slug]
          ? `<li class="lb-you lb-mine"><span class="lb-rank">${ranks[g.slug]}</span>` +
            `${avatarHtml(pAvatar(), 'lb-av')}` +
            `<span class="lb-who">${esc(pName())}<span class="lb-tag">You</span></span>` +
            `<span class="lb-score">${esc(myBest[g.slug])} ${esc(g.unit)}</span></li>`
          : '';
        return `<section class="lb-game" data-game="${esc(g.slug)}"><h3>${g.emoji} ${esc(g.name)}</h3><ol>${list}${mine}</ol></section>`;
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

// Persist the colour theme to the signed-in account when it's toggled.
document.getElementById('themeBtn')?.addEventListener('click', () => {
  if (!currentUser) return;
  // Read the value the inline toggle just wrote, then mirror it to the cloud.
  setTimeout(() => {
    const theme = localStorage.getItem('arcade.theme') === 'classic' ? 'classic' : 'refined';
    if (profile) profile.theme = theme;
    supabase.from('arcade_profiles')
      .upsert({ user_id: currentUser.id, theme, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .then(() => {}, () => {});
  }, 0);
});

lbBtn?.addEventListener('click', openLeaderboard);
lbOverlay?.addEventListener('pointerdown', (e) => { if (e.target === lbOverlay) closeLeaderboard(); });
document.getElementById('lbClose')?.addEventListener('click', closeLeaderboard);
pfOverlay?.addEventListener('pointerdown', (e) => { if (e.target === pfOverlay) closeProfile(); });
document.getElementById('pfClose')?.addEventListener('click', closeProfile);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLeaderboard(); closeProfile(); } });

// ---- boot ----
supabase.auth.onAuthStateChange((_event, session) => onUser(session?.user ?? null));
const { data: { session } } = await supabase.auth.getSession();
onUser(session?.user ?? null);
