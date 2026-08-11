import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { MathGame, ROUND_TIME, type Op } from './game';
import { saveStore } from './storage';
import * as sfx from './audio';
import { mathShareText, mathShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';
import { submitScore, getRank } from '../../shared/cloud';
import { rankBadgeHtml } from '../../shared/rank';

const game = new MathGame();
sfx.setMuted(game.store.muted);

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="/">← Arcade</a>
    <h1 class="title">🧮 Flashmath</h1>
    <button class="icon-btn" id="mute" title="Toggle sound" aria-label="Toggle sound"></button>
  </div>

  <div class="hud">
    <div class="pill" id="p-level"><span class="k">Level</span><span class="v" id="level">1</span></div>
    <div class="pill" id="p-score"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill combo" id="p-combo"><span class="k">Combo</span><span class="v" id="combo">0</span></div>
    <div class="pill" id="p-best"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="timerrow"><span class="timernum" id="timernum">30s</span></div>
  <div class="timerbar"><span id="timer"></span></div>

  <div class="problem" id="problem">—</div>
  <div class="answer" id="answer">&nbsp;</div>

  <div class="keypad" id="keypad">
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="key" data-k="${n}">${n}</button>`).join('')}
    <button class="key" data-k="back" aria-label="Delete">⌫</button>
    <button class="key" data-k="0">0</button>
    <button class="key enter" data-k="enter" aria-label="Submit">✓</button>
  </div>

  <p class="center hint">Type your answer — it submits the moment it's right. Correct answers add time.</p>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;

const levelEl = app.querySelector<HTMLSpanElement>('#level')!;
const scoreEl = app.querySelector<HTMLSpanElement>('#score')!;
const comboEl = app.querySelector<HTMLSpanElement>('#combo')!;
const bestEl = app.querySelector<HTMLSpanElement>('#best')!;
const timerEl = app.querySelector<HTMLSpanElement>('#timer')!;
const timernumEl = app.querySelector<HTMLSpanElement>('#timernum')!;
const problemEl = app.querySelector<HTMLDivElement>('#problem')!;
const answerEl = app.querySelector<HTMLDivElement>('#answer')!;
const keypad = app.querySelector<HTMLDivElement>('#keypad')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => start());
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;
const pScore = app.querySelector<HTMLDivElement>('#p-score')!;
const pLevel = app.querySelector<HTMLDivElement>('#p-level')!;
const pCombo = app.querySelector<HTMLDivElement>('#p-combo')!;

let entry = '';
let rafId = 0;
let lastTick = 0;

const OP_LABEL: Record<Op, string> = { '+': '+', '−': '−', '×': '×', '÷': '÷' };

function bump(el: HTMLElement): void {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 150);
}
function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1500);
}
function popup(text: string, color: string): void {
  const p = document.createElement('div');
  p.className = 'popup';
  p.textContent = text;
  const rect = problemEl.getBoundingClientRect();
  p.style.left = `${rect.left + rect.width / 2}px`;
  p.style.top = `${rect.top}px`;
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
  comboEl.textContent = String(game.combo);
  bestEl.textContent = String(game.store.bestScore);
}
function renderProblem(): void {
  const p = game.problem;
  problemEl.textContent = `${p.a} ${OP_LABEL[p.op]} ${p.b}`;
  entry = '';
  answerEl.innerHTML = '&nbsp;';
}

function type(ch: string): void {
  if (!game.playing) return;
  if (entry.length >= 6) return;
  entry += ch;
  answerEl.textContent = entry;
  // Auto-submit the instant the typed value matches — no ✓ needed. Compare the
  // exact number (not a prefix) so multi-digit answers like 12 or 144 aren't
  // submitted early while a matching leading digit is still being typed.
  if (Number(entry) === game.problem.answer) submit();
}
function backspace(): void {
  entry = entry.slice(0, -1);
  answerEl.innerHTML = entry || '&nbsp;';
}
function submit(): void {
  if (!game.playing || entry === '') return;
  const res = game.submit(Number(entry), performance.now());
  if (res.correct) {
    sfx.correct(game.combo);
    const mult = game.multiplier > 1 ? ` ×${game.multiplier}` : '';
    popup(`+${res.points}${mult}`, res.fast ? '#ffd93d' : '#4ecdc4');
    bump(pScore);
    bump(pLevel);
    bump(pCombo);
    if (game.multiplier >= 2 && game.combo % 3 === 0) sfx.levelUp();
    renderHud();
    renderProblem();
  } else {
    sfx.wrong();
    answerEl.classList.remove('flash-bad');
    void answerEl.offsetWidth;
    answerEl.classList.add('flash-bad');
    entry = '';
    setTimeout(() => {
      answerEl.classList.remove('flash-bad');
      answerEl.innerHTML = '&nbsp;';
    }, 300);
    renderHud();
  }
}

keypad.querySelectorAll<HTMLButtonElement>('.key').forEach((btn) => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.k!;
    if (k === 'back') backspace();
    else if (k === 'enter') submit();
    else type(k);
  });
});

document.addEventListener('keydown', (e) => {
  if (!game.playing) return;
  if (e.key >= '0' && e.key <= '9') type(e.key);
  else if (e.key === 'Backspace') backspace();
  else if (e.key === 'Enter') submit();
});

function loop(ts: number): void {
  if (!game.playing) return;
  const dt = ts - lastTick;
  lastTick = ts;
  game.tick(dt);
  timerEl.style.transform = `scaleX(${Math.max(0, game.timeLeft / ROUND_TIME)})`;
  const secs = Math.max(0, Math.ceil(game.timeLeft / 1000));
  timernumEl.textContent = `${secs}s`;
  timernumEl.classList.toggle('low', game.timeLeft <= 5000);
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
  modal.innerHTML = `
    <h2>Time!</h2>
    <p class="sub">Score</p>
    <div class="big">${game.score}</div>
    <p class="sub">${game.solved} solved · reached level ${game.level} · Best ${game.store.bestScore}</p>
    ${newBest ? '<p class="newbest">🏆 New best score!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  void submitScore('flashmath', game.store.bestScore);
  getRank('flashmath', game.store.bestScore).then((r) => {
    const badge = rankBadgeHtml(r);
    if (badge) modal.querySelector('.row, .row-btns')?.insertAdjacentHTML('beforebegin', badge);
  });
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(mathShareCard(game.score, game.solved, game.level, game.store.bestScore));
    const outcome = await shareResult({
      title: 'Flashmath',
      text: mathShareText(game.score, game.solved, game.store.bestScore, newBest),
      url: 'https://games.vanshul.com/flashmath/',
      blob,
      filename: 'flashmath.png',
    });
    showToast(shareToast(outcome));
  };
  modal.querySelector<HTMLButtonElement>('#m-again')!.onclick = start;
}

function start(): void {
  overlay.classList.remove('show');
  game.start(performance.now());
  renderHud();
  renderProblem();
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
