// Makes a full-screen `.overlay` (with a `.modal` child) dismissable the way users
// expect: click/tap the backdrop, press Escape, or use an injected close button.
// The overlay is only closed when the pointer lands on the backdrop itself, never
// on the modal. The close button is appended once and inherits the overlay's own
// show/hide (opacity + pointer-events), so it is only active while the modal is open.

export function makeDismissable(overlay: HTMLElement, onClose?: () => void): void {
  const close = (): void => {
    if (!overlay.classList.contains('show')) return;
    overlay.classList.remove('show');
    onClose?.();
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
