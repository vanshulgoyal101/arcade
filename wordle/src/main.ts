import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import * as sfx from '../../shared/sfx';
import { canvasToBlob } from '../../shared/card';
import { WordleGame, WORD_LENGTH, MAX_GUESSES, type Tile } from './game';
import { winPercent } from './storage';
import { wordleShareText, wordleShareCard, shareResult, shareToast } from './share';

const game = new WordleGame();
const MUTE_KEY = 'wordle.muted';
sfx.setMuted(sfx.loadMuted(MUTE_KEY));

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🟩 Wordle</h1>
    <div class="topbar-btns">
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
    window.setTimeout(() => {
      tile.classList.add('reveal', result[c]);
      if (c === 0) sfx.tick();
    }, c * 260);
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
  const revealMs = (WORD_LENGTH - 1) * 260 + 340;
  window.setTimeout(() => {
    paintKeyboard();
    locked = false;
    if (res.status === 'won') {
      bounceRow(res.row);
      sfx.levelUp();
      window.setTimeout(() => endGame(true, res.newRecord), 900);
    } else if (res.status === 'lost') {
      sfx.gameOver();
      window.setTimeout(() => endGame(false, false), 500);
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
  const solvedLine = won
    ? `Solved in ${game.guesses.length} ${game.guesses.length === 1 ? 'guess' : 'guesses'}`
    : `The word was <b>${game.answer.toUpperCase()}</b>`;
  modal.innerHTML = `
    <h2>${won ? 'Splendid!' : 'Next time'}</h2>
    <p class="sub">${solvedLine}</p>
    ${newRecord ? '<p class="newbest">🔥 New best streak!</p>' : ''}
    ${statBlockHtml()}
    <div class="row-btns">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">New word</button>
    </div>
  `;
  overlay.classList.add('show');
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(wordleShareCard(game.results, game.status, s.currentStreak));
    const outcome = await shareResult({
      title: 'Tiny Wordle',
      text: wordleShareText(game.results, game.status),
      url: 'https://games.vanshul.com/wordle/dist/',
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

// ---- boot ----
renderMute();
renderCurrentRow();
