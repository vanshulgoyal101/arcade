import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import * as sfx from '../../shared/sfx';
import { canvasToBlob } from '../../shared/card';
import { restoreGame, submitScore, mountRank } from '../../shared/cloud';
import { WordleGame, WORD_LENGTH, MAX_GUESSES, type Tile } from './game';
import { loadStore, winPercent } from './storage';
import { wordleShareCard, shareResult, shareToast } from './share';

const game = new WordleGame();
const MUTE_KEY = 'wordle.muted';
sfx.setMuted(sfx.loadMuted(MUTE_KEY));

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

// Tile-flip timing (ms). FLIP_HALF must match the 50% point of the CSS flip.
const FLIP_STAGGER = 220;
const FLIP_HALF = 250;
const FLIP_DURATION = 500;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="/">← Arcade</a>
    <h1 class="title">🟩 Wordle</h1>
    <div class="topbar-btns">
      <button class="icon-btn" id="restart" title="New word" aria-label="New word"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg></button>
      <button class="icon-btn" id="stats" title="Statistics" aria-label="Statistics">📊</button>
      <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
    </div>
  </div>

  <div class="board" id="board"></div>

  <div class="keyboard" id="keyboard"></div>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="overlay" id="statsOverlay"><div class="modal" id="statsModal"></div></div>
  <div class="toast" id="toast"></div>
`;

const boardEl = app.querySelector<HTMLDivElement>('#board')!;
const keyboardEl = app.querySelector<HTMLDivElement>('#keyboard')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const statsOverlay = app.querySelector<HTMLDivElement>('#statsOverlay')!;
const statsModal = app.querySelector<HTMLDivElement>('#statsModal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;
const statsBtn = app.querySelector<HTMLButtonElement>('#stats')!;

makeDismissable(overlay, () => newGame());
makeDismissable(statsOverlay);

// ---- board + keyboard construction ----
const tiles: HTMLDivElement[][] = [];
for (let r = 0; r < MAX_GUESSES; r++) {
  const row = document.createElement('div');
  row.className = 'row';
  const rowTiles: HTMLDivElement[] = [];
  for (let c = 0; c < WORD_LENGTH; c++) {
    const t = document.createElement('div');
    t.className = 'tile';
    row.appendChild(t);
    rowTiles.push(t);
  }
  tiles.push(rowTiles);
  boardEl.appendChild(row);
}

const keyEls: Record<string, HTMLButtonElement> = {};
KEY_ROWS.forEach((line, i) => {
  const row = document.createElement('div');
  row.className = 'krow';
  if (i === 2) row.appendChild(makeKey('enter', 'Enter', 'wide'));
  for (const ch of line) row.appendChild(makeKey(ch, ch.toUpperCase()));
  if (i === 2) row.appendChild(makeKey('backspace', '⌫', 'wide'));
  keyboardEl.appendChild(row);
});

function makeKey(key: string, label: string, extra = ''): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = `key ${extra}`.trim();
  btn.textContent = label;
  btn.dataset.key = key;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleKey(key);
  });
  keyEls[key] = btn;
  return btn;
}

// ---- rendering ----
function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}

function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout((showToast as unknown as { t?: number }).t);
  (showToast as unknown as { t?: number }).t = window.setTimeout(
    () => toast.classList.remove('show'),
    1400
  );
}

function renderCurrentRow(): void {
  const r = game.guesses.length;
  if (r >= MAX_GUESSES) return;
  for (let c = 0; c < WORD_LENGTH; c++) {
    const ch = game.current[c] ?? '';
    const tile = tiles[r][c];
    tile.textContent = ch.toUpperCase();
    tile.classList.toggle('filled', ch !== '');
  }
}

function paintKeyboard(): void {
  for (const [ch, state] of Object.entries(game.keyStates)) {
    const el = keyEls[ch];
    if (!el) continue;
    el.classList.remove('correct', 'present', 'absent');
    el.classList.add(state);
  }
}

function revealRow(row: number, result: Tile[]): void {
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = tiles[row][c];
    const start = c * FLIP_STAGGER;
    window.setTimeout(() => {
      tile.classList.add('reveal');
      if (c === 0) sfx.tick();
    }, start);
    // Swap in the colour when the tile is edge-on, so it "reveals" mid-flip.
    window.setTimeout(() => tile.classList.add(result[c]), start + FLIP_HALF);
    // Drop the transform/animation once done so Windows/Edge doesn't leave the
    // tile on a GPU layer with the glyph unpainted (the colour class stays).
    window.setTimeout(() => tile.classList.remove('reveal'), start + FLIP_DURATION + 30);
  }
}

function shakeRow(row: number): void {
  const el = boardEl.children[row] as HTMLDivElement;
  el.classList.remove('shake');
  void el.offsetWidth; // reflow to restart the animation
  el.classList.add('shake');
}

// ---- input ----
let locked = false;
// Bumped on every new game so an in-flight reveal timeout aborts.
let runId = 0;

function handleKey(key: string): void {
  if (locked || game.status !== 'playing') return;
  if (key === 'enter') {
    onSubmit();
  } else if (key === 'backspace') {
    if (game.removeLetter()) renderCurrentRow();
  } else if (/^[a-z]$/.test(key)) {
    const r = game.guesses.length;
    if (game.addLetter(key)) {
      renderCurrentRow();
      popTile(r, game.current.length - 1);
    }
  }
}

function popTile(row: number, col: number): void {
  const tile = tiles[row]?.[col];
  if (!tile) return;
  tile.classList.remove('pop');
  void tile.offsetWidth;
  tile.classList.add('pop');
}

function onSubmit(): void {
  const res = game.submit();
  if (!res.ok) {
    shakeRow(game.guesses.length);
    sfx.wrong();
    showToast(res.reason === 'short' ? 'Not enough letters' : 'Not in word list');
    return;
  }
  locked = true;
  revealRow(res.row, res.result);
  const revealMs = (WORD_LENGTH - 1) * FLIP_STAGGER + FLIP_DURATION + 40;
  const myRun = runId;
  window.setTimeout(() => {
    if (myRun !== runId) return;
    paintKeyboard();
    locked = false;
    if (res.status === 'won') {
      bounceRow(res.row);
      sfx.levelUp();
      window.setTimeout(() => { if (myRun === runId) endGame(true, res.newRecord); }, 900);
    } else if (res.status === 'lost') {
      sfx.gameOver();
      window.setTimeout(() => { if (myRun === runId) endGame(false, false); }, 500);
    }
  }, revealMs);
}

function bounceRow(row: number): void {
  for (let c = 0; c < WORD_LENGTH; c++) {
    const tile = tiles[row][c];
    window.setTimeout(() => {
      tile.classList.remove('bounce');
      void tile.offsetWidth;
      tile.classList.add('bounce');
    }, c * 90);
  }
}

// ---- overlays ----
function endGame(won: boolean, newRecord: boolean): void {
  const s = game.store;
  const reveal = won
    ? `<p class="sub">Solved in ${game.guesses.length} ${game.guesses.length === 1 ? 'guess' : 'guesses'}</p>`
    : `<p class="sub">The word was</p><div class="answer">${game.answer.toUpperCase()}</div>`;
  modal.innerHTML = `
    <h2>${won ? 'Splendid!' : 'Next time'}</h2>
    ${reveal}
    ${newRecord ? '<p class="newbest">🔥 New best streak!</p>' : ''}
    ${statBlockHtml()}
    <div class="row-btns">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">New word</button>
    </div>
  `;
  overlay.classList.add('show');
  void submitScore('wordle', s.maxStreak);
  mountRank(modal, 'wordle', s.maxStreak);
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(wordleShareCard(game.results, game.status, s.currentStreak));
    const outcome = await shareResult({
      title: 'Wordle',
      url: 'https://games.vanshul.com/wordle/',
      blob,
      filename: 'wordle.png',
    });
    const msg = shareToast(outcome);
    if (msg) showToast(msg);
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = () => newGame();
}

function statBlockHtml(): string {
  const s = game.store;
  return `
    <div class="stats-grid">
      <div><b>${s.played}</b><span>Played</span></div>
      <div><b>${winPercent(s)}</b><span>Win %</span></div>
      <div><b>${s.currentStreak}</b><span>Streak</span></div>
      <div><b>${s.maxStreak}</b><span>Best</span></div>
    </div>
  `;
}

function distributionHtml(): string {
  const s = game.store;
  const max = Math.max(1, ...s.distribution.slice(1, 7));
  const rows = [];
  for (let i = 1; i <= 6; i++) {
    const n = s.distribution[i] ?? 0;
    const pct = Math.round((n / max) * 100);
    rows.push(
      `<div class="dist-row"><span class="dist-k">${i}</span>` +
        `<div class="dist-bar"><span style="width:${Math.max(8, pct)}%">${n}</span></div></div>`
    );
  }
  return `<div class="dist">${rows.join('')}</div>`;
}

function openStats(): void {
  statsModal.innerHTML = `
    <h2>Statistics</h2>
    ${statBlockHtml()}
    <p class="sub dist-title">Guess distribution</p>
    ${distributionHtml()}
    <div class="row-btns">
      <button class="btn" id="s-close">Close</button>
    </div>
  `;
  statsOverlay.classList.add('show');
  statsModal.querySelector<HTMLButtonElement>('#s-close')!.onclick = () =>
    statsOverlay.classList.remove('show');
}

function newGame(): void {
  overlay.classList.remove('show');
  statsOverlay.classList.remove('show');
  runId++;
  locked = false;
  game.newGame();
  for (const row of tiles) {
    for (const t of row) {
      t.textContent = '';
      t.className = 'tile';
    }
  }
  for (const el of Object.values(keyEls)) el.classList.remove('correct', 'present', 'absent');
}

// ---- wiring ----
window.addEventListener('keydown', (e) => {
  if (overlay.classList.contains('show') || statsOverlay.classList.contains('show')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter') handleKey('enter');
  else if (e.key === 'Backspace') handleKey('backspace');
  else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toLowerCase());
});

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  sfx.saveMuted(MUTE_KEY, next);
  renderMute();
});

statsBtn.addEventListener('click', () => {
  sfx.click();
  openStats();
});

const restartBtn = app.querySelector<HTMLButtonElement>('#restart')!;
restartBtn.addEventListener('click', () => {
  sfx.click();
  newGame();
});

// ---- boot ----
renderMute();
renderCurrentRow();
// On load, pull this player's saved stats down from the cloud (signed-in only).
void restoreGame('wordle').then((updated) => { if (updated) { Object.assign(game.store, loadStore()); } });
