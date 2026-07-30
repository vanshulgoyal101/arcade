import './styles.css';
import { makeDismissable } from '../../shared/overlay';
import { toCss, contrastText, toHex, type RGB } from './color';
import { Game, type Difficulty } from './game';
import { endlessShareText, copyToClipboard } from './share';
import { saveStore } from './storage';
import * as sfx from './audio';

const game = new Game();
sfx.setMuted(game.store.muted);

const CHANNEL_NAME: Record<keyof RGB, string> = { r: 'Red', g: 'Green', b: 'Blue' };

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🌈 Chromatic</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="controls">
    <div class="diff" id="diff">
      <button class="diff-btn" data-diff="easy">Easy</button>
      <button class="diff-btn active" data-diff="normal">Normal</button>
      <button class="diff-btn" data-diff="hard">Hard</button>
    </div>
  </div>

  <div class="hud" id="hud"></div>

  <div class="match">
    <div class="swatch target" id="targetSwatch">
      <span class="caption">Target</span>
    </div>
    <div class="swatch you" id="youSwatch">
      <span class="caption">You</span>
      <span class="hexlabel" id="youHex">#808080</span>
    </div>
  </div>

  <div class="sliders">
    ${(['r', 'g', 'b'] as const)
      .map(
        (ch) => `
      <div class="slider-row ${ch}">
        <span class="lab">${ch.toUpperCase()}</span>
        <input type="range" min="0" max="255" value="128" id="s-${ch}" aria-label="${CHANNEL_NAME[ch]}" />
        <span class="val" id="v-${ch}">128</span>
      </div>`
      )
      .join('')}
  </div>

  <div class="actions">
    <button class="btn" id="submit">Submit</button>
  </div>
  <p class="hint" id="hint"></p>

  <div class="overlay" id="overlay">
    <div class="modal" id="modal"></div>
  </div>

  <div class="toast" id="toast"></div>
`;

// ---- Element refs ----
const diff = app.querySelector<HTMLDivElement>('#diff')!;
const hud = app.querySelector<HTMLDivElement>('#hud')!;
const targetSwatch = app.querySelector<HTMLDivElement>('#targetSwatch')!;
const youSwatch = app.querySelector<HTMLDivElement>('#youSwatch')!;
const youHex = app.querySelector<HTMLSpanElement>('#youHex')!;
const submitBtn = app.querySelector<HTMLButtonElement>('#submit')!;
const hint = app.querySelector<HTMLParagraphElement>('#hint')!;
const overlay = app.querySelector<HTMLDivElement>('#overlay')!;
makeDismissable(overlay, restartEndless);
const modal = app.querySelector<HTMLDivElement>('#modal')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
const muteBtn = app.querySelector<HTMLButtonElement>('#mute')!;

const sliders: Record<keyof RGB, HTMLInputElement> = {
  r: app.querySelector<HTMLInputElement>('#s-r')!,
  g: app.querySelector<HTMLInputElement>('#s-g')!,
  b: app.querySelector<HTMLInputElement>('#s-b')!,
};
const vals: Record<keyof RGB, HTMLSpanElement> = {
  r: app.querySelector<HTMLSpanElement>('#v-r')!,
  g: app.querySelector<HTMLSpanElement>('#v-g')!,
  b: app.querySelector<HTMLSpanElement>('#v-b')!,
};

// ---- Rendering ----
function showToast(msg: string): void {
  toast.textContent = msg;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1600);
}

function renderMute(): void {
  muteBtn.textContent = sfx.isMuted() ? '🔇' : '🔊';
}

function renderHud(): void {
  hud.innerHTML = `
    <div class="pill"><span class="k">Level</span><span class="v">${game.level}</span></div>
    <div class="pill"><span class="k">Score</span><span class="v">${game.score}</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts">${'❤️'.repeat(game.lives)}${'🖤'.repeat(Math.max(0, 3 - game.lives))}</span></div>
    <div class="pill"><span class="k">Best</span><span class="v">${game.store.endlessBest}</span></div>
  `;
}

function renderTarget(): void {
  targetSwatch.style.background = toCss(game.target);
  const cap = targetSwatch.querySelector<HTMLSpanElement>('.caption')!;
  cap.style.color = contrastText(game.target);
}

function renderGuess(): void {
  const g = game.guess;
  youSwatch.style.background = toCss(g);
  const cap = youSwatch.querySelector<HTMLSpanElement>('.caption')!;
  cap.style.color = contrastText(g);
  cap.style.background = 'transparent';
  youHex.textContent = toHex(g);
  youHex.style.color = contrastText(g);
  youHex.style.background = 'transparent';
  (['r', 'g', 'b'] as const).forEach((ch) => {
    sliders[ch].value = String(g[ch]);
    vals[ch].textContent = String(g[ch]);
  });
}

function renderControls(): void {
  diff.querySelectorAll<HTMLButtonElement>('.diff-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.diff === game.difficulty);
  });
}

function renderHint(): void {
  hint.textContent = `Reach ${game.threshold}% to clear the round. Miss and you lose a life.`;
}

function renderAll(): void {
  renderControls();
  renderHud();
  renderTarget();
  renderGuess();
  renderHint();
  submitBtn.disabled = game.finished;
}

// ---- Modal ----
function closeModal(): void {
  overlay.classList.remove('show');
}

function openEndlessModal(): void {
  const best = game.store.endlessBest;
  modal.innerHTML = `
    <h2>Game Over</h2>
    <div class="ring" style="--p:100"><span>${game.score}</span></div>
    <p class="hint" style="margin:0">Reached level ${game.level} · Best ${best} 🏆</p>
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-retry">Play again</button>
    </div>
  `;
  overlay.classList.add('show');
  modal.querySelector<HTMLButtonElement>('#m-share')!.onclick = async () => {
    const ok = await copyToClipboard(endlessShareText(game.score, game.level, best));
    showToast(ok ? 'Result copied to clipboard!' : 'Could not copy');
  };
  modal.querySelector<HTMLButtonElement>('#m-retry')!.onclick = () => {
    closeModal();
    game.startEndless();
    renderAll();
  };
}

// ---- Interactions ----
let lastTick = 0;
(['r', 'g', 'b'] as const).forEach((ch) => {
  sliders[ch].addEventListener('input', () => {
    game.setGuess({ [ch]: Number(sliders[ch].value) } as Partial<RGB>);
    const now = performance.now();
    if (now - lastTick > 45) {
      sfx.tick();
      lastTick = now;
    }
    renderGuess();
  });
});

function handleSubmit(): void {
  if (game.finished) return;
  const result = game.submit();

  if (result.gameOver) {
    sfx.gameOver();
    renderAll();
    window.setTimeout(openEndlessModal, 300);
  } else if (result.passed) {
    sfx.levelUp();
    showToast(`✅ ${result.accuracy.toFixed(0)}% — level ${game.level}!`);
    renderAll();
  } else {
    sfx.error();
    showToast(`❌ ${result.accuracy.toFixed(0)}% — needed ${game.threshold}%`);
    renderAll();
  }
}

submitBtn.addEventListener('click', handleSubmit);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !game.finished) handleSubmit();
});

diff.querySelectorAll<HTMLButtonElement>('.diff-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    game.setDifficulty(btn.dataset.diff as Difficulty);
    renderControls();
    renderHint();
  });
});

function restartEndless(): void {
  closeModal();
  game.startEndless();
  renderAll();
}

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

muteBtn.addEventListener('click', () => {
  const next = !sfx.isMuted();
  sfx.setMuted(next);
  game.store.muted = next;
  saveStore(game.store);
  renderMute();
});

// ---- Boot ----
renderMute();
renderAll();
