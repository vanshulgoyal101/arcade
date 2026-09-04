import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { EchoGame } from './game';
import { loadStore, saveStore } from './storage';
import * as sfx from './audio';
import { echoShareText, echoShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { restoreGame, submitScore, mountRank } from '../../shared/cloud';
import { ICON_ECHO, muteIcon, livesHtml, ICON_TROPHY } from '../../shared/icons';

const game = new EchoGame();
sfx.setMuted(game.store.muted);

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="/">← Arcade</a>
    <h1 class="title">${ICON_ECHO} Echo</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="toggles">
    <div class="toggle" id="modeToggle">
      <button data-strict="false" class="active">Forgiving</button>
      <button data-strict="true">Strict</button>
    </div>
    <div class="toggle" id="padToggle">
      <button data-pads="4" class="active">4 pads</button>
      <button data-pads="6">6 pads</button>
    </div>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Level</span><span class="v" id="level">0</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts" id="lives"></span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="pads p4" id="pads"></div>

  <div class="center">
    <p class="status" id="status">Press Start and watch the pattern.</p>
    <button class="btn" id="startBtn">Start</button>
    <p class="hint" id="hint"></p>
  </div>

  <div class="overlay" id="overlay">
    <div class="modal" id="modal"></div>
  </div>
  <div class="toast" id="toast"></div>
`;

const modeToggle = app.querySelector<HTMLDivElement>('#modeToggle')!;
const padToggle = app.querySelector<HTMLDivElement>('#padToggle')!;
const padsEl = app.querySelector<HTMLDivElement>('#pads')!;
const levelEl = app.querySelector<HTMLSpanElement>('#level')!;
const livesEl = app.querySelector<HTMLSpanElement>('#lives')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const statusEl = app.querySelector<HTMLParagraphElement>('#status')!;
const hintEl = app.querySelector<HTMLParagraphElement>('#hint')!;
const startBtn = app.querySelector<HTMLButtonElement>('#startBtn')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => startGame());
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

let acceptingInput = false;
let playing = false;
// Pending game-over reveal; cleared on restart so a stale timer can't drop the
// results modal over a fresh round.
let revealTimer = 0;
const REVEAL_MS = 900;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}

function renderMute(): void {
  muteBtn.innerHTML = muteIcon(sfx.isMuted());
}

function renderToggles(): void {
  modeToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    b.classList.toggle('active', (b.dataset.strict === 'true') === game.strict);
  });
  padToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.pads) === game.pads);
  });
  modeToggle.classList.toggle('locked', playing);
  padToggle.classList.toggle('locked', playing);
}

function renderHud(): void {
  levelEl.textContent = String(game.level);
  const total = game.strict ? 1 : 3;
  livesEl.innerHTML = livesHtml(game.lives, total);
  bestEl.textContent = String(game.best);
}

function buildPads(): void {
  padsEl.className = `pads p${game.pads}`;
  padsEl.innerHTML = '';
  for (let i = 0; i < game.pads; i++) {
    const b = document.createElement('button');
    b.className = `pad c${i}`;
    b.setAttribute('aria-label', `pad ${i + 1}`);
    b.addEventListener('pointerdown', () => onPad(i));
    padsEl.appendChild(b);
  }
}

function sparkle(pad: HTMLElement): void {
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    pad.appendChild(s);
    const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
    const dist = 40 + Math.random() * 30;
    s.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.9 },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0)`,
          opacity: 0,
        },
      ],
      { duration: 450, easing: 'ease-out' }
    );
    setTimeout(() => s.remove(), 460);
  }
}

function padEl(i: number): HTMLButtonElement {
  return padsEl.children[i] as HTMLButtonElement;
}

async function lightPad(i: number, dur: number): Promise<void> {
  const el = padEl(i);
  el.classList.add('lit');
  sfx.padTone(i, dur / 1000);
  sparkle(el);
  await wait(dur);
  el.classList.remove('lit');
  await wait(game.gapDuration());
}

async function playSequence(): Promise<void> {
  acceptingInput = false;
  padsEl.classList.add('locked');
  statusEl.textContent = 'Watch…';
  await wait(500);
  const dur = game.stepDuration();
  for (const pad of game.sequence) {
    await lightPad(pad, dur);
  }
  acceptingInput = true;
  padsEl.classList.remove('locked');
  statusEl.textContent = 'Your turn — repeat it!';
}

function nextLevel(): void {
  game.addStep();
  renderHud();
  void playSequence();
}

async function onPad(i: number): Promise<void> {
  if (!acceptingInput) return;
  const el = padEl(i);
  el.classList.add('lit');
  sfx.padTone(i, 0.22);
  sparkle(el);
  setTimeout(() => el.classList.remove('lit'), 180);

  const result = game.press(i);
  if (result === 'ok') return;

  if (result === 'complete') {
    acceptingInput = false;
    statusEl.textContent = 'Nice! 🎉';
    sfx.levelUp();
    await wait(650);
    nextLevel();
    return;
  }

  if (result === 'wrong-alive') {
    acceptingInput = false;
    sfx.error();
    renderHud();
    statusEl.textContent = `Oops! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left — watch again.`;
    await wait(900);
    void playSequence();
    return;
  }

  // wrong-over
  gameOver();
}

function gameOver(): void {
  acceptingInput = false;
  playing = false;
  sfx.gameOver();
  const reached = game.sequence.length - 1;
  const newBest = game.recordBest();
  void submitScore('echo', Math.max(0, ...Object.values(game.store.best)));
  renderToggles();
  renderHud();

  // Show the pad they were meant to hit before the modal covers the board.
  const missed = game.sequence[game.inputIndex];
  statusEl.textContent = 'That was the one you needed.';
  void lightPad(missed, 620);
  revealTimer = window.setTimeout(() => showGameOver(reached, newBest), REVEAL_MS);
}

function showGameOver(reached: number, newBest: boolean): void {
  modal.innerHTML = `
    <h2>Game Over</h2>
    <p class="sub">You remembered</p>
    <div class="big">${reached}</div>
    <p class="sub">steps · ${game.strict ? 'Strict' : 'Forgiving'} · ${game.pads}-pad · Best ${game.best}</p>
    ${newBest ? `<p class="newbest">${ICON_TROPHY} New best!</p>` : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  mountRank(modal, 'echo', Math.max(0, ...Object.values(game.store.best)));
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(echoShareCard(reached, game.strict, game.pads, game.best));
    const outcome = await shareResult({
      title: 'Echo',
      text: echoShareText(reached, game.strict, game.pads, game.best, newBest),
      url: 'https://games.vanshul.com/echo/',
      blob,
      filename: 'echo.png',
    });
    showToast(shareToast(outcome));
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = () => {
    overlay.classList.remove('show');
    startGame();
  };
}

function startGame(): void {
  clearTimeout(revealTimer);
  overlay.classList.remove('show');
  playing = true;
  game.reset();
  buildPads();
  renderToggles();
  renderHud();
  startBtn.classList.add('hidden');
  hintEl.textContent = game.strict
    ? 'Strict: one mistake ends the run.'
    : 'Forgiving: 3 lives — a slip just replays the pattern.';
  nextLevel();
}

// ---- toggles ----
modeToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
  b.addEventListener('click', () => {
    if (playing) return;
    game.setStrict(b.dataset.strict === 'true');
    game.reset();
    renderToggles();
    renderHud();
  });
});
padToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
  b.addEventListener('click', () => {
    if (playing) return;
    game.setPads(Number(b.dataset.pads));
    buildPads();
    renderToggles();
    renderHud();
  });
});

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  game.store.muted = next;
  saveStore(game.store);
  renderMute();
});

startBtn.addEventListener('click', startGame);

// ---- boot ----
renderMute();
renderToggles();
renderHud();
buildPads();
// On load, pull this player's saved best down from the cloud (signed-in only).
void restoreGame('echo').then((updated) => { if (updated) { Object.assign(game.store, loadStore()); renderHud(); } });
