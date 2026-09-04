import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { Game, SIZE, WIN_TILE, highestTile, type Direction, type Status } from './game';
import { saveStore } from './storage';
import * as sfx from '../../shared/sfx';
import { shareText, shareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { restoreGame, submitScore, mountRank } from '../../shared/cloud';
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
      <button class="icon-btn" id="restart" title="New game">↺</button>
      <button class="icon-btn" id="mute" title="Toggle sound"></button>
    </div>
  </div>

  <div class="hud">
    <div class="pill" id="p-score"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill" id="p-tile"><span class="k">Tile</span><span class="v" id="tile">0</span></div>
    <div class="pill" id="p-best"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div id="board" class="board" role="grid" aria-label="2048 board"></div>

  <p class="center hint" id="hint">Swipe or use the arrow keys to slide the tiles.</p>

  <div class="overlay" id="overlay">
    <div class="modal" id="modal"></div>
  </div>
  <div class="toast" id="toast"></div>
`;

const boardEl = app.querySelector<HTMLDivElement>('#board')!;
const scoreEl = app.querySelector<HTMLSpanElement>('#score')!;
const tileEl = app.querySelector<HTMLSpanElement>('#tile')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const hintEl = app.querySelector<HTMLParagraphElement>('#hint')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => start());
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
function buildBoard(): void {
  boardEl.innerHTML = '';
  for (let i = 0; i < SIZE * SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    boardEl.appendChild(cell);
  }
  renderBoard();
}

function renderBoard(): void {
  const cells = boardEl.children;
  for (let i = 0; i < SIZE * SIZE; i++) {
    const el = cells[i] as HTMLDivElement;
    const v = game.board[i];
    el.textContent = v ? String(v) : '';
    // A single data attribute drives every tile colour + font size in CSS.
    el.dataset.v = v ? String(Math.min(2048, v)) : '';
    el.classList.toggle('filled', v > 0);
    el.classList.remove('merged', 'fresh');
  }
  for (const i of game.lastMerged) cells[i]?.classList.add('merged');
  if (game.spawned >= 0) cells[game.spawned]?.classList.add('fresh');
}

// ---- input ----
let busy = false;

function tryMove(dir: Direction): void {
  if (busy || !game.isPlaying()) return;
  const before = game.score;
  if (!game.move(dir)) return;

  if (game.score > before) {
    sfx.correct(Math.log2(Math.max(2, game.score - before)));
    bump(pScore);
  } else {
    sfx.click();
  }
  renderBoard();
  renderHud();

  const status: Status = game.status;
  if (status === 'won') {
    busy = true;
    window.setTimeout(() => { busy = false; showWin(); }, 220);
  } else if (status === 'lost') {
    busy = true;
    window.setTimeout(() => { busy = false; endGame(); }, 260);
  }
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

// Touch: a swipe past the threshold on the dominant axis moves that way.
let startX = 0;
let startY = 0;
let tracking = false;
const SWIPE = 24;

boardEl.addEventListener('pointerdown', (e) => {
  tracking = true;
  startX = e.clientX;
  startY = e.clientY;
});
boardEl.addEventListener('pointerup', (e) => {
  if (!tracking) return;
  tracking = false;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
  tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
});
boardEl.addEventListener('pointercancel', () => { tracking = false; });

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
  modal.querySelector<HTMLButtonElement>('#m-continue')!.onclick = () => {
    game.continueAfterWin();
    overlay.classList.remove('show');
    hintEl.textContent = 'Past 2048 — how far can you push it?';
  };
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
  busy = false;
  game.start();
  renderBoard();
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
buildBoard();
start();

// Pull this device's saved progress once the cloud session is known.
void restoreGame('2048').then((updated) => {
  if (updated) {
    Object.assign(game.store, loadStore());
    renderHud();
  }
});
