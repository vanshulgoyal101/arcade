#!/usr/bin/env node
// clean-urls.mjs — promotes each game's built app from <game>/dist/ up to the
// clean served path <game>/ so pages live at https://games.vanshul.com/<game>/
// (not /<game>/dist/). Run AFTER `vite build` for each game.
//
//   node scripts/clean-urls.mjs                 # all games
//   node scripts/clean-urls.mjs hue-hunt echo   # a subset
//
// For each game it:
//   1. moves dist/assets  -> <game>/assets   (hashed bundles, served clean)
//   2. writes the built HTML -> <game>/index.html
//   3. replaces <game>/dist/ with a tiny redirect stub -> /<game>/ so any
//      already-indexed /<game>/dist/ URL consolidates to the clean one.
//
// Vite is configured with rollupOptions.input = 'template.html', so the built
// document lands at dist/template.html (template.html stays the dev entry).

import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALL = ['chromatic', 'digit-span', 'echo', 'flash', 'flashmath', 'hue-hunt', 'interval', 'sprint', 'where', 'word', 'wordle'];
const games = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

const stub = (slug) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="https://games.vanshul.com/${slug}/" />
  <meta http-equiv="refresh" content="0; url=/${slug}/" />
  <title>Redirecting…</title>
  <script>location.replace('/${slug}/' + location.search + location.hash)</script>
</head>
<body>Moved to <a href="/${slug}/">/${slug}/</a>.</body>
</html>
`;

for (const g of games) {
  const gameDir = join(root, g);
  const dist = join(gameDir, 'dist');
  const builtHtml = existsSync(join(dist, 'template.html')) ? join(dist, 'template.html') : join(dist, 'index.html');
  if (!existsSync(builtHtml)) {
    console.error(`✗ ${g}: no built HTML in dist/ (run vite build first)`);
    process.exit(1);
  }
  // 1. promote hashed assets
  rmSync(join(gameDir, 'assets'), { recursive: true, force: true });
  cpSync(join(dist, 'assets'), join(gameDir, 'assets'), { recursive: true });
  // 2. promote the built document
  writeFileSync(join(gameDir, 'index.html'), readFileSync(builtHtml, 'utf8'));
  // 3. leave a redirect stub where the old /dist/ URL used to resolve
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'index.html'), stub(g));
  console.log(`✓ ${g}: promoted to /${g}/ (+ /dist/ redirect stub)`);
}
