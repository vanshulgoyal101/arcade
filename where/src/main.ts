import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { fmtScore } from '../../shared/format';
import * as sfx from '../../shared/sfx';
import { WhereGame, type Mode } from './game';
import { flagEmoji, type Difficulty } from './content';
import { whereShareText, whereShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { restoreGame, submitScore, mountRank } from '../../shared/cloud';
import { answerHtml } from '../../shared/reveal';
import { ICON_WHERE, muteIcon, livesHtml, ICON_TROPHY } from '../../shared/icons';
import { loadStore } from './storage';

const game = new WhereGame();
const MUTE_KEY = 'where.muted';
sfx.setMuted(sfx.loadMuted(MUTE_KEY));

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="/">← Arcade</a>
    <h1 class="title">${ICON_WHERE} Where</h1>
    <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
  </div>

  <div class="controls">
    <div class="toggle" id="modeToggle">
      <button data-mode="flag" class="active">Flags</button>
      <button data-mode="capital">Capitals</button>
    </div>
    <div class="toggle" id="diffToggle">
      <button data-diff="easy" class="active">Easy</button>
      <button data-diff="hard">Hard ×2</button>
    </div>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill"><span class="k">Streak</span><span class="v" id="streak">0</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts" id="lives"></span></div>
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
let inProgress = false; // true once the player has answered — locks difficulty mid-run
let runId = 0;

function onRun(ms: number, fn: () => void): void {
  const id = runId;
  window.setTimeout(() => { if (id === runId) fn(); }, ms);
}

function setDiffLocked(locked: boolean): void {
  diffToggle.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = locked; });
  diffToggle.classList.toggle('locked', locked);
}

function renderMute(): void {
  muteBtn.innerHTML = muteIcon(sfx.isMuted());
}
function showToast(m: string): void {
  toast.textContent = m;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}
function renderHud(): void {
  scoreEl.textContent = fmtScore(game.score);
  streakEl.textContent = String(game.streak);
  livesEl.innerHTML = livesHtml(game.lives, 3);
  bestEl.textContent = fmtScore(game.best);
}

// Load a country's flag as a CORS-clean image (flagcdn sends ACAO:*) so it can be
// drawn onto the share canvas without tainting it. Resolves null on failure.
function loadFlagImage(code: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (value: HTMLImageElement | null): void => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 4000);
    img.crossOrigin = 'anonymous';
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = `https://flagcdn.com/w640/${code.toLowerCase()}.png`;
  });
}

function renderPrompt(): void {
  if (game.mode === 'flag') {
    // Real flag image — regional-indicator emoji show as bare country codes on
    // Windows; fall back to the emoji if the CDN is unreachable.
    const code = game.target.code.toLowerCase();
    promptEl.innerHTML = `<div class="flag"><img class="flag-img" alt="Flag" src="https://flagcdn.com/w320/${code}.png" srcset="https://flagcdn.com/w640/${code}.png 2x" /></div>`;
    const img = promptEl.querySelector('img');
    if (img) img.addEventListener('error', () => img.replaceWith(document.createTextNode(flagEmoji(game.target.code))), { once: true });
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
  if (!inProgress) { inProgress = true; setDiffLocked(true); }
  sfx.select();
  optionsEl.classList.add('locked');
  const res = game.answer(name);

  const correctBtn = optionsEl.querySelector<HTMLButtonElement>(`.opt[data-name="${CSS.escape(game.target.name)}"]`)!;
  correctBtn.classList.add('correct');
  if (!res.correct) btn.classList.add('wrong');
  onRun(120, () => (res.correct ? sfx.correct(game.streak) : sfx.wrong()));
  renderHud();

  if (res.gameOver) onRun(750, () => { sfx.gameOver(); endGame(res.newBest); });
  else onRun(850, newRound);
}

function endGame(newBest: boolean): void {
  inProgress = false;
  setDiffLocked(false);
  const best = game.best;
  const label = `${game.mode === 'flag' ? 'Flags' : 'Capitals'} · ${game.difficulty === 'hard' ? 'Hard' : 'Easy'}`;
  modal.innerHTML = `
    <h2>Out of lives</h2>
    <p class="sub">Score</p>
    <div class="big">${fmtScore(game.score)}</div>
    <p class="sub">${label} · Best ${fmtScore(best)}</p>
    ${answerHtml(
      game.mode === 'flag' ? 'That flag was' : `${game.target.capital} is the capital of`,
      game.target.name
    )}
    ${newBest ? `<p class="newbest">${ICON_TROPHY} New best!</p>` : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  void submitScore('where', game.best);
  mountRank(modal, 'where', game.best);
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const result = {
      score: game.score,
      mode: game.mode,
      difficulty: game.difficulty,
      target: { ...game.target },
    };
    const flag = await loadFlagImage(result.target.code);
    const blob = await canvasToBlob(
      whereShareCard(result.score, result.mode, result.difficulty, best, result.target, flag)
    );
    const outcome = await shareResult({
      title: 'Where',
      text: whereShareText(result.score, result.mode, result.difficulty, best, newBest),
      url: 'https://games.vanshul.com/where/',
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
  runId++;
  overlay.classList.remove('show');
  answered = false;
  inProgress = false;
  setDiffLocked(false);
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
    if (inProgress) return; // no difficulty changes mid-game
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
// On load, pull this player's saved best down from the cloud (signed-in only).
void restoreGame('where').then((updated) => { if (updated) { Object.assign(game.store, loadStore()); renderHud(); } });
