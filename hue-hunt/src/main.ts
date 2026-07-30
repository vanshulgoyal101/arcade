import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { HueGame, ROUND_TIME, hslCss } from './game';
import { saveStore } from './storage';
import * as sfx from './audio';
import { hueShareText, copyToClipboard } from './share';

const game = new HueGame();
sfx.setMuted(game.store.muted);

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🎯 Hue Hunt</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="hud">
    <div class="pill" id="p-level"><span class="k">Level</span><span class="v" id="level">1</span></div>
    <div class="pill" id="p-score"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill combo" id="p-combo"><span class="k">Combo</span><span class="v" id="combo">x1</span></div>
    <div class="pill" id="p-best"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="timerbar"><span id="timer"></span></div>
  <div id="board"></div>

  <p class="center hint" id="hint">Tap the tile that looks a little different.</p>

  <div class="combo-flash" id="comboFlash"></div>

  <div class="overlay" id="overlay">
    <div class="modal" id="modal"></div>
  </div>
  <div class="toast" id="toast"></div>
`;

const boardEl = app.querySelector<HTMLDivElement>('#board')!;
const levelEl = app.querySelector<HTMLSpanElement>('#level')!;
const scoreEl = app.querySelector<HTMLSpanElement>('#score')!;
const comboEl = app.querySelector<HTMLSpanElement>('#combo')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const timerEl = app.querySelector<HTMLSpanElement>('#timer')!;
const hintEl = app.querySelector<HTMLParagraphElement>('#hint')!;
const comboFlash = app.querySelector<HTMLDivElement>('#comboFlash')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay);
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

const pLevel = app.querySelector<HTMLDivElement>('#p-level')!;
const pScore = app.querySelector<HTMLDivElement>('#p-score')!;
const pCombo = app.querySelector<HTMLDivElement>('#p-combo')!;

let rafId = 0;
let lastTick = 0;

// ---- helpers ----
function bump(el: HTMLElement): void {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 150);
}

function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

function scorePopup(x: number, y: number, text: string, color: string): void {
  const p = document.createElement('div');
  p.className = 'popup';
  p.textContent = text;
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  p.style.color = color;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 800);
}

function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}

function renderHud(): void {
  levelEl.textContent = String(game.level);
  scoreEl.textContent = String(game.score);
  comboEl.textContent = `x${game.multiplier}`;
  bestEl.textContent = String(game.store.bestScore);
}

function buildBoard(): void {
  const { size, base, odd, oddIndex } = game.round;
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.innerHTML = '';
  for (let i = 0; i < size * size; i++) {
    const b = document.createElement('button');
    b.className = 'tile';
    b.style.background = hslCss(i === oddIndex ? odd : base);
    b.addEventListener('pointerdown', (e) => onPick(i === oddIndex, b, e));
    boardEl.appendChild(b);
  }
}

// ---- interactions ----
function onPick(isOdd: boolean, el: HTMLButtonElement, ev: PointerEvent): void {
  if (!game.playing) return;

  if (isOdd) {
    const { points, fast } = game.correctPick(performance.now());
    sfx.correct(game.combo);
    el.classList.add('correct');
    boardEl.classList.remove('board-flash');
    void boardEl.offsetWidth;
    boardEl.classList.add('board-flash');

    scorePopup(ev.clientX, ev.clientY, `+${points}`, fast ? '#ffd93d' : '#4ecdc4');
    if (game.multiplier >= 2 && game.combo % 3 === 0) {
      comboFlash.textContent = `COMBO x${game.multiplier}!`;
      comboFlash.classList.remove('show');
      void comboFlash.offsetWidth;
      comboFlash.classList.add('show');
      sfx.levelUp();
    }
    bump(pScore);
    bump(pLevel);
    if (game.multiplier >= 2) bump(pCombo);

    renderHud();
    setTimeout(buildBoard, 60);
  } else {
    game.wrongPick();
    sfx.wrong();
    el.classList.add('wrong');
    setTimeout(() => el.classList.remove('wrong'), 300);
    renderHud();
  }
}

// ---- loop ----
function loop(ts: number): void {
  if (!game.playing) return;
  const dt = ts - lastTick;
  lastTick = ts;
  game.tick(dt);
  const pct = Math.max(0, game.timeLeft / ROUND_TIME);
  timerEl.style.transform = `scaleX(${pct})`;
  if (game.timeLeft <= 0) {
    endGame();
    return;
  }
  rafId = requestAnimationFrame(loop);
}

function endGame(): void {
  cancelAnimationFrame(rafId);
  const newBest = game.end();
  sfx.gameOver();
  const reached = game.level - 1;
  modal.innerHTML = `
    <h2>Time!</h2>
    <p class="sub">Score</p>
    <div class="big">${game.score}</div>
    <p class="sub">Reached level ${reached} · Best ${game.store.bestScore}</p>
    ${newBest ? '<p class="newbest">🏆 New best score!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const ok = await copyToClipboard(hueShareText(game.score, reached, game.store.bestScore));
    showToast(ok ? 'Result copied!' : 'Could not copy');
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = start;
}

function start(): void {
  overlay.classList.remove('show');
  game.start(performance.now());
  renderHud();
  buildBoard();
  hintEl.textContent = 'Spot the odd tile — chain fast finds for a combo!';
  lastTick = performance.now();
  rafId = requestAnimationFrame(loop);
}

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  game.store.muted = next;
  saveStore(game.store);
  renderMute();
});

renderMute();
start();
