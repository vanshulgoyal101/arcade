import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import * as sfx from '../../shared/sfx';
import { SprintGame, DURATIONS, type Duration } from './game';
import { sprintShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { submitScore, getRank } from '../../shared/cloud';
import { rankBadgeHtml } from '../../shared/rank';

const game = new SprintGame();
const MUTE_KEY = 'sprint.muted';
sfx.setMuted(sfx.loadMuted(MUTE_KEY));

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="/">← Arcade</a>
    <h1 class="title">⌨️ Sprint</h1>
    <div class="topbar-actions">
      <button class="icon-btn" id="restart" title="Restart" aria-label="Restart"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
      <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
    </div>
  </div>

  <div class="controls">
    <div class="toggle" id="durToggle">
      ${DURATIONS.map((d) => `<button data-dur="${d}" class="${d === 30 ? 'active' : ''}">${d}s</button>`).join('')}
    </div>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">WPM</span><span class="v" id="wpm">0</span></div>
    <div class="pill"><span class="k">Accuracy</span><span class="v" id="acc">100%</span></div>
    <div class="pill"><span class="k">Time</span><span class="v" id="time">30</span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="timerbar"><span id="timer"></span></div>

  <div class="stream" id="stream"></div>
  <input class="field" id="field" type="text" autocomplete="off" autocapitalize="off"
         autocorrect="off" spellcheck="false" placeholder="Start typing the sentence above…" />
  <p class="center hint">Type each word, press <b>space</b> to continue. The timer starts on your first keystroke.</p>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;

const durToggle = app.querySelector<HTMLDivElement>('#durToggle')!;
const wpmEl = app.querySelector<HTMLSpanElement>('#wpm')!;
const accEl = app.querySelector<HTMLSpanElement>('#acc')!;
const timeEl = app.querySelector<HTMLSpanElement>('#time')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const timerEl = app.querySelector<HTMLSpanElement>('#timer')!;
const streamEl = app.querySelector<HTMLDivElement>('#stream')!;
const field = app.querySelector<HTMLInputElement>('#field')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => resetRun());
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

const VISIBLE = 18;
let rafId = 0;

function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}

function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

function esc(ch: string): string {
  return ch === ' ' ? '&nbsp;' : ch.replace('<', '&lt;').replace('>', '&gt;');
}
function escWord(w: string): string {
  return w.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// One word rendered character-by-character against what was typed (green/red/caret).
function wordCharsHtml(target: string, typed: string, withCaret: boolean): string {
  let inner = '';
  const len = Math.max(target.length, typed.length);
  for (let i = 0; i < len; i++) {
    const t = target[i];
    const g = typed[i];
    const caret = withCaret && i === typed.length ? '<span class="caret"></span>' : '';
    if (g === undefined) inner += `${caret}<span>${esc(t)}</span>`;
    else if (t === undefined) inner += `<span class="c-extra">${esc(g)}</span>`;
    else if (g === t) inner += `${caret}<span class="c-ok">${esc(t)}</span>`;
    else inner += `${caret}<span class="c-bad">${esc(t)}</span>`;
  }
  if (withCaret && typed.length >= target.length) inner += '<span class="caret"></span>';
  return inner;
}

// MonkeyType-style: keep recently-typed words on screen and scroll the current
// word into the middle, so nothing you just typed disappears mid-flow.
function renderStream(typed: string): void {
  const parts: string[] = [];
  for (const h of game.typedHistory) {
    parts.push(`<span class="w done">${wordCharsHtml(h.word, h.typed, false)}</span>`);
  }
  parts.push(`<span class="w current">${wordCharsHtml(game.current, typed, true)}</span>`);
  for (const w of game.upcoming.slice(1, 1 + VISIBLE)) {
    parts.push(`<span class="w">${escWord(w)}</span>`);
  }
  streamEl.innerHTML = parts.join(' ');
  const cur = streamEl.querySelector<HTMLElement>('.w.current');
  if (cur) streamEl.scrollTop = Math.max(0, cur.offsetTop - streamEl.clientHeight / 2 + cur.offsetHeight / 2);
}

function renderBest(): void {
  bestEl.textContent = String(game.best);
}

function liveUpdate(now: number): void {
  const s = game.stats(now);
  wpmEl.textContent = String(game.started ? s.wpm : 0);
  accEl.textContent = `${s.accuracy}%`;
  const left = game.timeLeft(now);
  timeEl.textContent = String(Math.ceil(left / 1000));
  timerEl.style.transform = `scaleX(${left / (game.duration * 1000)})`;
}

function loop(ts: number): void {
  if (game.finished) return;
  liveUpdate(ts);
  if (game.started && game.timeLeft(ts) <= 0) {
    endRun(ts);
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function endRun(now: number): void {
  cancelAnimationFrame(rafId);
  const { stats, newBest } = game.finish(now);
  field.blur();
  renderBest();
  window.setTimeout(() => (newBest ? sfx.levelUp() : sfx.reveal()), 60);
  const weak = game.weakLetters();
  const weakHtml = weak.length
    ? `<p class="hint" style="margin:8px 0 0">Trouble keys: ${weak
        .map((w) => `<b>${w.ch}</b>\u00d7${w.count}`)
        .join('&nbsp;&nbsp;')}</p>`
    : '';
  modal.innerHTML = `
    <h2>${newBest ? 'New record! 🏆' : 'Time!'}</h2>
    <div class="stat-grid">
      <div class="stat-box"><div class="n">${stats.wpm}</div><div class="l">WPM</div></div>
      <div class="stat-box"><div class="n">${stats.accuracy}%</div><div class="l">Accuracy</div></div>
      <div class="stat-box"><div class="n">${stats.words}</div><div class="l">Words</div></div>
      <div class="stat-box"><div class="n">${stats.rawWpm}</div><div class="l">Raw wpm</div></div>
    </div>
    ${weakHtml}
    ${newBest ? '' : `<p class="hint" style="margin:8px 0 0">Best ${game.best} wpm at ${game.duration}s</p>`}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Again</button>
    </div>
  `;
  overlay.classList.add('show');
  void submitScore('sprint', game.best);
  getRank('sprint', game.best).then((r) => {
    const badge = rankBadgeHtml(r);
    if (badge) modal.querySelector('.row, .row-btns')?.insertAdjacentHTML('beforebegin', badge);
  });
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(sprintShareCard(stats, game.duration, game.best));
    const outcome = await shareResult({
      title: 'Sprint',
      url: 'https://games.vanshul.com/sprint/',
      blob,
      filename: 'sprint.png',
    });
    { const msg = shareToast(outcome); if (msg) showToast(msg); }
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = resetRun;
}

function resetRun(): void {
  overlay.classList.remove('show');
  cancelAnimationFrame(rafId);
  game.reset();
  field.value = '';
  field.disabled = false;
  renderStream('');
  liveUpdate(performance.now());
  wpmEl.textContent = '0';
  accEl.textContent = '100%';
  timeEl.textContent = String(game.duration);
  timerEl.style.transform = 'scaleX(1)';
  field.focus();
}

// ---- input ----
function startIfNeeded(): void {
  if (!game.started) {
    game.begin(performance.now());
    rafId = requestAnimationFrame(loop);
  }
}

function submitWord(word: string): void {
  const hit = word === game.current;
  game.submitWord(word);
  if (hit) sfx.tick();
  else sfx.wrong();
}

// Single cross-platform source of truth. The `input` event fires on every
// keyboard (desktop, iOS, Android) whereas `keydown` reports unreliable keys
// on mobile. A space in the value means the word before it is complete.
field.addEventListener('input', () => {
  if (game.finished) return;
  if (field.value.length > 0) startIfNeeded();
  let val = field.value;
  let sp = val.indexOf(' ');
  while (sp !== -1) {
    const word = val.slice(0, sp);
    if (word.length > 0) submitWord(word);
    val = val.slice(sp + 1);
    sp = val.indexOf(' ');
  }
  if (val !== field.value) field.value = val;
  renderStream(field.value);
});

durToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
  b.addEventListener('click', () => {
    if (game.started && !game.finished) return;
    sfx.click();
    durToggle.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    game.setDuration(Number(b.dataset.dur) as Duration);
    resetRun();
  });
});

// keep focus on the field
document.addEventListener('click', () => {
  if (!game.finished) field.focus();
});

// Enter restarts from the results screen.
document.addEventListener('keydown', (e) => {
  if (game.finished && e.key === 'Enter') {
    e.preventDefault();
    resetRun();
  }
});

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  sfx.saveMuted(MUTE_KEY, next);
  renderMute();
});

const restartBtn = app.querySelector<HTMLButtonElement>('#restart')!;
restartBtn.addEventListener('click', () => {
  sfx.click();
  resetRun();
});

// ---- boot ----
renderMute();
renderBest();
resetRun();
