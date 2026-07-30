import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { WhereGame, type Mode } from './game';
import { flagEmoji } from './content';
import { whereShareText, copyToClipboard } from './share';

const game = new WhereGame();

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🗺️ Where</h1>
    <span style="width:64px"></span>
  </div>

  <div class="controls">
    <div class="toggle" id="modeToggle">
      <button data-mode="flag" class="active">Flags</button>
      <button data-mode="capital">Capitals</button>
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
const scoreEl = app.querySelector<HTMLSpanElement>('#score')!;
const streakEl = app.querySelector<HTMLSpanElement>('#streak')!;
const livesEl = app.querySelector<HTMLSpanElement>('#lives')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const promptEl = app.querySelector<HTMLDivElement>('#prompt')!;
const optionsEl = app.querySelector<HTMLDivElement>('#options')!;
const hint = app.querySelector<HTMLParagraphElement>('#hint')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay);
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;

let answered = false;

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
    btn.addEventListener('click', () => onAnswer(btn.dataset.name!, btn));
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
  optionsEl.classList.add('locked');
  const res = game.answer(name);

  const correctBtn = optionsEl.querySelector<HTMLButtonElement>(`.opt[data-name="${CSS.escape(game.target.name)}"]`)!;
  correctBtn.classList.add('correct');
  if (!res.correct) btn.classList.add('wrong');
  renderHud();

  if (res.gameOver) window.setTimeout(() => endGame(res.newBest), 750);
  else window.setTimeout(newRound, 850);
}

function endGame(newBest: boolean): void {
  const best = game.store.bestScore;
  modal.innerHTML = `
    <h2>Out of lives</h2>
    <p class="sub">Score</p>
    <div class="big">${game.score}</div>
    <p class="sub">${game.mode === 'flag' ? 'Flags' : 'Capitals'} · Best ${best}</p>
    ${newBest ? '<p class="newbest">🏆 New best!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const ok = await copyToClipboard(whereShareText(game.score, game.mode, best, newBest));
    showToast(ok ? 'Result copied!' : 'Could not copy');
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
  renderPrompt();
  renderOptions();
}

modeToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
  b.addEventListener('click', () => {
    game.setMode(b.dataset.mode as Mode);
    modeToggle.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    hint.textContent = game.mode === 'flag' ? 'Whose flag is this?' : 'Which country has this capital?';
    startGame();
  });
});

// ---- boot ----
startGame();
