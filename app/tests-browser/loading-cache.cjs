// Run only against preview_stone_map.py --login, never real accounts/media.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const url = process.env.STONE_QA_URL;
const output = process.env.STONE_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tigertales-loading-'));
fs.mkdirSync(output, { recursive: true });

async function ready(page) {
  await page.waitForFunction(() => document.querySelectorAll('.stone-lesson').length === 30
    && document.querySelector('#map-loading').classList.contains('hidden'));
}
async function artReady(page) {
  await page.waitForFunction(() => document.querySelector('.bg-layer__slide')?.dataset.art === 'map');
  await page.evaluate(async () => {
    await document.fonts.ready;
    const source = document.querySelector('.bg-layer__slide').style.backgroundImage.slice(5, -2);
    const image = new Image(); image.src = source; await image.decode();
    await Promise.all([...document.images].filter(i => i.getBoundingClientRect().top < innerHeight).map(i => i.decode()));
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.locator('#username').fill('preview');
    await page.locator('#password').fill('preview-only');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 250000, uploadThroughput: 125000,
    });
    const started = Date.now();
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await ready(page);
    const mapReadyMs = Date.now() - started;
    await artReady(page);
    const artReadyMs = Date.now() - started;
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => ({
      name: new URL(r.name).pathname, bytes: r.encodedBodySize, transfer: r.transferSize,
    })));
    const art = resources.filter(r => r.name.includes('/map-assets/'));
    assert.ok(art.length >= 4);
    assert.ok(art.reduce((sum, r) => sum + r.bytes, 0) < 2_000_000, 'First-screen artwork stays below 2 MB');
    assert.ok(!resources.some(r => /\/(worlds-map|stone-map)\/.*\.png$/.test(r.name)), 'No full source PNG downloads');
    await page.screenshot({ path: path.join(output, 'mobile-map.png') });
    await page.reload(); await ready(page); await artReady(page);
    const warm = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter(r => r.name.includes('/map-assets/')).map(r => ({ transfer: r.transferSize, bytes: r.encodedBodySize })));
    assert.ok(warm.length >= 4 && warm.every(r => r.transfer === 0), 'Repeat visit reuses artwork without a download');
    await page.locator('.stone-lesson').first().click();
    await page.waitForSelector('#detail-title');
    assert.equal(await page.locator('#detail-title').innerText(), 'The Apple, Please');
    await page.screenshot({ path: path.join(output, 'mobile-detail.png') });
    assert.deepEqual(errors, []);
    results.push({ mobileLogin: true, networkMbps: 2, mapReadyMs, artReadyMs, artBytes: art.reduce((s, r) => s + r.bytes, 0), warmArtTransfers: 0 });

    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    // Simulate deadlines with fast timers; no long waits or application test flags.
    for (const mode of ['missing-module', 'hung-module', 'hung-library', 'hung-session', 'legacy-media-query']) {
      const p = await context.newPage();
      await p.addInitScript(() => {
        const set = window.setTimeout;
        window.setTimeout = (callback, delay, ...args) => set(callback, delay === 15000 || delay === 30000 ? 1500 : delay, ...args);
      });
      let blocked = true;
      let held;
      const pattern = mode.includes('module') ? '**/stone-map.mjs' : mode === 'hung-session' ? '**/api/me' : '**/api/library*';
      if (mode === 'legacy-media-query') await p.addInitScript(() => {
        const match = window.matchMedia;
        window.matchMedia = query => { const media = match(query); media.addEventListener = undefined; return media; };
      });
      else await p.route(pattern, route => {
        if (!blocked) return route.continue();
        if (mode === 'missing-module') return route.abort();
        held = route;
      });
      await p.goto(url, { waitUntil: 'commit' });
      if (mode === 'legacy-media-query') await ready(p);
      else {
        await p.waitForFunction(() => {
          const error = document.getElementById('map-error');
          return error && !error.classList.contains('hidden');
        }, null, { timeout: 8000 });
        assert.equal(await p.locator('#map-loading').evaluate(el => el.classList.contains('hidden')), true);
        blocked = false;
        await held?.abort().catch(() => {});
        await p.locator('#map-retry').click();
        await ready(p);
      }
      results.push({ mode, recovered: true });
      console.log(`${mode}: recovered`);
      await p.close();
    }
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto(url); await ready(page); await artReady(page);
    await page.screenshot({ path: path.join(output, 'desktop-map.png') });
    console.log(JSON.stringify({ results, output }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
