import assert from 'node:assert/strict';
import { resolve } from 'node:path';

async function finishGame(page, game) {
  const finished = () => page.locator('#overlay').evaluate(element => element.classList.contains('show'));
  if (game === 'hue-hunt' || game === 'flashmath') {
    await page.clock.runFor(61_000);
  } else if (game === 'sprint') {
    await page.locator('#field').fill('a');
    await page.clock.runFor(61_000);
  } else if (game === 'wordle') {
    await page.locator('#board').click({ force: true });
    for (let guess = 0; guess < 6 && !await finished(); guess++) {
      await page.keyboard.type('crane');
      await page.keyboard.press('Enter');
      await page.clock.runFor(3000);
    }
  } else if (game === 'echo') {
    if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
    for (let attempt = 0; attempt < 6 && !await finished(); attempt++) {
      await page.clock.runFor(2000);
      for (const pad of await page.locator('#pads .pad').all()) await pad.click({ force: true });
      await page.clock.runFor(1000);
    }
  } else if (game === 'digit-span') {
    if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
    for (let attempt = 0; attempt < 8 && !await finished(); attempt++) {
      await page.clock.runFor(10_000);
      for (let digit = 0; digit < 10; digit++) await page.keyboard.press('0');
      await page.keyboard.press('Enter');
    }
  } else if (game === 'flash') {
    if (await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
    await page.clock.runFor(120_000);
    for (const option of await page.locator('.question .option:first-child').all()) await option.click();
    await page.locator('#submitBtn').click();
  } else if (game === 'chromatic') {
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.evaluate(() => {
        const color = document.querySelector('#targetCanvas').getContext('2d').getImageData(0, 0, 1, 1).data;
        for (const [index, channel] of ['r', 'g', 'b'].entries()) {
          const slider = document.querySelector(`#s-${channel}`);
          slider.value = color[index] < 128 ? '255' : '0';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.locator('#submit').click();
      await page.clock.runFor(500);
    }
  } else if (game === 'word') {
    if (await page.locator('[data-tab="today"]').evaluate(element => element.classList.contains('active'))) {
      await page.locator('[data-tab="practice"]').click();
    }
    for (let attempt = 0; attempt < 30 && !await finished(); attempt++) {
      await page.locator('#options .option').first().click();
      await page.clock.runFor(1000);
      if (!await finished()) await page.locator('#p-next').click();
    }
  } else if (game === 'where' || game === 'interval') {
    if (game === 'where') await page.locator('[data-mode="capital"]').click();
    for (let attempt = 0; attempt < 30 && !await finished(); attempt++) {
      await page.locator('#options .opt').first().click();
      await page.clock.runFor(900);
    }
  } else if (game === '2048') {
    for (let move = 0; move < 1500 && !await finished(); move++) {
      await page.keyboard.press(['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'][move % 4]);
      await page.clock.runFor(200);
    }
    if (await page.locator('#m-continue').count()) {
      await page.locator('#m-continue').click();
      return finishGame(page, game);
    }
  } else {
    assert.fail(`Missing result lifecycle fixture for ${game}`);
  }
  assert.equal(await finished(), true, `${game}: fixture must reach a real result`);
}

export async function verifyResultCycles(browser, base, games, width, artifacts) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.route('https://**', route => route.abort());
  await context.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    localStorage.setItem('arcade.analytics.disabled', '1');
  });
  try {
    for (const game of games) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.clock.install({ time: new Date('2026-09-28T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-09-28T00:00:10Z'));
      await page.goto(`${base}/${game}/`);
      const replay = page.locator('body > button').filter({ hasText: 'Play again' });
      const overlay = page.locator('#overlay');
      assert.equal(await replay.isVisible(), false, `${game}: replay hidden at boot`);
      assert.equal(await overlay.getAttribute('inert'), '', `${game}: hidden result inert at boot`);
      for (const dismissal of ['keyboard', 'backdrop']) {
        await finishGame(page, game);
        assert.equal(await overlay.getAttribute('inert'), null, `${game}: result is interactive`);
        assert.equal(await replay.isVisible(), false, `${game}: no stale replay under result`);
        if (dismissal === 'keyboard') {
          await page.locator('#modal [aria-label="Close"]').focus();
          await page.keyboard.press('Enter');
        } else {
          await overlay.click({ position: { x: 2, y: 2 }, button: 'right', force: true });
          assert.equal(await overlay.evaluate(element => element.classList.contains('show')), true, `${game}: secondary backdrop ignored`);
          await overlay.click({ position: { x: 2, y: 2 }, force: true });
        }
        assert.equal(await overlay.getAttribute('inert'), '', `${game}: dismissed result inert`);
        assert.equal(await replay.isVisible(), true, `${game}: finished game offers replay`);
        const oldRestart = page.locator('#modal button').last();
        await oldRestart.evaluate(element => element.focus());
        assert.equal(await oldRestart.evaluate(element => element === document.activeElement), false, `${game}: hidden dialog cannot receive focus`);
        if (dismissal === 'keyboard' && ['wordle', '2048', 'sprint'].includes(game)) {
          await page.locator('#restart').click();
        } else if (dismissal === 'keyboard' && game === 'where') {
          await page.locator('[data-mode="capital"]').click();
        } else if (dismissal === 'keyboard' && game === 'word') {
          await page.locator('[data-tab="today"]').click();
          assert.equal(await replay.isVisible(), false, 'Word: old practice replay absent from Today');
          await page.locator('[data-tab="practice"]').click();
        } else {
          await replay.focus();
          await page.keyboard.press('Enter');
        }
        assert.equal(await replay.isVisible(), false, `${game}: active run must not show replay`);
        assert.equal(await overlay.evaluate(element => element.classList.contains('show')), false, `${game}: result closed on restart`);
        await page.clock.runFor(350);
        assert.equal(await replay.isVisible(), false, `${game}: replay stays absent after pending callbacks`);
        assert.equal(await overlay.evaluate(element => element.classList.contains('show')), false, `${game}: no stale delayed result`);
      }
      if (game === 'wordle') {
        await page.locator('#board').click({ force: true });
        await page.keyboard.type('unity');
        await page.keyboard.press('Enter');
        await page.clock.runFor(1600);
        assert.equal((await page.locator('#board .row').first().locator('.tile').allTextContents()).join(''), 'UNITY');
        assert.equal(await replay.isVisible(), false, 'Wordle: no replay over an active guess');
      }
      if (artifacts) await page.screenshot({ path: resolve(artifacts, `active-after-result-${game}-${width}.png`), fullPage: true });
      assert.deepEqual(errors, [], `${game}: result-cycle runtime errors`);
      console.log(`PASS lifecycle ${game} ${width}px: real results, dismissal, restart, inert controls, no stale replay`);
      await page.close();
    }
  } finally {
    await context.close();
  }
}