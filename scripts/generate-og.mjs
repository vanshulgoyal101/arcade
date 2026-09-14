#!/usr/bin/env node
/**
 * Generates 1200x630 PNG Open Graph cards for the hub + every game into
 * assets/og/. PNG (not SVG) so Facebook/LinkedIn/X render the previews.
 * Text-only by design — librsvg used by sharp does not rasterise emoji.
 *
 * Run: npm run generate:og   (needs the dev dependency `sharp`)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'og');
mkdirSync(outDir, { recursive: true });

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const cards = [
  { slug: 'hub',        accent: '#7cf0c8', title: 'Tiny Arcade', subtitle: 'Ten free browser games — no download', eyebrow: '' },
  { slug: 'hue-hunt',   accent: '#ff6b6b', title: 'Hue Hunt',    subtitle: 'Spot the tile that’s a different shade' },
  { slug: 'echo',       accent: '#4ecdc4', title: 'Echo',        subtitle: 'Watch the pattern, repeat it back' },
  { slug: 'chromatic',  accent: '#ffd93d', title: 'Chromatic',   subtitle: 'Match the colour with RGB sliders' },
  { slug: 'flash',      accent: '#9b8cff', title: 'Flash',       subtitle: 'Speed-reading trainer' },
  { slug: 'flashmath',  accent: '#ff9f43', title: 'Flashmath',   subtitle: 'Mental arithmetic against the clock' },
  { slug: 'sprint',     accent: '#5fd1f9', title: 'Sprint',      subtitle: 'How fast can you type?' },
  { slug: 'digit-span', accent: '#26de81', title: 'Digit Span',  subtitle: 'How many digits can you hold?' },
  { slug: 'interval',   accent: '#c56cf0', title: 'Interval',    subtitle: 'Name the interval by ear' },
  { slug: 'where',      accent: '#54a0ff', title: 'Where',       subtitle: 'Guess the country by flag & capital' },
  { slug: 'word',       accent: '#f78fb3', title: 'Word of the Day', subtitle: 'Grow your vocabulary, one word a day' },
  { slug: 'wordle',     accent: '#6aaa64', title: 'Wordle',      subtitle: 'Guess the five-letter word — unlimited' },
  { slug: '2048',       accent: '#f0a04b', title: '2048',        subtitle: 'Slide, merge, reach the 2048 tile' },
];

const svgFor = ({ accent, title, subtitle, eyebrow = 'TINY ARCADE' }) => `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="-10%" r="95%">
      <stop offset="0%" stop-color="#1d2233"/>
      <stop offset="100%" stop-color="#12141c"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="14" fill="${accent}"/>
  <text x="600" y="150" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="8" fill="#9aa3b8">${esc(eyebrow)}</text>
  <text x="600" y="358" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="116" font-weight="800" fill="#eef1f7">${esc(title)}</text>
  <text x="600" y="438" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="${accent}">${esc(subtitle)}</text>
</svg>`;

for (const c of cards) {
  const png = await sharp(Buffer.from(svgFor(c))).png().toBuffer();
  writeFileSync(join(outDir, `${c.slug}.png`), png);
}
console.log(`Wrote ${cards.length} OG PNGs to assets/og/.`);
