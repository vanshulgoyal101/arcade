import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { Game, SIZE, WIN_TILE, highestTile, type Direction, type Status } from './game';
import { saveStore } from './storage';
import * as sfx from '../../shared/sfx';
import { shareText, shareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { restoreGame, submitScore, mountRank, queuePending } from '../../shared/cloud';
import { loadStore } from './storage';
import { fmtScore } from '../../shared/format';
import { ICON_2048, muteIcon, ICON_TROPHY } from '../../shared/icons';

const game = new Game();
sfx.setMuted(game.store.muted);

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="/">← Arcade</a>
    <h1 class="title">${ICON_2048} 2048</h1>
    <div class="topbar-actions">
      <button class="icon-btn" id="restart" title="New game" aria-label="New game">↺</button>
      <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
    </div>
  </div>

  <div class="hud">
    <div class="pill" id="p-score"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill" id="p-tile"><span class="k">Tile</span><span class="v" id="tile">0</span></div>
    <div class="pill" id="p-best"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="board" id="board">
    <div class="grid" id="grid" aria-hidden="true"></div>
    <div class="tiles" id="tiles" role="grid" aria-label="2048 board"></div>
  </div>

  <p class="center hint" id="hint">Swipe or use the arrow keys to slide the tiles.</p>

  <div class="overlay" id="overlay">
    <div class="modal" id="modal"></div>
  </div>
  <div class="toast" id="toast"></div>
`;

const boardEl = app.querySelector<HTMLDivElement>('#board')!;
const gridEl = app.querySelector<HTMLDivElement>('#grid')!;
const tilesEl = app.querySelector<HTMLDivElement>('#tiles')!;
const scoreEl = app.querySelector<HTMLSpanElement>('#score')!;
const tileEl = app.querySelector<HTMLSpanElement>('#tile')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const hintEl = app.querySelector<HTMLParagraphElement>('#hint')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(
  overlay,
  () => start(),
  () => {
    if (game.status !== 'won') return true;
    continueAfterWin();
    return false;
  }
);
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;
const pScore = app.querySelector<HTMLDivElement>('#p-score')!;

// ---- helpers ----
function bump(el: HTMLElement): void {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 150);
}

function showToast(msg: string): void {
  if (!msg) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1600);
}

function renderMute(): void {
  muteBtn.innerHTML = muteIcon(sfx.isMuted());
}

function renderHud(): void {
  scoreEl.textContent = fmtScore(game.score);
  tileEl.textContent = fmtScore(highestTile(game.board));
  bestEl.textContent = fmtScore(game.best);
}

// ---- board ----
// Background cells never change; live tiles are absolutely positioned on top so
// a move can transition their transform instead of snapping to new text.
const MOVE_MS = 120;
const CLOUD_DEBOUNCE_MS = 600;
let tileEls = new Map<number, HTMLElement>();
let settle = 0;
let cloudTimer = 0;
let scheduledBest = 0;

function buildGrid(): void {
  gridEl.innerHTML = '';
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    gridEl.appendChild(cell);
  }
}

function setPos(el: HTMLElement, index: number): void {
  el.style.setProperty('--col', String(index % SIZE));
  el.style.setProperty('--row', String(Math.floor(index / SIZE)));
}

/** Rebuild the tile layer from the model, once a slide has landed. */
function renderTiles(merged: number[] = [], spawned = -1): void {
  tilesEl.innerHTML = '';
  tileEls = new Map();
  game.board.forEach((v, i) => {
    if (!v) return;
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.v = String(Math.min(2048, v));
    el.textContent = String(v);
    setPos(el, i);
    if (merged.includes(i)) el.classList.add('merged');
    if (i === spawned) el.classList.add('fresh');
    tilesEl.appendChild(el);
    tileEls.set(i, el);
  });
}

/** Land an in-flight slide now, so a fast second swipe is never dropped. */
function landSlide(): void {
  if (!settle) return;
  clearTimeout(settle);
  settle = 0;
  renderTiles(game.lastMerged, game.spawned);
}

function scheduleBestSync(): void {
  const best = game.store.best;
  if (best <= scheduledBest) return;
  scheduledBest = best;
  // Queue synchronously first: closing the page before the debounce fires still
  // leaves a durable upload for the next game load / reconnect.
  queuePending('2048', best);
  clearTimeout(cloudTimer);
  cloudTimer = window.setTimeout(() => {
    cloudTimer = 0;
    void submitScore('2048', scheduledBest);
  }, CLOUD_DEBOUNCE_MS);
}

// ---- input ----
function tryMove(dir: Direction): void {
  if (!game.isPlaying()) return;
  landSlide();
  const before = game.score;
  const previousBest = game.best;
  if (!game.move(dir)) return;
  if (game.best > previousBest) scheduleBestSync();

  // Slide the tiles that exist now; the layer is rebuilt once they arrive, which
  // is what collapses a merged pair into a single tile.
  for (const m of game.lastMovements) {
    const el = tileEls.get(m.from);
    if (!el) continue;
    if (m.merged) el.style.zIndex = '2';
    setPos(el, m.to);
  }

  if (game.score > before) {
    sfx.correct(Math.log2(Math.max(2, game.score - before)));
    bump(pScore);
  } else {
    sfx.click();
  }
  renderHud();

  settle = window.setTimeout(() => {
    settle = 0;
    renderTiles(game.lastMerged, game.spawned);
    const status: Status = game.status;
    if (status === 'won') showWin();
    else if (status === 'lost') endGame();
  }, MOVE_MS);
}

const KEYS: Record<string, Direction> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down',
};

window.addEventListener('keydown', (e) => {
  const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
  if (!dir) return;
  e.preventDefault(); // arrows would otherwise scroll the page
  tryMove(dir);
});

// Touch: act the moment the gesture passes the threshold, rather than waiting
// for the finger to lift — waiting is what made the swipe feel unresponsive.
let startX = 0;
let startY = 0;
let swiping = false;
const SWIPE = 18;

boardEl.addEventListener('pointerdown', (e) => {
  swiping = true;
  startX = e.clientX;
  startY = e.clientY;
  // Keep receiving moves after the pointer leaves the board, so a flick that
  // starts near an edge still counts. Touch captures implicitly; mouse doesn't.
  boardEl.setPointerCapture?.(e.pointerId);
});
boardEl.addEventListener('pointermove', (e) => {
  if (!swiping) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
  swiping = false; // one move per gesture
  tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
});
const endSwipe = (): void => { swiping = false; };
boardEl.addEventListener('pointerup', endSwipe);
boardEl.addEventListener('pointercancel', endSwipe);

// ---- end of run ----
function showWin(): void {
  sfx.levelUp();
  modal.innerHTML = `
    <h2>${WIN_TILE}!</h2>
    <p class="sub">Score</p>
    <div class="big">${fmtScore(game.score)}</div>
    <p class="sub">You built the ${WIN_TILE} tile — keep going for a bigger one.</p>
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-continue">Keep playing</button>
    </div>
  `;
  overlay.classList.add('show');
  wireShare();
  modal.querySelector<HTMLButtonElement>('#m-continue')!.onclick = continueAfterWin;
}

function continueAfterWin(): void {
  game.continueAfterWin();
  overlay.classList.remove('show');
  hintEl.textContent = 'Past 2048 — how far can you push it?';
}

function endGame(): void {
  sfx.gameOver();
  const newBest = game.end();
  const tile = highestTile(game.board);
  void submitScore('2048', game.store.best);
  hintEl.textContent = 'No moves left.';
  modal.innerHTML = `
    <h2>No moves left</h2>
    <p class="sub">Score</p>
    <div class="big">${fmtScore(game.score)}</div>
    <p class="sub">Biggest tile ${tile} · Best ${fmtScore(game.best)}</p>
    ${newBest ? `<p class="newbest">${ICON_TROPHY} New best score!</p>` : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  mountRank(modal, '2048', game.store.best);
  wireShare();
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = () => start();
}

function wireShare(): void {
  const btn = modal.querySelector<HTMLButtonElement>('#m-share');
  if (!btn) return;
  btn.onclick = async () => {
    const tile = highestTile(game.board);
    const blob = await canvasToBlob(shareCard(game.board, game.score, tile, game.best));
    const outcome = await shareResult({
      title: '2048',
      text: shareText(game.score, tile, game.best),
      url: 'https://games.vanshul.com/2048/',
      blob,
      filename: '2048.png',
    });
    showToast(shareToast(outcome));
  };
}

// ---- lifecycle ----
function start(): void {
  overlay.classList.remove('show');
  clearTimeout(settle);
  settle = 0;
  swiping = false;
  game.start();
  scheduledBest = game.best;
  renderTiles([], game.spawned);
  renderHud();
  hintEl.textContent = 'Swipe or use the arrow keys to slide the tiles.';
}

app.querySelector<HTMLButtonElement>('#restart')!.addEventListener('click', () => {
  sfx.click();
  start();
});

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  game.store.muted = next;
  saveStore(game.store);
  renderMute();
});

renderMute();
buildGrid();
start();

// Pull this device's saved progress once the cloud session is known.
void restoreGame('2048').then((updated) => {
  if (updated) {
    Object.assign(game.store, loadStore());
    renderHud();
  }
});
