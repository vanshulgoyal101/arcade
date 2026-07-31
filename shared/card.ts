// Shared "result card" canvas renderer. Each game paints its own relevant
// visual into the central panel; the frame (title, stat, footer) is common so
// every shared image reads as part of the same arcade.

import { cloudProfile } from './cloud';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShareCardOptions {
  /** Game name, e.g. "Hue Hunt". */
  title: string;
  /** Leading emoji, e.g. "🎯". */
  emoji: string;
  /** Big headline number/string, e.g. "1,234". */
  stat: string;
  /** Small caption under the stat, e.g. "Score · level 7". */
  statLabel: string;
  /** One-line hook shown in the footer. */
  tagline: string;
  /** Path shown bottom-right, e.g. "hue-hunt". */
  slug: string;
  /** Paints the game-specific snippet inside the given panel rect. */
  draw: (ctx: CanvasRenderingContext2D, area: Rect) => void;
}

const W = 1080;
const H = 1080;
const PAD = 72;

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Read a theme CSS custom property (e.g. themeVar('--text')). */
export function themeVar(name: string, fallback = '#f2f4f9'): string {
  return cssVar(name, fallback);
}

/** Current accent colour of the running game (respects the theme toggle). */
export function currentAccent(fallback = '#fb7185'): string {
  return cssVar('--accent', fallback);
}

/** Rounded-rectangle path helper (exported so games can reuse it). */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Blend a hex colour with an alpha, e.g. withAlpha('#fb7185', 0.3). */
export function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function renderShareCard(opts: ShareCardOptions): HTMLCanvasElement {
  const accent = currentAccent();
  const bg = cssVar('--bg', '#0c0d12');
  const panel = cssVar('--bg-soft', '#14161d');
  const text = cssVar('--text', '#f2f4f9');
  const muted = cssVar('--muted', '#949cb0');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background + soft accent glow at the top.
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, 820);
  glow.addColorStop(0, withAlpha(accent, 0.22));
  glow.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Header: emoji + title (left), arcade wordmark (right).
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = '64px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.fillText(opts.emoji, PAD, 104);
  ctx.font = '700 60px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(opts.title, PAD + 96, 108);
  ctx.textAlign = 'right';
  ctx.font = '600 26px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText('TINY ARCADE', W - PAD, 104);

  // Signed-in player's identity, so a shared card reads as "theirs". Only emoji
  // avatars are drawn (image URLs would taint the canvas and break the export).
  const prof = cloudProfile();
  if (prof && prof.name) {
    const isEmoji = !!prof.avatar && !/^https?:/i.test(prof.avatar);
    const label = isEmoji ? `${prof.avatar}  ${prof.name}` : prof.name;
    ctx.font = '600 30px system-ui, -apple-system, "Segoe UI", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillStyle = text;
    ctx.fillText(label, W - PAD, 150);
  }

  // Visual panel.
  const panelRect: Rect = { x: PAD, y: 196, w: W - 2 * PAD, h: 560 };
  roundRect(ctx, panelRect.x, panelRect.y, panelRect.w, panelRect.h, 32);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = withAlpha(accent, 0.35);
  ctx.stroke();

  // Game-specific snippet, clipped to a padded inner area.
  const inner: Rect = {
    x: panelRect.x + 40,
    y: panelRect.y + 40,
    w: panelRect.w - 80,
    h: panelRect.h - 80,
  };
  ctx.save();
  roundRect(ctx, inner.x, inner.y, inner.w, inner.h, 20);
  ctx.clip();
  opts.draw(ctx, inner);
  ctx.restore();

  // Stat block.
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = '600 30px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText(opts.statLabel.toUpperCase(), PAD, 826);
  ctx.font = '800 92px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = text;
  ctx.fillText(opts.stat, PAD, 912);

  // Footer: tagline (left) + link (right).
  ctx.font = 'italic 400 30px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText(opts.tagline, PAD, 1004);
  ctx.textAlign = 'right';
  ctx.font = '600 30px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(`games.vanshul.com/${opts.slug}`, W - PAD, 1004);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Word-wrap `text` to lines that fit `maxWidth` with the current ctx font. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
