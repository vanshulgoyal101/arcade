import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import * as sfx from '../../shared/sfx';
import { FlashGame, type RoundResult } from './game';
import { RsvpPlayer, type Token } from './rsvp';
import type { Passage } from './content';
import { flashShareText, flashShareCard, shareResult, shareToast } from './share';
import { canvasToBlob } from '../../shared/card';

const game = new FlashGame();
const MUTE_KEY = 'flash.muted';
sfx.setMuted(sfx.loadMuted(MUTE_KEY));

// Starting-speed presets (wpm). Adaptation takes over once you're reading.
const PRESETS = [200, 300, 450];

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">⚡ Flash</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Target</span><span class="v"><span id="hud-wpm">250</span><small> wpm</small></span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="hud-best">0</span></div>
    <div class="pill"><span class="k">Read</span><span class="v" id="hud-done">0</span></div>
    <div class="pill"><span class="k">Streak</span><span class="v" id="hud-streak">0</span></div>
  </div>

  <!-- READY -->
  <div class="panel" id="panel-ready">
    <h2>Speed Reading Trainer</h2>
    <p class="lead">Words flash one at a time. Keep your eyes on the red letter and let your brain read — no need to move your gaze. A few questions follow to check you understood. Get them right and Flash speeds you up.</p>
    <div class="diff-picker" id="diffPicker">
      <button class="diff-card" data-wpm="200"><span class="d-label">Easy</span><span class="d-wpm">200 wpm</span></button>
      <button class="diff-card" data-wpm="300"><span class="d-label">Medium</span><span class="d-wpm">300 wpm</span></button>
      <button class="diff-card" data-wpm="450"><span class="d-label">Hard</span><span class="d-wpm">450 wpm</span></button>
    </div>
    <button class="btn full" id="startBtn">Start reading</button>
    <p class="center hint" style="margin-top:12px" id="lifetime"></p>
  </div>

  <!-- READER -->
  <div class="panel hidden" id="panel-reader">
    <div class="reader-wrap">
      <div class="reader-frame">
        <span class="guide-top"></span>
        <span class="guide-bottom"></span>
        <div class="countdown hidden" id="countdown"></div>
        <div class="reader" id="reader">
          <span class="left"></span><span class="pivot"></span><span class="right"></span>
        </div>
      </div>
      <div class="progress"><span id="progress"></span></div>
      <div class="controls-row">
        <button class="btn ghost" id="pauseBtn">Pause</button>
        <button class="btn ghost" id="stopBtn">Stop</button>
      </div>
    </div>
  </div>

  <!-- QUIZ -->
  <div class="panel hidden" id="panel-quiz">
    <h2 id="quiz-title">Quick check</h2>
    <p class="lead">Answer without re-reading — trust what you took in.</p>
    <div id="questions"></div>
    <button class="btn full" id="submitBtn" disabled>See results</button>
  </div>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;

// refs
const hudWpm = app.querySelector<HTMLSpanElement>('#hud-wpm')!;
const hudBest = app.querySelector<HTMLSpanElement>('#hud-best')!;
const hudDone = app.querySelector<HTMLSpanElement>('#hud-done')!;
const hudStreak = app.querySelector<HTMLSpanElement>('#hud-streak')!;

const panelReady = app.querySelector<HTMLDivElement>('#panel-ready')!;
const panelReader = app.querySelector<HTMLDivElement>('#panel-reader')!;
const panelQuiz = app.querySelector<HTMLDivElement>('#panel-quiz')!;

const diffPicker = app.querySelector<HTMLDivElement>('#diffPicker')!;
const startBtn = app.querySelector<HTMLButtonElement>('#startBtn')!;
const lifetime = app.querySelector<HTMLParagraphElement>('#lifetime')!;

const countdownEl = app.querySelector<HTMLDivElement>('#countdown')!;
const readerEl = app.querySelector<HTMLDivElement>('#reader')!;
const readerLeft = readerEl.querySelector<HTMLSpanElement>('.left')!;
const readerPivot = readerEl.querySelector<HTMLSpanElement>('.pivot')!;
const readerRight = readerEl.querySelector<HTMLSpanElement>('.right')!;
const progressEl = app.querySelector<HTMLSpanElement>('#progress')!;
const pauseBtn = app.querySelector<HTMLButtonElement>('#pauseBtn')!;
const stopBtn = app.querySelector<HTMLButtonElement>('#stopBtn')!;

const questionsEl = app.querySelector<HTMLDivElement>('#questions')!;
const submitBtn = app.querySelector<HTMLButtonElement>('#submitBtn')!;

const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, () => void startReading());
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

let player: RsvpPlayer | null = null;
let activePassage: Passage | null = null;
let answers: number[] = [];

function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}
muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  sfx.saveMuted(MUTE_KEY, next);
  renderMute();
});

function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function renderHud(): void {
  hudWpm.textContent = String(game.wpm);
  hudBest.textContent = String(game.store.bestWpm);
  hudDone.textContent = String(game.store.passagesDone);
  hudStreak.textContent = String(game.streak);
}

function renderLifetime(): void {
  const c = game.store.comprehensionCount;
  lifetime.textContent = c
    ? `Lifetime: ${game.store.wordsRead.toLocaleString()} words read · ${Math.round(game.lifetimeComprehension * 100)}% average comprehension`
    : 'Your first run sets your baseline. Pick a level to begin.';
}

function showPanel(which: 'ready' | 'reader' | 'quiz'): void {
  panelReady.classList.toggle('hidden', which !== 'ready');
  panelReader.classList.toggle('hidden', which !== 'reader');
  panelQuiz.classList.toggle('hidden', which !== 'quiz');
}

// ---- Difficulty presets ----
function renderPicker(): void {
  // Highlight the preset closest to the current (possibly adapted) target speed.
  let closest = PRESETS[0];
  for (const p of PRESETS) {
    if (Math.abs(p - game.wpm) < Math.abs(closest - game.wpm)) closest = p;
  }
  diffPicker.querySelectorAll<HTMLButtonElement>('.diff-card').forEach((c) => {
    c.classList.toggle('active', Number(c.dataset.wpm) === closest);
  });
}
diffPicker.querySelectorAll<HTMLButtonElement>('.diff-card').forEach((c) => {
  c.addEventListener('click', () => {
    sfx.click();
    game.setWpm(Number(c.dataset.wpm));
    renderPicker();
    hudWpm.textContent = String(game.wpm);
  });
});

// ---- Reading flow ----
function renderToken(token: Token, index: number, total: number): void {
  readerLeft.textContent = token.left;
  readerPivot.textContent = token.pivot;
  readerRight.textContent = token.right;
  progressEl.style.width = `${((index + 1) / total) * 100}%`;
}

async function countdown(): Promise<void> {
  countdownEl.classList.remove('hidden');
  readerEl.style.visibility = 'hidden';
  for (const n of ['3', '2', '1']) {
    countdownEl.textContent = n;
    sfx.tick();
    await new Promise((r) => setTimeout(r, 550));
  }
  countdownEl.classList.add('hidden');
  readerEl.style.visibility = 'visible';
}

async function startReading(): Promise<void> {
  activePassage = game.nextPassage();
  showPanel('reader');
  progressEl.style.width = '0%';
  pauseBtn.textContent = 'Pause';
  await countdown();

  player = new RsvpPlayer(activePassage.text, game.wpm, renderToken, onReadingDone);
  player.start();
}

function onReadingDone(): void {
  showQuiz();
}

pauseBtn.addEventListener('click', () => {
  if (!player) return;
  sfx.click();
  if (player.isRunning) {
    player.pause();
    pauseBtn.textContent = 'Resume';
  } else {
    player.resume();
    pauseBtn.textContent = 'Pause';
  }
});

stopBtn.addEventListener('click', () => {
  sfx.click();
  player?.stop();
  player = null;
  showPanel('ready');
});

// ---- Quiz flow ----
function showQuiz(): void {
  if (!activePassage) return;
  answers = new Array(activePassage.questions.length).fill(-1);
  questionsEl.innerHTML = '';

  activePassage.questions.forEach((q, qi) => {
    const wrap = document.createElement('div');
    wrap.className = 'question';
    const qt = document.createElement('div');
    qt.className = 'qtext';
    qt.textContent = `${qi + 1}. ${q.q}`;
    wrap.appendChild(qt);

    const opts = document.createElement('div');
    opts.className = 'options';
    q.options.forEach((opt, oi) => {
      const b = document.createElement('button');
      b.className = 'option';
      b.textContent = opt;
      b.addEventListener('click', () => {
        sfx.select();
        answers[qi] = oi;
        opts.querySelectorAll('.option').forEach((el) => el.classList.remove('selected'));
        b.classList.add('selected');
        submitBtn.disabled = answers.includes(-1);
      });
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
    questionsEl.appendChild(wrap);
  });

  submitBtn.disabled = true;
  showPanel('quiz');
}

submitBtn.addEventListener('click', () => {
  if (!activePassage || answers.includes(-1)) return;
  sfx.click();
  const result = game.finishRound(activePassage, answers);
  renderHud();
  showResult(result);
});

// ---- Results ----
function showResult(r: RoundResult): void {
  const pct = Math.round(r.comprehension * 100);
  const up = r.newWpm > r.wpm;
  const down = r.newWpm < r.wpm;
  window.setTimeout(() => (r.newBest ? sfx.levelUp() : pct >= 60 ? sfx.correct() : sfx.wrong()), 60);
  const changeText = up
    ? `▲ Speeding up to ${r.newWpm} wpm`
    : down
      ? `▼ Easing to ${r.newWpm} wpm`
      : `Holding at ${r.newWpm} wpm`;

  modal.innerHTML = `
    <h2>${pct >= 85 ? 'Sharp! 🎯' : pct >= 60 ? 'Nicely done' : 'Keep training'}</h2>
    <p class="hint" style="margin:0">${r.correct}/${r.total} correct at ${r.wpm} wpm</p>
    <div class="stat-grid">
      <div class="stat-box"><div class="n">${pct}%</div><div class="l">Comprehension</div></div>
      <div class="stat-box"><div class="n">${r.effectiveWpm}</div><div class="l">Effective wpm</div></div>
      <div class="stat-box"><div class="n">${r.words}</div><div class="l">Words read</div></div>
      <div class="stat-box"><div class="n">${r.streak}</div><div class="l">Streak</div></div>
    </div>
    <p class="speed-change ${up ? 'up' : down ? 'down' : ''}">${changeText}</p>
    ${r.newBest ? '<p class="newbest">🏆 New best speed!</p>' : ''}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-next">Next passage</button>
    </div>
  `;
  overlay.classList.add('show');
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const blob = await canvasToBlob(flashShareCard(r, game.store.bestWpm));
    const outcome = await shareResult({
      title: 'Flash',
      text: flashShareText(r, game.store.bestWpm),
      url: 'https://games.vanshul.com/flash/dist/',
      blob,
      filename: 'flash.png',
    });
    showToast(shareToast(outcome));
  };
  modal.querySelector<HTMLButtonElement>('#m-next')!.onclick = () => {
    overlay.classList.remove('show');
    void startReading();
  };
}

startBtn.addEventListener('click', () => void startReading());

// ---- boot ----
renderMute();
renderPicker();
renderHud();
renderLifetime();
showPanel('ready');
