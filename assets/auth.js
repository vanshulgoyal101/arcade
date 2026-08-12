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
function esc(s) { return String(s ?? '').replace(/[&<>"'`]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c])); }
// Compact score display: 256000 -> "256k", 1_000_000 -> "1M". SI casing (k lower, M/B upper).
const _compactNum = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
function fmtScore(n) {
  const v = Number(n);
  if (!isFinite(v)) return '0';
  if (Math.abs(v) < 1000) return String(v);
  return _compactNum.format(v).replace('K', 'k');
}
function isUrl(a) { return typeof a === 'string' && /^https?:/.test(a); }
function isSvgAv(a) { return typeof a === 'string' && a.slice(0, 2) === 'a:' && AV[a.slice(2)]; }
function avatarHtml(a, cls) {
  if (isUrl(a)) return `<img class="${cls}" src="${esc(a)}" alt="" referrerpolicy="no-referrer" />`;
  if (isSvgAv(a)) return `<span class="${cls} av-svg"><svg viewBox="0 0 64 64" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${AV[a.slice(2)]}</svg></span>`;
  return `<span class="${cls} av-emoji">${esc(a || '🎮')}</span>`;
}

// Hand-drawn flat character avatars (self-contained SVG, no external assets).
// Each value is the inner SVG for a 64×64 disc; stored as an id like "a:fox".
const AV = {
  panda: '<circle cx="32" cy="32" r="32" fill="#5b8cf0"/><circle cx="20" cy="18" r="7" fill="#20242f"/><circle cx="44" cy="18" r="7" fill="#20242f"/><circle cx="32" cy="34" r="18" fill="#fff"/><ellipse cx="25" cy="32" rx="5" ry="6.5" fill="#20242f"/><ellipse cx="39" cy="32" rx="5" ry="6.5" fill="#20242f"/><circle cx="25" cy="32" r="1.9" fill="#fff"/><circle cx="39" cy="32" r="1.9" fill="#fff"/><ellipse cx="32" cy="41" rx="3" ry="2.2" fill="#20242f"/><path d="M29 45 Q32 48 35 45" stroke="#20242f" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  fox: '<circle cx="32" cy="32" r="32" fill="#3b4a63"/><polygon points="15,15 24,32 31,22" fill="#ff7a2d"/><polygon points="49,15 40,32 33,22" fill="#ff7a2d"/><polygon points="17,24 47,24 32,50" fill="#ff8f43"/><polygon points="25,36 39,36 32,50" fill="#fff"/><circle cx="25" cy="31" r="2.4" fill="#20242f"/><circle cx="39" cy="31" r="2.4" fill="#20242f"/><circle cx="32" cy="44" r="2.4" fill="#20242f"/>',
  robot: '<circle cx="32" cy="32" r="32" fill="#8ea2c0"/><line x1="32" y1="12" x2="32" y2="18" stroke="#eef2f8" stroke-width="2"/><circle cx="32" cy="11" r="3" fill="#ff5d5d"/><rect x="16" y="18" width="32" height="28" rx="8" fill="#eef2f8"/><circle cx="25" cy="30" r="3.4" fill="#2b6cff"/><circle cx="39" cy="30" r="3.4" fill="#2b6cff"/><rect x="24" y="38" width="16" height="4" rx="2" fill="#9aa7bd"/>',
  alien: '<circle cx="32" cy="32" r="32" fill="#7c3aed"/><ellipse cx="32" cy="30" rx="15" ry="17" fill="#7ee7a6"/><ellipse cx="25" cy="30" rx="3.2" ry="5.5" fill="#12241c" transform="rotate(-18 25 30)"/><ellipse cx="39" cy="30" rx="3.2" ry="5.5" fill="#12241c" transform="rotate(18 39 30)"/><path d="M28 44 Q32 47 36 44" stroke="#2f7a4f" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  cat: '<circle cx="32" cy="32" r="32" fill="#ff6b8b"/><polygon points="18,14 22,30 32,22" fill="#ffd0a0"/><polygon points="46,14 42,30 32,22" fill="#ffd0a0"/><circle cx="32" cy="34" r="15" fill="#ffd0a0"/><polygon points="20,18 23,27 28,23" fill="#ff9db3"/><polygon points="44,18 41,27 36,23" fill="#ff9db3"/><ellipse cx="26" cy="33" rx="2" ry="3" fill="#3a2a2a"/><ellipse cx="38" cy="33" rx="2" ry="3" fill="#3a2a2a"/><path d="M30 39 l2 2 2 -2 z" fill="#ff7a90"/><path d="M32 41 v2" stroke="#3a2a2a" stroke-width="1.2" stroke-linecap="round"/>',
  frog: '<circle cx="32" cy="32" r="32" fill="#7ccf67"/><circle cx="22" cy="20" r="8" fill="#e9f7e0"/><circle cx="42" cy="20" r="8" fill="#e9f7e0"/><circle cx="22" cy="21" r="3.6" fill="#1f2a1a"/><circle cx="42" cy="21" r="3.6" fill="#1f2a1a"/><path d="M18 36 Q32 50 46 36" stroke="#2e6b28" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="24" cy="40" r="1.6" fill="#f2a6b0"/><circle cx="40" cy="40" r="1.6" fill="#f2a6b0"/>',
  ghost: '<circle cx="32" cy="32" r="32" fill="#a78bfa"/><path d="M18 44 V30 a14 14 0 0 1 28 0 V44 q-3.5 4 -7 0 t-7 0 t-7 0 t-7 0 Z" fill="#fff"/><circle cx="27" cy="30" r="2.4" fill="#3a2f5a"/><circle cx="37" cy="30" r="2.4" fill="#3a2f5a"/><ellipse cx="32" cy="36" rx="2.2" ry="2.8" fill="#d7c4fb"/>',
  penguin: '<circle cx="32" cy="32" r="32" fill="#38bdf8"/><ellipse cx="32" cy="34" rx="15" ry="19" fill="#2b3140"/><ellipse cx="32" cy="38" rx="9" ry="14" fill="#fff"/><circle cx="26" cy="26" r="2.6" fill="#fff"/><circle cx="38" cy="26" r="2.6" fill="#fff"/><circle cx="26" cy="26" r="1.3" fill="#2b3140"/><circle cx="38" cy="26" r="1.3" fill="#2b3140"/><polygon points="29,30 35,30 32,35" fill="#ff9f2d"/><polygon points="24,50 30,50 27,54" fill="#ff9f2d"/><polygon points="34,50 40,50 37,54" fill="#ff9f2d"/>',
  owl: '<circle cx="32" cy="32" r="32" fill="#f59e0b"/><ellipse cx="32" cy="34" rx="16" ry="17" fill="#8a5a2b"/><polygon points="18,16 24,26 28,18" fill="#8a5a2b"/><polygon points="46,16 40,26 36,18" fill="#8a5a2b"/><circle cx="25" cy="30" r="7" fill="#fff"/><circle cx="39" cy="30" r="7" fill="#fff"/><circle cx="25" cy="30" r="3.2" fill="#2b2018"/><circle cx="39" cy="30" r="3.2" fill="#2b2018"/><polygon points="29,34 35,34 32,40" fill="#ffb03a"/><path d="M22 44 h20" stroke="#6b451f" stroke-width="2" stroke-linecap="round"/>',
  bee: '<circle cx="32" cy="32" r="32" fill="#60a5fa"/><ellipse cx="18" cy="28" rx="7" ry="5" fill="#eaf2ff"/><ellipse cx="46" cy="28" rx="7" ry="5" fill="#eaf2ff"/><ellipse cx="32" cy="36" rx="12" ry="14" fill="#ffcf33"/><path d="M22 32 h20 M21 39 h22 M24 46 h16" stroke="#2b2410" stroke-width="3"/><path d="M28 24 Q26 18 24 18 M36 24 Q38 18 40 18" stroke="#2b2410" stroke-width="1.6" fill="none"/><circle cx="28" cy="27" r="1.6" fill="#2b2410"/><circle cx="36" cy="27" r="1.6" fill="#2b2410"/>',
  dino: '<circle cx="32" cy="32" r="32" fill="#4ade80"/><polygon points="20,20 24,14 27,20 31,14 34,20 38,14 41,20" fill="#15803d"/><path d="M18 24 h22 a9 9 0 0 1 9 9 v3 a10 10 0 0 1 -10 10 h-13 a8 8 0 0 1 -8 -8 z" fill="#22a34e"/><circle cx="40" cy="32" r="3" fill="#fff"/><circle cx="41" cy="32" r="1.5" fill="#0c2b16"/><circle cx="46" cy="41" r="1.2" fill="#0c2b16"/><path d="M39 45 h7" stroke="#0c2b16" stroke-width="1.6" stroke-linecap="round"/>',
  bear: '<circle cx="32" cy="32" r="32" fill="#2dd4bf"/><circle cx="20" cy="20" r="7" fill="#a06a3c"/><circle cx="44" cy="20" r="7" fill="#a06a3c"/><circle cx="20" cy="20" r="3.4" fill="#c98f5d"/><circle cx="44" cy="20" r="3.4" fill="#c98f5d"/><circle cx="32" cy="34" r="16" fill="#a06a3c"/><ellipse cx="32" cy="40" rx="9" ry="7" fill="#e8c9a0"/><circle cx="26" cy="31" r="2.2" fill="#2b1c10"/><circle cx="38" cy="31" r="2.2" fill="#2b1c10"/><ellipse cx="32" cy="37" rx="2.4" ry="1.8" fill="#2b1c10"/><path d="M32 39 v2 M27 42 q5 3 5 -1 q0 4 5 1" stroke="#2b1c10" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
};
const AVATAR_IDS = ['panda', 'fox', 'robot', 'alien', 'cat', 'frog', 'ghost', 'penguin', 'owl', 'bee', 'dino', 'bear'];
// The pickable set: designed avatars first. A player's Google photo is offered
// too, when available (added by the profile editor).
const PRESET_AVATARS = AVATAR_IDS.map((id) => 'a:' + id);
function pickRandomAvatar() { return PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)]; }

// ---- load the Supabase client (graceful if the CDN is unreachable) ----
// Show the sign-in button instantly for signed-out visitors, before the (network)
// SDK import resolves, so the account UI doesn't pop in a few seconds later.
// Skip when a Supabase session token already exists (a returning user) to avoid
// a flash of "Sign in" before their profile chip loads.
let pendingSignIn = false;
(() => {
  try {
    const hasSession = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k));
    const el = document.getElementById('account');
    if (el && !hasSession && !el.querySelector('button')) {
      el.innerHTML =
        '<button type="button" id="signin" class="acct-btn"><span class="g">G</span> Sign in with Google</button>';
      el.querySelector('#signin').addEventListener('click', () => {
        pendingSignIn = true;
        const b = el.querySelector('#signin');
        if (b) b.textContent = 'Loading…';
      });
    }
  } catch { /* ignore */ }
})();

// Paint each hub card with the player's personal best — instant + local-only, so
// it shows even before (or entirely without) the Supabase SDK.
paintCardBests();
// Refresh when returning from a game (incl. bfcache restore) so a new best shows.
addEventListener('pageshow', () => paintCardBests());

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

// Remember the profile per-device so the chip paints the right name/avatar
// instantly on the next load, instead of flashing the Google identity while the
// DB fetch is in flight.
const PROFILE_CACHE = 'arcade.profile';
function cacheProfile(id) {
  try { localStorage.setItem(PROFILE_CACHE, JSON.stringify({ id, display_name: profile?.display_name ?? null, avatar: profile?.avatar ?? null })); } catch { /* ignore */ }
}
function hydrateProfileFromCache(id) {
  try {
    const c = JSON.parse(localStorage.getItem(PROFILE_CACHE) || 'null');
    if (c && c.id === id && (c.display_name || c.avatar)) { profile = { display_name: c.display_name, avatar: c.avatar }; return true; }
  } catch { /* ignore */ }
  return false;
}

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
  cacheProfile(currentUser.id);
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

async function restoreScores(overwrite = false) {
  const { data } = await supabase.rpc('restore_my_scores');
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

// Render (or clear) the personal-best chip on each hub card's bottom row (beside
// the category tag), from local scores. Text-only content, so it is XSS-safe.
function paintCardBests() {
  for (const g of GAMES) {
    const card = document.querySelector(`.card[data-game="${g.slug}"]`);
    if (!card) continue;
    const best = localBest(g);
    let el = card.querySelector('.card-best');
    if (best > 0) {
      if (!el) {
        el = document.createElement('span');
        el.className = 'card-best';
        // Share a row with the category tag rather than floating over the art.
        const tag = card.querySelector('.tag');
        let foot = card.querySelector('.card-foot');
        if (!foot && tag) {
          foot = document.createElement('div');
          foot.className = 'card-foot';
          card.insertBefore(foot, tag);
          foot.appendChild(tag);
        }
        (foot || card).appendChild(el);
      }
      const label = `${fmtScore(best)} ${g.unit}`;
      el.textContent = label;
      el.setAttribute('aria-label', `Your best: ${label}`);
    } else if (el) {
      el.remove();
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
  if (!user) {
    profile = null; syncedFor = null; renderAccount(null);
    paintCardBests();
    // If the visitor clicked "Sign in" while the SDK was still loading, go now.
    if (pendingSignIn) { pendingSignIn = false; signIn(); }
    return;
  }
  if (syncedFor !== user.id) {
    syncedFor = user.id;
    if (hydrateProfileFromCache(user.id)) renderAccount(user); // instant, no flash
    try { await loadProfile(user); } catch { /* ignore */ }
    cacheProfile(user.id);
    applyTheme(profile?.theme);
    renderAccount(user);
    try {
      const owner = localStorage.getItem(OWNER_KEY);
      if (owner && owner !== user.id) {
        // A different account signed in on this browser — don't carry over the
        // previous account's scores; this account's cloud data is authoritative.
        clearLocalScores();
        await restoreScores(true);
      } else {
        // Same account, or a guest claiming their local scores for the first time.
        await restoreScores();
        await uploadScores(user);
      }
      localStorage.setItem(OWNER_KEY, user.id);
    } catch { /* ignore */ }
    paintCardBests();
  } else if (profile) {
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
    // One round trip: the server returns every game's top 5 plus my own rank,
    // instead of ~20 separate REST calls that the browser throttles to 6 at a time.
    const { data, error } = await supabase.rpc('arcade_leaderboard', {
      p_games: GAMES.map((g) => g.slug),
      p_limit: 5,
    });
    if (error) throw error;
    const board = data || {};
    lbBody.innerHTML = GAMES
      .map((g) => {
        const info = board[g.slug] || {};
        const rows = info.top || [];
        const myBest = info.my_best;
        const myRank = info.my_rank;
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
                  `<span class="lb-score">${fmtScore(r.best)} ${esc(g.unit)}</span></li>`
                );
              })
              .join('')
          : '<li class="lb-empty">No scores yet — be the first!</li>';
        const inTop = uid && rows.some((r) => r.user_id === uid);
        const mine =
          uid && myBest != null && !inTop && myRank
            ? `<li class="lb-you lb-mine"><span class="lb-rank">${myRank}</span>` +
              `${avatarHtml(pAvatar(), 'lb-av')}` +
              `<span class="lb-who">${esc(pName())}<span class="lb-tag">You</span></span>` +
              `<span class="lb-score">${fmtScore(myBest)} ${esc(g.unit)}</span></li>`
            : '';
        const lead = rows.length
          ? `<span class="lb-lead">🥇 ${esc(rows[0].display_name || 'Player')} · ${fmtScore(rows[0].best)} ${esc(g.unit)}</span>`
          : `<span class="lb-lead lb-lead-empty">No scores yet</span>`;
        return (
          `<details class="lb-game" data-game="${esc(g.slug)}">` +
          `<summary class="lb-head"><span class="lb-game-name">${g.emoji} ${esc(g.name)}</span>` +
          `<span class="lb-head-right">${lead}<span class="lb-caret">▾</span></span></summary>` +
          `<ol>${list}${mine}</ol></details>`
        );
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
