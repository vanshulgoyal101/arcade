// Tiny Arcade — shared minimal line-style icon set (inline SVG strings).
// No external assets, fonts or icon-library dependency: every topbar/status
// glyph that used to be an emoji character lives here, once, so every game
// (and the hub) renders the same mark. Pure strings — drop them straight into
// a template literal's innerHTML.

function iconBtn(inner: string, size = 18, color?: string): string {
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
    `stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" ` +
    `style="display:inline-block;vertical-align:-4px${color ? `;color:${color}` : ''}" aria-hidden="true">${inner}</svg>`
  );
}

function glyph(inner: string, size = 20, color?: string): string {
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" ` +
    `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ` +
    `style="display:inline-block;vertical-align:-4px${color ? `;color:${color}` : ''}" aria-hidden="true">${inner}</svg>`
  );
}

// ---- topbar controls ----
export const ICON_MUTE_ON = iconBtn(
  '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/>' +
    '<path d="M16.3 8.7a5 5 0 0 1 0 6.6M19 6a8.5 8.5 0 0 1 0 12"/>'
);
export const ICON_MUTE_OFF = iconBtn(
  '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"/><path d="M16 9l5 6M21 9l-5 6"/>'
);
export const ICON_CLOSE = iconBtn('<path d="M6 6l12 12M18 6L6 18"/>', 16);
export const ICON_STATS = iconBtn('<path d="M5 19V10M12 19V5M19 19v-7"/>');
export const ICON_TROPHY = glyph(
  '<path d="M7 4h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V4z"/>' +
    '<path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M12 13v3.2M9 19.5h6"/>',
  16, '#facc15'
);

/** Toggle-ready mute glyph for a `renderMute()`-style handler. */
export function muteIcon(muted: boolean): string {
  return muted ? ICON_MUTE_OFF : ICON_MUTE_ON;
}

// ---- lives (hearts) ----
const HEART_D =
  'M12 20.3S4.8 15.6 2.4 11C1 8.3 2.3 5.3 5.2 4.6c2-.5 4.1.4 6.3 2.9 2.2-2.5 4.3-3.4 6.3-2.9 2.9.7 4.2 3.7 2.8 6.4-2.4 4.6-9.8 9.3-9.8 9.3z';
const HEART_FULL = `<path d="${HEART_D}" fill="#fb7185" stroke="none"/>`;
const HEART_EMPTY = `<path d="${HEART_D}"/>`;
function heart(full: boolean): string {
  return (
    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" ` +
    `stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-3px" aria-hidden="true">` +
    `${full ? HEART_FULL : HEART_EMPTY}</svg>`
  );
}

/** `total` heart icons, the leading `lives` filled and the rest outlined. */
export function livesHtml(lives: number, total = 3): string {
  const filled = Math.max(0, Math.min(total, lives));
  let out = '';
  for (let i = 0; i < total; i++) out += heart(i < filled);
  return `<span role="img" aria-label="${filled} of ${total} lives">${out}</span>`;
}

// ---- per-game title glyph (topbar `<h1 class="title">`) ----
export const ICON_HUE_HUNT = glyph(
  '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>', 20, '#f472b6'
);
export const ICON_ECHO = glyph(
  '<path d="M8.5 8.8a4.6 4.6 0 0 0 0 6.4M15.5 8.8a4.6 4.6 0 0 1 0 6.4M5.3 5.6a9 9 0 0 0 0 12.8M18.7 5.6a9 9 0 0 1 0 12.8"/>' +
    '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>', 20, '#22d3ee'
);
export const ICON_CHROMATIC = glyph(
  '<path d="M12 3.2c3.4 4 6.3 7.5 6.3 10.8a6.3 6.3 0 0 1-12.6 0c0-3.3 2.9-6.8 6.3-10.8z"/>', 20, '#facc15'
);
export const ICON_FLASH = glyph('<path d="M13 2 4.5 13.5h5.7L9 22l9.5-12.5h-5.7z" fill="currentColor" stroke="none"/>', 20, '#fbbf24');
export const ICON_FLASHMATH = glyph(
  '<rect x="4" y="3" width="16" height="18" rx="2.4"/><path d="M7.3 8h9.4M7.3 12h9.4M7.3 16h5.6"/>', 20, '#a78bfa'
);
export const ICON_SPRINT = glyph(
  '<rect x="3" y="6" width="18" height="12" rx="2.2"/><path d="M6.6 10h.01M10 10h.01M13.4 10h.01M16.8 10h.01M6.6 14h10.6"/>', 20, '#fb7185'
);
export const ICON_DIGIT_SPAN = glyph('<path d="M9 3.5 6.4 20.5M17.6 3.5 15 20.5M4 9h16M3 15h16"/>', 20, '#60a5fa');
export const ICON_INTERVAL = glyph(
  '<path d="M9 18V5.3L19 3v13"/><circle cx="6.8" cy="18" r="2.4" fill="currentColor" stroke="none"/>' +
    '<circle cx="16.8" cy="16" r="2.4" fill="currentColor" stroke="none"/>', 20, '#f9a8d4'
);
export const ICON_WHERE = glyph(
  '<path d="M12 21S5.5 15 5.5 10A6.5 6.5 0 0 1 12 3.5 6.5 6.5 0 0 1 18.5 10c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>', 20, '#34d399'
);
export const ICON_WORD = glyph(
  '<path d="M12 5.6c-2-1.6-5-2.1-8-1.6v14c3-.5 6 0 8 1.6 2-1.6 5-2.1 8-1.6V4c-3-.5-6 0-8 1.6z"/><path d="M12 5.6v14"/>', 20, '#f9a8d4'
);
export const ICON_WORDLE = glyph(
  '<rect x="3" y="9" width="5.4" height="5.4" rx="1"/><rect x="9.3" y="9" width="5.4" height="5.4" rx="1" fill="currentColor" stroke="none"/><rect x="15.6" y="9" width="5.4" height="5.4" rx="1"/>', 20, '#a3e635'
);
