import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { GAME_ORDER, gameName } from '../assets/games.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const games = readdirSync(root).filter(name => existsSync(resolve(root, name, 'src/main.ts')));
const artifacts = process.env.ARCADE_SCREENSHOTS;
if (artifacts) mkdirSync(artifacts, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep) && file !== root) { response.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html' });
    response.end(await readFile(resolve(root, '404.html')));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch();
  for (const width of [1280, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await context.route('https://**', route => route.abort());
    const classic = width === 390;
    await context.addInitScript(classic => {
      try { localStorage.setItem('arcade.theme', classic ? 'classic' : 'refined'); } catch {}
    }, classic);
    for (const localFile of [false, true]) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const url = localFile ? pathToFileURL(resolve(root, '404.html')).href : `${base}/missing/nested/page`;
      const response = await page.goto(url, { waitUntil: 'load' });
      if (!localFile) assert.equal(response.status(), 404);
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `404: overflow at ${width}`);
      assert.equal(await page.locator('body').evaluate(element => getComputedStyle(element).color), classic ? 'rgb(238, 241, 247)' : 'rgb(242, 244, 249)', '404: stylesheet loaded');
      assert.equal(await page.locator('.nf-message').evaluate(element => getComputedStyle(element).animationName), 'none', '404: reduced motion');
      assert.deepEqual(await page.locator('.nf-game span').allTextContents(), GAME_ORDER.slice(0, 4).map(gameName));
      assert.equal(await page.locator('.nf-cta').evaluate(element => element.href), localFile ? 'https://games.vanshul.com/' : `${base}/`);
      const heading = await page.locator('h1').boundingBox();
      const description = await page.locator('.nf-description').boundingBox();
      const button = await page.locator('.nf-cta').boundingBox();
      const gamesHeading = await page.locator('#games-title').boundingBox();
      assert(heading.y + heading.height <= description.y && description.y + description.height <= button.y && button.y + button.height <= gamesHeading.y, '404: content must not overlap');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.nf-cta').evaluate(element => element === document.activeElement && getComputedStyle(element).outlineStyle === 'solid'), true, '404: keyboard recovery action');
      if (artifacts) await page.screenshot({ path: resolve(artifacts, `404-${width}-${localFile ? 'file' : 'http'}.png`), fullPage: true });
      assert.deepEqual(errors, [], '404: runtime errors');
      if (!localFile) {
        await page.locator('.nf-cta').click();
        await page.waitForURL(`${base}/`);
        assert.equal(await page.locator('.grid a.card').count(), 10);
      }
      console.log(`PASS 404 ${width}px ${localFile ? 'file' : 'HTTP'}: art, theme, focus, layout, recovery links`);
      await page.close();
    }
    await context.close();
  }
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    await context.route('https://esm.sh/**', route => route.fulfill({ contentType: 'text/javascript', body: 'export function createClient(){throw new Error("Cloud intentionally unavailable in offline browser test")}' }));
    await context.route('https://*.supabase.co/**', route => route.fulfill({ status: 204 }));
    const hub = await context.newPage();
    await hub.addInitScript(() => { Math.random = () => 0; });
    await hub.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await hub.locator('.grid a.card').count(), 10);
    assert.deepEqual(await hub.locator('.grid a.card').evaluateAll(cards => cards.map(card => card.dataset.game)), GAME_ORDER.slice(0, 10));
    assert.equal(await hub.locator('input[type="search"], [role="search"]').count(), 0);
    await hub.locator('#randomBtn').click();
    await hub.waitForURL(`${base}/hue-hunt/`);
    await hub.goBack({ waitUntil: 'networkidle' });
    assert.equal(await hub.locator('.grid a.card:visible').count(), 10);
    assert.deepEqual(await hub.locator('.grid a.card:visible').evaluateAll(cards => cards.map(card => card.dataset.game)), GAME_ORDER.slice(0, 10));
    assert.equal(await hub.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `hub: overflow at ${width}`);
    for (const image of await hub.locator('.card-art img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(image => image.decode());
    }
    assert.equal(await hub.evaluate(() => [...document.images].some(image => !image.complete || !image.naturalWidth)), false, 'hub: broken art');
    if (artifacts) await hub.screenshot({ path: resolve(artifacts, `hub-${width}.png`), fullPage: true });
    await hub.locator('a[href="/privacy/"]').click();
    assert.equal(await hub.locator('#analytics-enabled').count(), 1);
    console.log(`PASS hub ${width}px: no search, fixed order, random, art, layout, privacy navigation`);
    await hub.close();
    for (const game of games) {
      const page = await context.newPage();
      if (game === '2048') await page.addInitScript(() => { Math.random = () => 0.5; });
      if (game === 'sprint') await page.addInitScript(() => {
        let seed = 42;
        Math.random = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      await page.goto(`${base}/${game}/`, { waitUntil: 'networkidle' });
      assert((await page.locator('#app').innerText()).trim().length > 20, `${game}: empty application`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${game}: horizontal overflow at ${width}`);
      assert.equal(await page.evaluate(() => [...document.images].some(image => !image.complete || !image.naturalWidth)), false, `${game}: broken image`);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('canvas')].some(canvas => {
        if (!canvas.width || !canvas.height) return false;
        const context = canvas.getContext('2d');
        return context && !context.getImageData(0, 0, canvas.width, canvas.height).data.some((value, index) => index % 4 === 3 && value > 0);
      })), false, `${game}: blank canvas`);
      await page.locator('.about summary').click();
      assert(await page.locator('.about details').getAttribute('open') !== null);
      if (game === '2048') {
        const before = await page.locator('#board').innerHTML();
        for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) await page.keyboard.press(key, { delay: 200 });
        assert.notEqual(await page.locator('#board').innerHTML(), before);
        await page.locator('#restart').click();
        assert.equal(await page.locator('.tile').count(), 2);
        const touch = await context.newCDPSession(page);
        await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
        const board = await page.locator('#board').boundingBox();
        const area = await page.locator('#swipe-area').boundingBox();
        assert(Math.abs(area.x) < 1 && Math.abs(area.width - width) < 1, '2048: swipe area spans viewport');
        assert.equal(await page.locator('#swipe-area').evaluate(element => getComputedStyle(element).touchAction), 'pinch-zoom');
        for (const selector of ['.topbar', '.about']) {
          assert.equal(await page.locator(selector).evaluate(element => getComputedStyle(element).touchAction), 'auto');
        }
        const starts = [
          { x: board.x / 2, y: board.y + board.height / 2 },
          { x: (board.x + board.width + width) / 2, y: board.y + board.height / 2 },
          { x: width / 2, y: board.y + board.height + 60 },
        ];
        for (const start of starts) {
          assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, start), 'swipe-area');
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, y: start.y + 60 }] });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForFunction(() => document.querySelectorAll('.tile').length === 3);
          await page.locator('#restart').click();
        }
        await touch.detach();
        console.log(`PASS 2048 ${width}px: real touch swipes beside and below the board`);
      }
      if (game === 'sprint') {
        await page.locator('#mute').click();
        const typing = await page.evaluate(() => {
          const field = document.querySelector('#field');
          const stream = document.querySelector('#stream');
          const enter = value => {
            field.value = value;
            field.dispatchEvent(new Event('input', { bubbles: true }));
          };
          for (let index = 0; index < 40; index++) {
            enter(stream.querySelector('.current').textContent + ' ');
          }
          const current = stream.querySelector('.current');
          const target = current.textContent;
          const observer = new MutationObserver(() => {});
          observer.observe(stream, { childList: true, subtree: true });
          const durations = [];
          for (let index = 0; index < 200; index++) {
            const start = performance.now();
            enter(target.slice(0, index % 2 + 1));
            durations.push(performance.now() - start);
          }
          const records = observer.takeRecords();
          observer.disconnect();
          durations.sort((first, second) => first - second);
          const active = stream.querySelector('.current');
          const bounds = active.getBoundingClientRect();
          const viewport = stream.getBoundingClientRect();
          return {
            inputs: durations.length,
            streamReplacements: records.filter(record => record.target === stream).length,
            nodesAdded: records.reduce((total, record) => total + record.addedNodes.length, 0),
            medianMs: durations[100],
            p95Ms: durations[190],
            currentPreserved: current === active,
            currentVisible: bounds.top >= viewport.top && bounds.bottom <= viewport.bottom,
          };
        });
        console.log(`Sprint typing ${width}px: ${JSON.stringify(typing)}`);
        assert.equal(typing.streamReplacements, 0, 'Sprint: character input must not rebuild the stream');
        assert(typing.currentPreserved, 'Sprint: current word node stays mounted');
        assert(typing.currentVisible, 'Sprint: current word remains visible after scrolling');
        await page.locator('#restart').click();
        assert.equal(await page.locator('.w.done').count(), 0);
      }
      const image = await page.screenshot(artifacts ? { path: resolve(artifacts, `${game}-${width}.png`), fullPage: true } : { fullPage: true });
      const pixels = await sharp(image).stats();
      assert(pixels.channels.some(channel => channel.stdev > 1), `${game}: blank screenshot`);
      assert.deepEqual(errors, [], `${game} ${width}: runtime errors`);
      console.log(`PASS ${game} ${width}px: loaded, assets, layout, about, pixels`);
      await page.close();
    }
    const privacy = await context.newPage();
    let beacons = 0;
    privacy.on('request', request => { if (request.url().includes('/arcade_events')) beacons++; });
    await privacy.goto(`${base}/privacy/`, { waitUntil: 'networkidle' });
    assert.equal(await privacy.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `privacy: overflow at ${width}`);
    if (artifacts) await privacy.screenshot({ path: resolve(artifacts, `privacy-${width}.png`), fullPage: true });
    await privacy.locator('#analytics-enabled').uncheck();
    await privacy.reload({ waitUntil: 'networkidle' });
    assert.equal(await privacy.locator('#analytics-enabled').isChecked(), false);
    await privacy.goto(`${base}/wordle/`, { waitUntil: 'networkidle' });
    assert.equal(beacons, 0, 'Opt-out must prevent analytics network traffic');
    assert.equal(await privacy.evaluate(() => localStorage.getItem('arcade.vid')), null);
    console.log(`PASS privacy ${width}px: persistent opt-out, no beacons`);
    await context.close();
  }
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    await context.route('https://esm.sh/**', route => route.fulfill({
      contentType: 'text/javascript',
      body: `export function createClient() { return { auth: {
        getSession: async () => ({ data: { session: location.pathname === '/stats/' ? { user: { id: 'browser-owner' } } : null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => {
          globalThis.oauthAttempts = (globalThis.oauthAttempts || 0) + 1;
          return { error: new Error('Test-only auth outage') };
        }
      }, rpc: async (name, args) => ({ data: name === 'arcade_leaderboard'
        ? Object.fromEntries([...args.p_games].reverse().map(slug => [slug, { top: [
            { rank: 1, best: 20, display_name: 'First' },
            { rank: 2, best: 10, display_name: 'Second' }
          ] }]))
        : { total_visits: 10, unique_visitors: 2, total_plays: 1000, visits_today: 1, plays_today: 2,
            per_game: [{ game: 'flashmath', plays: args.p_days ? 1 : 999 }, { game: 'hue-hunt', plays: args.p_days ? 999 : 1 }] }
      }) }; }`,
    }));
    await context.addInitScript(() => {
      Math.random = () => 0;
      localStorage.setItem('arcade.analytics.disabled', '1');
      localStorage.setItem('word.v1', JSON.stringify({ practiceBest: 5 }));
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('#lbBtn').click();
    await page.locator('.lb-game').first().waitFor();
    assert.deepEqual(await page.locator('.lb-game').evaluateAll(sections => sections.map(section => section.dataset.game)), GAME_ORDER.slice(0, 10));
    await page.locator('.lb-game summary').first().click();
    assert.deepEqual(await page.locator('.lb-game').first().locator('.lb-who').allTextContents(), ['First', 'Second']);
    if (artifacts) await page.screenshot({ path: resolve(artifacts, `leaderboard-${width}.png`), fullPage: true });
    await page.goto(`${base}/stats/`, { waitUntil: 'networkidle' });
    await page.locator('.row').first().waitFor();
    assert.deepEqual(await page.locator('.row .k b').allTextContents(), GAME_ORDER.map(gameName));
    await page.locator('.chip[data-days="1"]').click();
    await page.waitForFunction(() => document.querySelector('.chip.on')?.getAttribute('data-days') === '1');
    assert.deepEqual(await page.locator('.row .k b').allTextContents(), GAME_ORDER.map(gameName));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `stats: overflow at ${width}`);
    const updated = await page.locator('.upd').boundingBox();
    const signout = await page.locator('#out').boundingBox();
    assert.ok(signout.x - updated.x - updated.width >= 12, `stats: timestamp/sign-out spacing at ${width}`);
    assert.ok(Math.abs(updated.y + updated.height / 2 - signout.y - signout.height / 2) <= 1, `stats: header alignment at ${width}`);
    if (artifacts) await page.screenshot({ path: resolve(artifacts, `stats-${width}.png`), fullPage: true });
    console.log(`PASS fixed order ${width}px: leaderboard sections, player ranks, stats range changes`);
    await page.goto(`${base}/word/`, { waitUntil: 'networkidle' });
    await page.locator('[data-tab="practice"]').click();
    for (let round = 0; round < 3; round++) {
      await page.locator('#options .option').first().click();
      if (round < 2) await page.locator('#p-next').click();
    }
    const signIn = page.locator('#overlay.show .cloud-signin');
    await signIn.waitFor({ state: 'visible' });
    assert.equal(await signIn.getAttribute('onclick'), null);
    for (let attempt = 1; attempt <= 2; attempt++) {
      await signIn.click();
      await page.waitForFunction(expected => globalThis.oauthAttempts === expected &&
        document.querySelector('.cloud-signin')?.textContent.includes('Sign-in failed'), attempt);
      assert.equal(await signIn.isEnabled(), true);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (artifacts) await page.screenshot({ path: resolve(artifacts, `signin-${width}.png`), fullPage: true });
    console.log(`PASS sign-in ${width}px: local event handler, visible failure, retry, no redirect`);
    await context.close();
  }
  const offlineContext = await browser.newContext();
  await offlineContext.addInitScript(() => localStorage.setItem('arcade.analytics.disabled', '1'));
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(`${base}/2048/`, { waitUntil: 'networkidle' });
  await offlinePage.evaluate(async () => { await navigator.serviceWorker.ready; });
  await offlinePage.reload({ waitUntil: 'networkidle' });
  await offlinePage.waitForFunction(async () => {
    const urls = (await (await caches.open('arcade-v3')).keys()).map(request => request.url);
    return urls.some(url => url.endsWith('/2048/')) && urls.some(url => /\/2048\/assets\/.*\.js$/.test(url));
  });
  const privateRequests = await offlinePage.evaluate(async () => {
    const requests = [
      new Request(`${location.origin}/2048/?code=test-only`),
      new Request(`${location.origin}/2048/?access_token=test-only`),
      new Request(`${location.origin}/2048/?privacy-check=auth`, { headers: { Authorization: 'Bearer test-only' } }),
      new Request(`${location.origin}/2048/?privacy-check=no-store`, { cache: 'no-store' }),
    ];
    const results = [];
    for (const request of requests) {
      const response = await fetch(request);
      await response.text();
      results.push({ status: response.status, cached: !!(await caches.match(request)) });
    }
    return results;
  });
  assert.deepEqual(privateRequests, Array.from({ length: 4 }, () => ({ status: 200, cached: false })));
  console.log('PASS service worker: callback and private requests bypass offline storage');
  const updatePage = await offlineContext.newPage();
  await updatePage.goto(`${base}/wordle/`, { waitUntil: 'networkidle' });
  await updatePage.keyboard.type('cra');
  const guessBeforeUpdate = await updatePage.locator('#board').innerText();
  assert(guessBeforeUpdate.includes('C'), 'Wordle: typed guess before update');
  await updatePage.evaluate(async () => {
    globalThis.updateMarker = true;
    const controlled = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    await navigator.serviceWorker.register('/sw.js?test-update=1', { updateViaCache: 'none' });
    await controlled;
  });
  assert.equal(await updatePage.evaluate(() => globalThis.updateMarker), true, 'Worker installation must not reload the page');
  assert.equal(await updatePage.locator('#board').innerText(), guessBeforeUpdate, 'Wordle guess survives worker installation');
  console.log('PASS service worker: installing an update preserves the active Wordle guess');
  await updatePage.close();
  await offlineContext.setOffline(true);
  await offlinePage.reload({ waitUntil: 'networkidle' });
  assert.equal(await offlinePage.locator('.tile').count(), 2);
  const offlineBoard = await offlinePage.locator('#board').innerHTML();
  for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) await offlinePage.keyboard.press(key, { delay: 200 });
  assert.notEqual(await offlinePage.locator('#board').innerHTML(), offlineBoard);
  console.log('PASS service worker: previously visited game loads and plays offline');
  await offlineContext.close();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}