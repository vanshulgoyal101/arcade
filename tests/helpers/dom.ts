// Shared harness for driving a game's real `main.ts` in jsdom. Each game's
// main.ts self-mounts into `#app` on import, so a test just needs a fresh DOM +
// localStorage, then imports the module and interacts through the DOM — exactly
// what a player's browser does. No production test hooks required.
import { vi, beforeEach, afterEach } from 'vitest';

// Freeze rAF so the games' timer loops don't advance on their own; interaction
// tests stay deterministic (the pure timer logic is covered by the game.ts suite).
function freezeRaf(): void {
  let id = 0;
  globalThis.requestAnimationFrame = (() => ++id) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
}

/**
 * Install the standard game-DOM environment for a test file: fake `setTimeout`
 * timers (so a game's transition callbacks — next round, reveal, game-over —
 * only fire when a test advances them, never leaking onto a torn-down DOM
 * between tests) plus a DOM reset. `performance.now`/rAF are left alone (rAF is
 * frozen per-mount). Call once at the top of a `describe`.
 */
export function gameEnv(): void {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });
}

/**
 * Reset the DOM + storage, freeze rAF, then import a game's `main.ts` (which
 * mounts itself). Pass a static `() => import('../<game>/src/main.ts')`. An
 * optional `seed` runs after the storage is cleared but before the import, to
 * pre-populate localStorage (e.g. an already-completed daily).
 */
export async function mountGame(
  importer: () => Promise<unknown>,
  seed?: () => void
): Promise<HTMLElement> {
  document.body.innerHTML = '<div id="app"></div>';
  localStorage.clear();
  seed?.();
  freezeRaf();
  // jsdom's own CSS.escape escapes spaces (`a\ b`), which jsdom's selector
  // parser then rejects inside a quoted attribute value — even though real
  // browsers accept it. Shim a minimal, spec-adjacent escape (only `"`/`\`)
  // that is valid inside `[attr="…"]`, so games that look a button up by name
  // (e.g. Where) work under test without changing production code.
  (globalThis as { CSS?: { escape(s: string): string } }).CSS = {
    escape: (s: string) => String(s).replace(/["\\]/g, '\\$&'),
  };
  // jsdom has no Web Animations API, so a game's decorative `el.animate(...)`
  // throws — inside an async playback chain that surfaces only as a swallowed
  // rejection which silently stalls the game. Stub just enough to keep going.
  if (!Element.prototype.animate) {
    Element.prototype.animate = (() => ({ finished: Promise.resolve(), cancel() {} })) as unknown as typeof Element.prototype.animate;
  }
  vi.resetModules();
  await importer();
  return document.querySelector<HTMLElement>('#app')!;
}

/** Games bind `pointerdown` (touch-ready), not `click`, on play surfaces. */
export function pointerdown(el: Element, x = 10, y = 10): void {
  el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
}

export function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

const bgCounts = (container: Element): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const k of container.children) {
    const bg = (k as HTMLElement).style.background;
    counts.set(bg, (counts.get(bg) ?? 0) + 1);
  }
  return counts;
};

/** The child whose background colour appears exactly once (the odd tile out). */
export function oddChild(container: Element): HTMLElement {
  const counts = bgCounts(container);
  return [...container.children].find(
    (k) => counts.get((k as HTMLElement).style.background) === 1
  ) as HTMLElement;
}

/** A child that shares the majority background (i.e. not the odd one). */
export function plainChild(container: Element): HTMLElement {
  const counts = bgCounts(container);
  return [...container.children].find(
    (k) => (counts.get((k as HTMLElement).style.background) ?? 0) > 1
  ) as HTMLElement;
}

export const text = (el: Element | null): string => (el?.textContent ?? '').trim();
