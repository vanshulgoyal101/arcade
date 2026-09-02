import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { IntervalGame, INTERVALS } from './game';
import { loadStore, saveStore } from './storage';
import * as sfx from './audio';
import { intervalShareText, intervalShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { restoreGame, submitScore } from '../../shared/cloud';

const game = new IntervalGame();
sfx.setMuted(game.store.muted);

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="/">← Arcade</a>
    <h1 class="title">🎹 Interval</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill"><span class="k">Streak</span><span class="v" id="streak">0</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts" id="lives">❤️❤️❤️</span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="play-area">
    <button class="play-btn" id="play">▶</button>
    <div class="replay"><button id="replay">🔁 Replay</button></div>
  </div>

  <div class="options" id="options">
    ${INTERVALS.map(
      (iv) => `<button class="opt" data-semis="${iv.semis}"><span>${iv.name}</span><span class="short">${iv.short}</span></button>`
    ).join('')}
  </div>

  <p class="center hint" id="hint">Press play, listen to the two notes, then pick the interval.</p>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;

const scoreEl = app.querySelector<HTMLSpanElement>('#score')!;
const streakEl = app.querySelector<HTMLSpanElement>('#streak')!;
const livesEl = app.querySelector<HTMLSpanElement>('#lives')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const playBtn = app.querySelector<HTMLButtonElement>('#play')!;
const replayBtn = app.querySelector<HTMLButtonElement>('#replay')!;
const optionsEl = app.querySelector<HTMLDivElement>('#options')!;
const hint = app.querySelector<HTMLParagraphElement>('#hint')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => startGame());
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

let answered = false;

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
function noteName(midi: number): string {
  return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

function showToast(m: string): void {
  toast.textContent = m;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}
function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}
function renderHud(): void {
  scoreEl.textContent = String(game.score);
  streakEl.textContent = String(game.streak);
  livesEl.textContent = '❤️'.repeat(game.lives) + '🖤'.repeat(Math.max(0, 3 - game.lives));
  bestEl.textContent = String(game.best);
}

function playCurrent(): void {
  playBtn.classList.remove('pulse');
  void playBtn.offsetWidth;
  playBtn.classList.add('pulse');
  sfx.playInterval(game.rootMidi, game.current.semis);
}

function clearOptionStates(): void {
  optionsEl.querySelectorAll('.opt').forEach((el) => el.classList.remove('correct', 'wrong'));
}

function newRound(autoplay = true): void {
  answered = false;
  game.nextRound();
  clearOptionStates();
  optionsEl.classList.remove('locked');
  hint.textContent = 'Listen, then pick the interval you heard.';
  if (autoplay) window.setTimeout(playCurrent, 250);
}

function onAnswer(semis: number, btn: HTMLButtonElement): void {
  if (answered) return;
  answered = true;
  optionsEl.classList.add('locked');
  const res = game.answer(semis);

  // Highlight the correct answer and (if wrong) the picked one.
  const correctBtn = optionsEl.querySelector<HTMLButtonElement>(`.opt[data-semis="${game.current.semis}"]`)!;
  correctBtn.classList.add('correct');
  if (!res.correct) btn.classList.add('wrong');

  if (res.correct) sfx.correct();
  else sfx.wrong();
  hint.textContent = `${game.current.name}: ${noteName(game.rootMidi)} → ${noteName(game.rootMidi + game.current.semis)}`;
  renderHud();

  if (res.gameOver) {
    window.setTimeout(() => endGame(res.newBest), 700);
  } else {
    window.setTimeout(() => newRound(true), 850);
  }
}

function endGame(newBest: boolean): void {
  sfx.gameOver();
  const best = game.store.bestScore;
  void submitScore('interval', best);
  modal.innerHTML = `
    <h2>Out of lives</h2>
    <p class="sub">Score</p>
    <div class="big">${game.score}</div>
    <p class="sub">Best ${best}</p>
    ${newBest ? '<p class="newbest">🏆 New best!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(
      intervalShareCard(game.score, best, game.rootMidi, game.current.semis, game.current.name)
    );
    const outcome = await shareResult({
      title: 'Interval',
      text: intervalShareText(game.score, best, newBest),
      url: 'https://games.vanshul.com/interval/',
      blob,
      filename: 'interval.png',
    });
    showToast(shareToast(outcome));
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = () => {
    overlay.classList.remove('show');
    startGame();
  };
}

function startGame(): void {
  overlay.classList.remove('show');
  game.start();
  renderHud();
  newRound(false);
}

optionsEl.querySelectorAll<HTMLButtonElement>('.opt').forEach((btn) => {
  btn.addEventListener('click', () => onAnswer(Number(btn.dataset.semis), btn));
});
playBtn.addEventListener('click', playCurrent);
replayBtn.addEventListener('click', playCurrent);

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  game.store.muted = next;
  saveStore(game.store);
  renderMute();
});

// ---- boot ----
renderMute();
startGame();
// On load, pull this player's saved best down from the cloud (signed-in only).
void restoreGame('interval').then((updated) => { if (updated) { Object.assign(game.store, loadStore()); renderHud(); } });
