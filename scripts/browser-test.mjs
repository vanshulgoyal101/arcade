import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

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
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch();
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
    await context.route('https://esm.sh/**', route => route.fulfill({ contentType: 'text/javascript', body: 'export function createClient(){throw new Error("Cloud intentionally unavailable in offline browser test")}' }));
    await context.route('https://*.supabase.co/**', route => route.fulfill({ status: 204 }));
    const hub = await context.newPage();
    await hub.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await hub.locator('.grid a.card').count(), 10);
    assert.equal(await hub.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `hub: overflow at ${width}`);
    for (const image of await hub.locator('.card-art img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(image => image.decode());
    }
    assert.equal(await hub.evaluate(() => [...document.images].some(image => !image.complete || !image.naturalWidth)), false, 'hub: broken art');
    await hub.locator('a[href="/privacy/"]').click();
    assert.equal(await hub.locator('#analytics-enabled').count(), 1);
    console.log(`PASS hub ${width}px: catalog, art, layout, privacy navigation`);
    await hub.close();
    for (const game of games) {
      const page = await context.newPage();
      if (game === '2048') await page.addInitScript(() => { Math.random = () => 0.5; });
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
        for (const position of [board.x / 2, (board.x + board.width + width) / 2]) {
          const start = { x: position, y: board.y + board.height / 2 };
          assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, start), 'swipe-area');
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, y: start.y + 60 }] });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForFunction(() => document.querySelectorAll('.tile').length === 3);
          await page.locator('#restart').click();
        }
        await touch.detach();
        console.log(`PASS 2048 ${width}px: real touch swipes on both sides`);
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
  const offlineContext = await browser.newContext();
  await offlineContext.addInitScript(() => localStorage.setItem('arcade.analytics.disabled', '1'));
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(`${base}/2048/`, { waitUntil: 'networkidle' });
  await offlinePage.evaluate(async () => { await navigator.serviceWorker.ready; });
  await offlinePage.reload({ waitUntil: 'networkidle' });
  await offlinePage.waitForFunction(async () => {
    const urls = (await (await caches.open('arcade-v2')).keys()).map(request => request.url);
    return urls.some(url => url.endsWith('/2048/')) && urls.some(url => /\/2048\/assets\/.*\.js$/.test(url));
  });
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