import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { DigitGame, type Mode } from './game';
import { saveStore } from './storage';
import * as sfx from './audio';
import { digitShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';

const game = new DigitGame();
sfx.setMuted(game.store.muted);

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🔢 Digit Span</h1>
    <div class="topbar-actions">
      <button class="icon-btn" id="restart" title="Restart" aria-label="Restart"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
      <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
    </div>
  </div>

  <div class="controls">
    <div class="toggle" id="modeToggle">
      <button data-mode="forward" class="active">Forward</button>
      <button data-mode="reverse">Reverse</button>
    </div>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Span</span><span class="v" id="span">0</span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="stage" id="stage">
    <div class="msg" id="msg">Memorise the digits, then type them back.</div>
  </div>

  <div class="center" id="startWrap">
    <button class="btn" id="startBtn">Start</button>
  </div>

  <div class="keypad hidden locked" id="keypad">
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}
    <button class="key" data-k="back" aria-label="Delete">⌫</button>
    <button class="key" data-k="0">0</button>
    <button class="key enter" data-k="enter" aria-label="Submit">✓</button>
  </div>

  <p class="center hint" id="hint">Reverse mode: type the digits backwards.</p>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;

const modeToggle = app.querySelector<HTMLDivElement>('#modeToggle')!;
const spanEl = app.querySelector<HTMLSpanElement>('#span')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const stage = app.querySelector<HTMLDivElement>('#stage')!;
const msg = app.querySelector<HTMLDivElement>('#msg')!;
const startWrap = app.querySelector<HTMLDivElement>('#startWrap')!;
const startBtn = app.querySelector<HTMLButtonElement>('#startBtn')!;
const keypad = app.querySelector<HTMLDivElement>('#keypad')!;
const hint = app.querySelector<HTMLParagraphElement>('#hint')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => startRun());
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;
const restartBtn = app.querySelector<HTMLButtonElement>('#restart')!;

let entry: number[] = [];
let accepting = false;
// Bumped on every (re)start so in-flight async sequences/timeouts abort.
let runId = 0;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function showToast(m: string): void {
  toast.textContent = m;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}
function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}
function renderHud(): void {
  spanEl.textContent = String(game.level);
  bestEl.textContent = String(game.best);
}
function setKeypad(on: boolean): void {
  keypad.classList.toggle('hidden', !on);
  keypad.classList.toggle('locked', !on);
}

function renderEntry(bad = false): void {
  const filled = entry.join(' ');
  stage.innerHTML = `
    <div>
      <div class="entry${bad ? ' bad' : ''}">${filled || '&nbsp;'}</div>
      <div class="dots">${game.sequence
        .map((_, i) => `<span class="d ${i < entry.length ? 'filled' : ''}"></span>`)
        .join('')}</div>
    </div>`;
}

async function showSequence(): Promise<void> {
  const myRun = runId;
  accepting = false;
  setKeypad(false);
  const dur = game.flashDuration();
  for (const d of game.sequence) {
    if (myRun !== runId) return;
    stage.innerHTML = `<div class="digit show">${d}</div>`;
    sfx.digit(d);
    await wait(dur);
    if (myRun !== runId) return;
    stage.innerHTML = `<div class="digit">&nbsp;</div>`;
    await wait(220);
  }
  if (myRun !== runId) return;
  entry = [];
  renderEntry();
  msg.textContent = '';
  setKeypad(true);
  accepting = true;
  hint.textContent = 'Type all the digits, then press ✓ (or Enter).';
}

function nextRound(): void {
  game.addDigit();
  renderHud();
  msg.textContent = 'Watch…';
  stage.innerHTML = `<div class="msg">Watch…</div>`;
  void showSequence();
}

function typeDigit(n: number): void {
  if (!accepting) return;
  if (entry.length >= game.sequence.length) return;
  entry.push(n);
  sfx.key();
  renderEntry();
}
function backspace(): void {
  if (!accepting) return;
  entry.pop();
  renderEntry();
}
function check(): void {
  if (game.check(entry)) {
    sfx.correct();
    flashOk();
    const myRun = runId;
    window.setTimeout(() => {
      if (myRun === runId) nextRound();
    }, 500);
  } else {
    sfx.wrong();
    renderEntry(true);
    gameOver();
  }
}
function flashOk(): void {
  stage.innerHTML = `<div class="digit" style="color:var(--accent)">✓</div>`;
}

function gameOver(): void {
  accepting = false;
  runId++;
  setKeypad(false);
  const reached = game.sequence.length - 1;
  const newBest = game.recordBest();
  renderHud();
  modeToggle.classList.remove('locked');
  modal.innerHTML = `
    <h2>Missed it!</h2>
    <p class="sub">You recalled</p>
    <div class="big">${reached}</div>
    <p class="sub">digits · ${game.mode} · Best ${game.best}</p>
    <p class="seqline">Sequence: ${game.expected().join(' ')}</p>
    ${newBest ? '<p class="newbest">🏆 New best!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(digitShareCard(game.expected(), reached, game.mode, game.best));
    const outcome = await shareResult({
      title: 'Digit Span',
      url: 'https://games.vanshul.com/digit-span/',
      blob,
      filename: 'digit-span.png',
    });
    showToast(shareToast(outcome));
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = () => {
    overlay.classList.remove('show');
    startRun();
  };
}

function startRun(): void {
  overlay.classList.remove('show');
  runId++;
  accepting = false;
  entry = [];
  startWrap.classList.add('hidden');
  modeToggle.classList.add('locked');
  game.reset();
  renderHud();
  nextRound();
}

// ---- input ----
keypad.querySelectorAll<HTMLButtonElement>('.key').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.k!;
    if (k === 'back') backspace();
    else if (k === 'enter') submit();
    else typeDigit(Number(k));
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') typeDigit(Number(e.key));
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Enter') submit();
});

function submit(): void {
  // Only submit once the full span has been entered.
  if (!accepting || entry.length !== game.sequence.length) return;
  accepting = false;
  setKeypad(false);
  check();
}

modeToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
  b.addEventListener('click', () => {
    if (modeToggle.classList.contains('locked')) return;
    game.setMode(b.dataset.mode as Mode);
    modeToggle.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    renderHud();
    hint.textContent =
      game.mode === 'reverse' ? 'Reverse mode: type the digits backwards.' : 'Forward mode: type the digits in order.';
  });
});

startBtn.addEventListener('click', startRun);

// Restart is always available from the topbar; mid-run it abandons the current
// run (aborting the in-flight sequence) and starts fresh.
restartBtn.addEventListener('click', () => {
  runId++;
  accepting = false;
  startRun();
});

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  game.store.muted = next;
  saveStore(game.store);
  renderMute();
});

// ---- boot ----
renderMute();
renderHud();
