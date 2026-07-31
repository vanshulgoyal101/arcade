import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import * as sfx from '../../shared/sfx';
import { WhereGame, type Mode } from './game';
import { flagEmoji, type Difficulty } from './content';
import { whereShareText, whereShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { submitScore, getRank } from '../../shared/cloud';
import { rankBadgeHtml } from '../../shared/rank';

const game = new WhereGame();
const MUTE_KEY = 'where.muted';
sfx.setMuted(sfx.loadMuted(MUTE_KEY));

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🗺️ Where</h1>
    <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
  </div>

  <div class="controls">
    <div class="toggle" id="modeToggle">
      <button data-mode="flag" class="active">Flags</button>
      <button data-mode="capital">Capitals</button>
    </div>
    <div class="toggle" id="diffToggle">
      <button data-diff="easy" class="active">Easy</button>
      <button data-diff="hard">Hard</button>
    </div>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill"><span class="k">Streak</span><span class="v" id="streak">0</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts" id="lives">❤️❤️❤️</span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="prompt" id="prompt"></div>
  <div class="options" id="options"></div>

  <p class="center hint" id="hint">Which country is it?</p>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;

const modeToggle = app.querySelector<HTMLDivElement>('#modeToggle')!;
const diffToggle = app.querySelector<HTMLDivElement>('#diffToggle')!;
const scoreEl = app.querySelector<HTMLSpanElement>('#score')!;
const streakEl = app.querySelector<HTMLSpanElement>('#streak')!;
const livesEl = app.querySelector<HTMLSpanElement>('#lives')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const promptEl = app.querySelector<HTMLDivElement>('#prompt')!;
const optionsEl = app.querySelector<HTMLDivElement>('#options')!;
const hint = app.querySelector<HTMLParagraphElement>('#hint')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => startGame());
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

let answered = false;

function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}
function showToast(m: string): void {
  toast.textContent = m;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}
function renderHud(): void {
  scoreEl.textContent = String(game.score);
  streakEl.textContent = String(game.streak);
  livesEl.textContent = '❤️'.repeat(game.lives) + '🖤'.repeat(Math.max(0, 3 - game.lives));
  bestEl.textContent = String(game.best);
}

function renderPrompt(): void {
  if (game.mode === 'flag') {
    promptEl.innerHTML = `<div class="flag">${flagEmoji(game.target.code)}</div>`;
  } else {
    promptEl.innerHTML = `<div class="capital"><small>Capital city</small>${game.target.capital}</div>`;
  }
}

function renderOptions(): void {
  optionsEl.classList.remove('locked');
  optionsEl.innerHTML = game.options
    .map((c) => `<button class="opt" data-name="${c.name}">${c.name}</button>`)
    .join('');
  optionsEl.querySelectorAll<HTMLButtonElement>('.opt').forEach((btn) => {
    btn.addEventListener('pointerdown', () => onAnswer(btn.dataset.name!, btn));
  });
}

function newRound(): void {
  answered = false;
  game.nextRound();
  renderPrompt();
  renderOptions();
}

function onAnswer(name: string, btn: HTMLButtonElement): void {
  if (answered) return;
  answered = true;
  sfx.select();
  optionsEl.classList.add('locked');
  const res = game.answer(name);

  const correctBtn = optionsEl.querySelector<HTMLButtonElement>(`.opt[data-name="${CSS.escape(game.target.name)}"]`)!;
  correctBtn.classList.add('correct');
  if (!res.correct) btn.classList.add('wrong');
  window.setTimeout(() => (res.correct ? sfx.correct(game.streak) : sfx.wrong()), 120);
  renderHud();

  if (res.gameOver) window.setTimeout(() => { sfx.gameOver(); endGame(res.newBest); }, 750);
  else window.setTimeout(newRound, 850);
}

function endGame(newBest: boolean): void {
  const best = game.best;
  const label = `${game.mode === 'flag' ? 'Flags' : 'Capitals'} · ${game.difficulty === 'hard' ? 'Hard' : 'Easy'}`;
  modal.innerHTML = `
    <h2>Out of lives</h2>
    <p class="sub">Score</p>
    <div class="big">${game.score}</div>
    <p class="sub">${label} · Best ${best}</p>
    ${newBest ? '<p class="newbest">🏆 New best!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  void submitScore('where', game.best);
  getRank('where', game.best).then((r) => {
    const badge = rankBadgeHtml(r);
    if (badge) modal.querySelector('.row, .row-btns')?.insertAdjacentHTML('beforebegin', badge);
  });
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(whereShareCard(game.score, game.mode, game.difficulty, best, game.target));
    const outcome = await shareResult({
      title: 'Where',
      text: whereShareText(game.score, game.mode, game.difficulty, best, newBest),
      url: 'https://games.vanshul.com/where/dist/',
      blob,
      filename: 'where.png',
    });
    { const msg = shareToast(outcome); if (msg) showToast(msg); }
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = () => {
    overlay.classList.remove('show');
    startGame();
  };
}

function startGame(): void {
  overlay.classList.remove('show');
  answered = false;
  game.start();
  renderHud();
  renderPrompt();
  renderOptions();
}

modeToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
  b.addEventListener('click', () => {
    sfx.click();
    game.setMode(b.dataset.mode as Mode);
    modeToggle.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    hint.textContent = game.mode === 'flag' ? 'Whose flag is this?' : 'Which country has this capital?';
    startGame();
  });
});

diffToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
  b.addEventListener('click', () => {
    sfx.click();
    game.setDifficulty(b.dataset.diff as Difficulty);
    diffToggle.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    startGame();
  });
});

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  sfx.saveMuted(MUTE_KEY, next);
  renderMute();
});

// ---- boot ----
renderMute();
startGame();
