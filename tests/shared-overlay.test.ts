import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeDismissable } from '../shared/overlay';

function setup(withReplay = false, onDismiss?: () => boolean | void) {
  document.body.innerHTML = '<div class="overlay" id="ov"><div class="modal">content</div></div>';
  const overlay = document.querySelector<HTMLElement>('#ov')!;
  const onReplay = vi.fn();
  makeDismissable(overlay, withReplay ? onReplay : undefined, onDismiss);
  overlay.classList.add('show');
  return { overlay, onReplay };
}
const pill = () =>
  [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Play again')) as
    | HTMLButtonElement
    | undefined;
const escape = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shared/overlay · makeDismissable', () => {
  it('Escape closes the overlay and reveals the replay pill', () => {
    const { overlay } = setup(true);
    escape();
    expect(overlay.classList.contains('show')).toBe(false);
    expect(pill()!.style.display).toBe('block');
  });

  it('a backdrop pointerdown closes the overlay', () => {
    const { overlay } = setup();
    overlay.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(overlay.classList.contains('show')).toBe(false);
  });

  it('a pointerdown inside the modal does not close the overlay', () => {
    const { overlay } = setup();
    overlay.querySelector('.modal')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(overlay.classList.contains('show')).toBe(true);
  });

  it('the replay pill fires onReplay once, then hides itself', () => {
    const { onReplay } = setup(true);
    escape();
    const p = pill()!;
    p.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(p.style.display).toBe('none');
  });

  it('injects a ✕ button on the modal on show, which closes', async () => {
    const { overlay } = setup();
    await new Promise((r) => setTimeout(r, 10)); // let the MutationObserver attach it
    const x = overlay.querySelector<HTMLButtonElement>('.modal button[aria-label="Close"]');
    expect(x).not.toBeNull();
    x!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(overlay.classList.contains('show')).toBe(false);
  });

  it('Escape on an already-closed overlay is a harmless no-op', () => {
    const { overlay, onReplay } = setup(true);
    overlay.classList.remove('show'); // already closed
    escape();
    expect(pill()!.style.display).toBe('none'); // pill not revealed by a no-op close
    expect(onReplay).not.toHaveBeenCalled();
  });

  it('creates no replay pill without an onReplay callback', () => {
    setup(false);
    expect(pill()).toBeUndefined();
  });

  it('lets a modal handle dismissal without offering a destructive replay', () => {
    const onDismiss = vi.fn(() => false);
    const { overlay } = setup(true, onDismiss);

    escape();

    expect(overlay.classList.contains('show')).toBe(false);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(pill()!.style.display).toBe('none');
  });
});
