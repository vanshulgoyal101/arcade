import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import * as sfx from '../../shared/sfx';
import {
  dailyWord,
  dailyOptions,
  todayKey,
  nextDailyStreak,
  PracticeGame,
  type Mode,
  type Option,
} from './game';
import type { Word } from './content';
import { loadStore, saveStore } from './storage';
import { dailyShareCard, practiceShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { submitScore, getRank } from '../../shared/cloud';
import { rankBadgeHtml } from '../../shared/rank';

const store = loadStore();
const MUTE_KEY = 'word.muted';
sfx.setMuted(sfx.loadMuted(MUTE_KEY));
let mode: Mode = 'today';
const practice = new PracticeGame(store.practiceBest);
let practiceLock = false;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">📖 Word</h1>
    <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
  </div>

  <div class="tabs-wrap">
    <div class="tabs" id="tabs">
      <button class="tab active" data-tab="today">Today</button>
      <button class="tab" data-tab="practice">Practice</button>
    </div>
  </div>

  <div class="hud" id="hud"></div>
  <div id="view"></div>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;

const tabs = app.querySelector<HTMLDivElement>('#tabs')!;
const hud = app.querySelector<HTMLDivElement>('#hud')!;
const view = app.querySelector<HTMLDivElement>('#view')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

makeDismissable(overlay, () => startPractice());

function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}
muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  sfx.saveMuted(MUTE_KEY, next);
  renderMute();
});

// ---- helpers ----
function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1600);
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function wordHead(w: Word): string {
  return `
    <h2 class="word">${esc(w.word)}</h2>
    <div class="word-meta">
      <span class="say">${esc(w.say)}</span>
      <span class="pos">${esc(w.pos)}</span>
    </div>`;
}

function details(w: Word): string {
  return `
    <p class="definition">${esc(w.definition)}</p>
    <div class="section-label">Examples</div>
    <ul class="examples">${w.examples.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
    <div class="section-label">Synonyms</div>
    <div class="chips">${w.synonyms.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
    <div class="section-label">Origin</div>
    <p class="origin">${esc(w.origin)}</p>`;
}

// ---- tabs ----
tabs.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
  b.addEventListener('click', () => {
    sfx.click();
    switchTab(b.dataset.tab as Mode);
  });
});

function switchTab(next: Mode): void {
  if (next === mode) return;
  mode = next;
  overlay.classList.remove('show');
  tabs.querySelectorAll<HTMLButtonElement>('.tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === mode);
  });
  if (mode === 'today') renderToday();
  else startPractice();
}

// ---- HUD ----
function renderHud(): void {
  if (mode === 'today') {
    const d = store.daily;
    hud.innerHTML = `
      <div class="pill"><span class="k">Streak</span><span class="v">${d.streak} 🔥</span></div>
      <div class="pill"><span class="k">Best</span><span class="v">${d.maxStreak}</span></div>
      <div class="pill"><span class="k">Learned</span><span class="v">${store.learnedIds.length}</span></div>`;
  } else {
    hud.innerHTML = `
      <div class="pill"><span class="k">Score</span><span class="v">${practice.score}</span></div>
      <div class="pill"><span class="k">Lives</span><span class="v hearts">${'❤️'.repeat(practice.lives)}${'🖤'.repeat(Math.max(0, 3 - practice.lives))}</span></div>
      <div class="pill"><span class="k">Streak</span><span class="v">${practice.streak}</span></div>
      <div class="pill"><span class="k">Best</span><span class="v">${practice.best}</span></div>`;
  }
}

// ---- Today ----
function renderToday(): void {
  renderHud();
  const w = dailyWord();
  const doneToday = store.daily.lastKey === todayKey();

  if (doneToday) {
    view.innerHTML = `
      <div class="card">
        ${wordHead(w)}
        ${details(w)}
      </div>
      <p class="hint">You’ve learned today’s word. Come back tomorrow for a new one — or try Practice.</p>
      <div class="actions">
        <button class="btn ghost" id="share">Share</button>
        <button class="btn" id="toPractice">Practice</button>
      </div>`;
    view.querySelector<HTMLButtonElement>('#share')!.onclick = shareDaily;
    view.querySelector<HTMLButtonElement>('#toPractice')!.onclick = () => switchTab('practice');
    return;
  }

  const opts = dailyOptions();
  view.innerHTML = `
    <div class="card">
      ${wordHead(w)}
      <p class="prompt">What does it mean?</p>
      <div class="options" id="options">
        ${opts.map((o, i) => `<button class="option" data-i="${i}">${esc(o.text)}</button>`).join('')}
      </div>
    </div>
    <p class="hint">Pick the meaning to reveal the full card and keep your daily streak.</p>`;

  const optionsEl = view.querySelector<HTMLDivElement>('#options')!;
  optionsEl.querySelectorAll<HTMLButtonElement>('.option').forEach((btn) => {
    btn.addEventListener('pointerdown', () => answerToday(Number(btn.dataset.i), opts, w, optionsEl));
  });
}

function answerToday(i: number, opts: Option[], w: Word, optionsEl: HTMLDivElement): void {
  const correctIndex = opts.findIndex((o) => o.correct);
  const correct = i === correctIndex;
  sfx.select();
  const buttons = optionsEl.querySelectorAll<HTMLButtonElement>('.option');
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === correctIndex) b.classList.add('correct');
    else if (idx === i) b.classList.add('wrong');
  });
  window.setTimeout(() => (correct ? sfx.correct(store.daily.streak) : sfx.wrong()), 120);

  completeDaily(correct, w.word);

  window.setTimeout(() => {
    const card = view.querySelector<HTMLDivElement>('.card')!;
    const extra = document.createElement('div');
    extra.className = 'reveal-anim';
    extra.innerHTML = details(w);
    card.appendChild(extra);
    sfx.reveal();
    renderHud();

    const hint = view.querySelector<HTMLParagraphElement>('.hint');
    if (hint) hint.textContent = correct ? 'Nice — you knew it! 🎉' : 'Now you know it. It’ll stick.';

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
      <button class="btn ghost" id="share">Share</button>
      <button class="btn" id="toPractice">Practice</button>`;
    view.appendChild(actions);
    actions.querySelector<HTMLButtonElement>('#share')!.onclick = shareDaily;
    actions.querySelector<HTMLButtonElement>('#toPractice')!.onclick = () => switchTab('practice');
  }, 700);
}

function completeDaily(correct: boolean, word: string): void {
  if (store.daily.lastKey === todayKey()) return;
  const next = nextDailyStreak(store.daily, correct);
  store.daily.streak = next.streak;
  store.daily.maxStreak = next.maxStreak;
  store.daily.lastKey = next.lastKey;
  if (!store.learnedIds.includes(word)) store.learnedIds.push(word);
  saveStore(store);
}

async function shareDaily(): Promise<void> {
  const blob = await canvasToBlob(dailyShareCard(dailyWord(), store.daily.streak));
  const outcome = await shareResult({
    title: 'Word of the Day',
    url: 'https://games.vanshul.com/word/',
    blob,
    filename: 'word.png',
  });
  const msg = shareToast(outcome);
  if (msg) showToast(msg);
}

// ---- Practice ----
function startPractice(): void {
  overlay.classList.remove('show');
  practiceLock = false;
  practice.reset();
  renderPractice();
}

function renderPractice(): void {
  renderHud();
  const { word, options } = practice.round;
  view.innerHTML = `
    <div class="card">
      ${wordHead(word)}
      <p class="prompt">Choose the correct meaning</p>
      <div class="options" id="options">
        ${options.map((o, i) => `<button class="option" data-i="${i}">${esc(o.text)}</button>`).join('')}
      </div>
    </div>
    <p class="hint">Three lives. A right answer builds your streak and score.</p>`;

  const optionsEl = view.querySelector<HTMLDivElement>('#options')!;
  optionsEl.querySelectorAll<HTMLButtonElement>('.option').forEach((btn) => {
    btn.addEventListener('pointerdown', () => answerPractice(Number(btn.dataset.i), optionsEl));
  });
}

function answerPractice(i: number, optionsEl: HTMLDivElement): void {
  if (practiceLock) return;
  practiceLock = true;
  sfx.select();
  const answered = practice.round.word;
  const res = practice.answer(i);
  const buttons = optionsEl.querySelectorAll<HTMLButtonElement>('.option');
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === res.correctIndex) b.classList.add('correct');
    else if (idx === i && !res.correct) b.classList.add('wrong');
  });
  window.setTimeout(() => (res.correct ? sfx.correct(practice.streak) : sfx.wrong()), 120);
  renderHud();

  // Reveal the word's full meaning so every round teaches something.
  const card = view.querySelector<HTMLDivElement>('.card')!;
  const extra = document.createElement('div');
  extra.className = 'reveal-anim';
  extra.innerHTML = details(answered);
  card.appendChild(extra);
  window.setTimeout(() => sfx.reveal(), 220);

  const hint = view.querySelector<HTMLParagraphElement>('.hint');
  if (hint) hint.textContent = res.correct ? 'Correct! 🎉' : 'Not quite — now you know it.';

  if (res.over) {
    window.setTimeout(() => {
      sfx.gameOver();
      practiceOver(res.newBest);
    }, 900);
    return;
  }

  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.innerHTML = `<button class="btn" id="p-next">Next word →</button>`;
  view.appendChild(actions);
  const nextBtn = actions.querySelector<HTMLButtonElement>('#p-next')!;
  nextBtn.onclick = () => {
    sfx.click();
    practice.next();
    practiceLock = false;
    renderPractice();
  };
  nextBtn.focus();
}

function practiceOver(newBest: boolean): void {
  store.practiceBest = practice.best;
  saveStore(store);
  modal.innerHTML = `
    <h2>Round over</h2>
    <p class="sub">Score</p>
    <div class="big">${practice.score}</div>
    <p class="sub">Best ${practice.best}</p>
    ${newBest ? '<p class="newbest">🏆 New best!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>`;
  overlay.classList.add('show');
  void submitScore('word', practice.best);
  getRank('word', practice.best).then((r) => {
    const badge = rankBadgeHtml(r);
    if (badge) modal.querySelector('.row, .row-btns')?.insertAdjacentHTML('beforebegin', badge);
  });
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(practiceShareCard(practice.round.word, practice.score, practice.best));
    const outcome = await shareResult({
      title: 'Word of the Day',
      url: 'https://games.vanshul.com/word/',
      blob,
      filename: 'word.png',
    });
    const msg = shareToast(outcome);
    if (msg) showToast(msg);
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = startPractice;
}

// ---- boot ----
renderMute();
renderToday();
