// Makes a full-screen `.overlay` (with a `.modal` child) dismissable the way users
// expect — click/tap the backdrop, press Escape, or use an injected ✕ button — and,
// when a restart callback is given, reveals a persistent "Play again" pill after the
// result modal is dismissed so the player is never stranded at a frozen end screen.
//
// The injected controls live outside the modal and inherit the theme's CSS vars, so
// no per-game markup or CSS is needed. `onReplay` only fires from a dismissed result
// modal (i.e. the game is already over), so triggering a restart from it is safe.

export function makeDismissable(overlay: HTMLElement, onReplay?: () => void): void {
  let replay: HTMLButtonElement | null = null;
  if (onReplay) {
    replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = '↻ Play again';
    Object.assign(replay.style, {
      position: 'fixed',
      left: '50%',
      bottom: 'max(22px, env(safe-area-inset-bottom))',
      transform: 'translateX(-50%)',
      display: 'none',
      zIndex: '55',
      padding: '12px 24px',
      borderRadius: '999px',
      border: 'none',
      background: 'var(--accent)',
      color: '#10131c',
      font: 'inherit',
      fontWeight: '800',
      fontSize: '1rem',
      boxShadow: 'var(--shadow)',
      cursor: 'pointer',
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent',
    });
    replay.addEventListener('click', () => {
      replay!.style.display = 'none';
      onReplay();
    });
    document.body.appendChild(replay);
  }

  const close = (): void => {
    if (!overlay.classList.contains('show')) return;
    overlay.classList.remove('show');
    if (replay) replay.style.display = 'block';
  };

  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Close');
  btn.textContent = '✕';
  Object.assign(btn.style, {
    position: 'fixed',
    top: 'max(14px, env(safe-area-inset-top))',
    right: 'max(14px, env(safe-area-inset-right))',
    width: '40px',
    height: '40px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '10px',
    border: '1px solid var(--line)',
    background: 'var(--bg-soft)',
    color: 'var(--text)',
    font: 'inherit',
    fontSize: '1.05rem',
    lineHeight: '1',
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  });
  btn.addEventListener('click', close);
  overlay.appendChild(btn);
}
