// Single source for the no-build side of the arcade (the hub and the stats
// page): each game's display name and line-glyph. Both are plain ES modules and
// can't import shared/icons.ts, which carries the same marks for the TS games —
// tests/icon-parity.test.ts fails if the two ever drift apart.
//
// `color:var(--accent)` lets a glyph take its game's accent wherever the page
// scopes one (the hub does, per .card[data-game] / .lb-game[data-game]).

export const GAME_ART = {
  'hue-hunt': {
    name: 'Hue Hunt',
    path: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  },
  where: {
    name: 'Where',
    path: '<path d="M12 21S5.5 15 5.5 10A6.5 6.5 0 0 1 12 3.5 6.5 6.5 0 0 1 18.5 10c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  },
  echo: {
    name: 'Echo',
    path: '<path d="M8.5 8.8a4.6 4.6 0 0 0 0 6.4M15.5 8.8a4.6 4.6 0 0 1 0 6.4M5.3 5.6a9 9 0 0 0 0 12.8M18.7 5.6a9 9 0 0 1 0 12.8"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  },
  chromatic: {
    name: 'Chromatic',
    path: '<path d="M12 3.2c3.4 4 6.3 7.5 6.3 10.8a6.3 6.3 0 0 1-12.6 0c0-3.3 2.9-6.8 6.3-10.8z"/>',
  },
  flash: {
    name: 'Flash',
    path: '<path d="M13 2 4.5 13.5h5.7L9 22l9.5-12.5h-5.7z"/>',
    filled: true,
  },
  flashmath: {
    name: 'Flashmath',
    path: '<rect x="4" y="3" width="16" height="18" rx="2.4"/><path d="M7.3 8h9.4M7.3 12h9.4M7.3 16h5.6"/>',
  },
  sprint: {
    name: 'Sprint',
    path: '<rect x="3" y="6" width="18" height="12" rx="2.2"/><path d="M6.6 10h.01M10 10h.01M13.4 10h.01M16.8 10h.01M6.6 14h10.6"/>',
  },
  'digit-span': {
    name: 'Digit Span',
    path: '<path d="M9 3.5 6.4 20.5M17.6 3.5 15 20.5M4 9h16M3 15h16"/>',
  },
  interval: {
    name: 'Interval',
    path: '<path d="M9 18V5.3L19 3v13"/><circle cx="6.8" cy="18" r="2.4" fill="currentColor" stroke="none"/><circle cx="16.8" cy="16" r="2.4" fill="currentColor" stroke="none"/>',
  },
  word: {
    name: 'Word of the Day',
    path: '<path d="M12 5.6c-2-1.6-5-2.1-8-1.6v14c3-.5 6 0 8 1.6 2-1.6 5-2.1 8-1.6V4c-3-.5-6 0-8 1.6z"/><path d="M12 5.6v14"/>',
  },
  wordle: {
    name: 'Wordle',
    path: '<rect x="3" y="9" width="5.4" height="5.4" rx="1"/><rect x="9.3" y="9" width="5.4" height="5.4" rx="1" fill="currentColor" stroke="none"/><rect x="15.6" y="9" width="5.4" height="5.4" rx="1"/>',
  },
  // Not a game: the analytics beacon reports hub visits under this slug.
  hub: {
    name: 'Hub',
    path: '<path d="M6 10a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-3z"/><path d="M9 11v3M7.5 12.5h3M16 12h.01M18 14h.01"/>',
  },
};

/** Inline SVG glyph for a game, or '' for an unknown slug. */
export function gameIcon(slug, size = 18) {
  const art = GAME_ART[slug];
  if (!art) return '';
  const paint = art.filled
    ? 'fill="currentColor" stroke="none"'
    : 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" ${paint} ` +
    `style="display:inline-block;vertical-align:-3px;color:var(--accent);flex:none" aria-hidden="true">${art.path}</svg>`
  );
}

/** Display name for a slug, falling back to the raw slug. */
export const gameName = (slug) => GAME_ART[slug]?.name ?? slug ?? '—';
