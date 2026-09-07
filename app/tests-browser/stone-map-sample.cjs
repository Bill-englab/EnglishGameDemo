// Optional sample acceptance using existing Playwright/Edge/Electron installations.
// Start tools/preview_stone_map.py, set STONE_QA_URL to its printed URL.
// In-app browser is used for live visual inspection; this repeatable harness adds
// responsive geometry, media fallback and hidden native Electron assertions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium, _electron } = require('playwright');
const url = process.env.STONE_QA_URL;
if (!url) throw new Error('Start preview_stone_map.py and set STONE_QA_URL.');
const output = process.env.STONE_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'stone-map-evidence-'));
fs.mkdirSync(output, { recursive: true });
const findings = [];
let browser, electron;

async function sampleReady(page) {
  await page.locator('.stone-lesson').first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.stone-paver').length === 10);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('.stone-thumbnail')].every(el =>
    el.tagName === 'VIDEO' ? el.readyState >= 2 : el.complete && el.naturalWidth > 0));
}
async function inspect(page, viewport) {
  const motion = await page.evaluate(async () => {
    const map = document.querySelector('#map-view');
    const measure = () => ({ scroll: map.scrollTop,
      background: document.querySelector('#bg-layer').getBoundingClientRect().top,
      stone: document.querySelector('.stone-paver').getBoundingClientRect().top,
      header: document.querySelector('.topbar').getBoundingClientRect().top });
    const before = measure();
    map.scrollTo({ top: before.scroll + 100, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    const after = measure();
    map.scrollTo({ top: before.scroll, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    return { before, after };
  });
  const moved = motion.after.scroll - motion.before.scroll;
  assert.ok(moved > 0, 'Sample can scroll');
  assert.ok(Math.abs(motion.after.background - motion.before.background + moved) < 1, 'Background moves with the map');
  assert.ok(Math.abs(motion.after.stone - motion.before.stone + moved) < 1, 'Pavers move with the background');
  assert.equal(motion.after.header, motion.before.header, 'Left progress/profile header stays fixed');
  const data = await page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
    const frames = [...document.querySelectorAll('.stone-frame')].map(rect);
    const titles = [...document.querySelectorAll('.stone-title')].map(rect);
    const stones = [...document.querySelectorAll('.stone-paver')].map(el => ({ ...rect(el), gap: Number(el.dataset.gap) }));
    return { frames, titles, stones, brand: rect(document.querySelector('.shell-left')),
      progress: rect(document.querySelector('.shell-progress')), avatar: rect(document.querySelector('#user-menu-trigger')),
      overflow: document.documentElement.scrollWidth > innerWidth,
      mediaSources: [...document.querySelectorAll('.stone-thumbnail')].map(el => el.currentSrc || el.src),
      states: [...document.querySelectorAll('.stone-lesson')].map(el => el.getAttribute('aria-label')),
      count: document.querySelector('#star-count').textContent, total: document.querySelector('#star-total').textContent,
      scrollHeight: document.querySelector('#map-view').scrollHeight };
  });
  assert.equal(data.overflow, false);
  assert.ok(data.progress.x >= data.brand.right && data.progress.x - data.brand.right <= 20, 'Progress follows the brand compactly on the left');
  assert.ok(data.avatar.right <= viewport.width, 'Profile stays within the viewport');
  assert.equal(data.states.length, 3);
  assert.match(data.states[0], /Completed/);
  assert.match(data.states[1], /Current lesson/);
  assert.match(data.states[2], /Locked.*preview/);
  assert.equal(data.count, '1'); assert.equal(data.total, '30');
  assert.match(data.mediaSources[0], /\/video\/.+\/performance/);
  assert.match(data.mediaSources[1], /\/thumb\//);
  for (const r of data.frames) assert.ok(r.x >= 0 && r.right <= viewport.width, 'Thumbnail frames fit viewport');
  for (const stone of data.stones) {
    assert.ok(stone.x >= 0 && stone.right <= viewport.width, 'Pavers fit viewport');
    assert.ok(stone.y >= data.titles[stone.gap].bottom - 1, 'Paver stays below title');
    assert.ok(stone.bottom <= data.frames[stone.gap + 1].y + 1, 'Paver stays above next thumbnail');
  }
  const leftArc = data.stones.filter(s => s.gap === 0)[2];
  const rightArc = data.stones.filter(s => s.gap === 1)[2];
  assert.ok(leftArc.x + leftArc.width / 2 < data.frames[0].x + data.frames[0].width / 2 - 30);
  assert.ok(rightArc.x + rightArc.width / 2 > data.frames[1].x + data.frames[1].width / 2 + 30);
  assert.ok(data.frames[1].y - data.titles[0].bottom >= 180, 'The route has extended breathing room');
  findings.push({ viewport, sample: true, alternatingArcs: true, noClipping: true, media: true, scrollHeight: data.scrollHeight });
}

(async () => {
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(new URL('/', url).href);
    await page.locator('.level-node').first().waitFor();
    assert.equal(await page.locator('.level-node').count(), 30, 'Default map still renders all lessons');
    assert.equal(await page.locator('.stone-lesson').count(), 30, 'The approved stone map is the default');
    assert.equal((await page.context().cookies()).some(c => c.name === 'session'), false, 'Preview must not replace normal login cookie');
    for (const viewport of [{ width: 1440, height: 960 }, { width: 1024, height: 1900 },
      { width: 800, height: 600 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.goto(url);
      await sampleReady(page);
      await inspect(page, viewport);
      assert.equal(await page.title(), 'TigerTales');
      await page.screenshot({ path: path.join(output, `sample-${viewport.width}x${viewport.height}.png`) });
      await page.locator('#current-lesson-button').click();
      await page.waitForFunction(() => document.activeElement?.matches('.stone-lesson[aria-current]'));
      const scroll = await page.locator('#map-view').evaluate(el => el.scrollTop);
      await page.locator('.stone-lesson').nth(1).click();
      assert.equal(await page.locator('#detail-title').innerText(), 'The Dinosaur Shirt');
      await page.locator('#back-btn').click();
      await page.waitForFunction(y => Math.abs(document.querySelector('#map-view').scrollTop - y) < 2, scroll);
      await page.locator('#adventure-menu-button').click();
      assert.equal(await page.locator('#course-drawer').isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#course-drawer').isVisible(), false);
    }
    assert.deepEqual(errors, [], 'Normal/sample flow must have no runtime or console errors');
    const fallback = await browser.newPage();
    // A success response carrying unusable bytes exercises media fallback without
    // intentionally generating noisy HTTP errors in the happy-path page.
    await fallback.route('**/thumb/**', route => route.fulfill({ status: 200, contentType: 'image/jpeg', body: 'unavailable' }));
    await fallback.goto(url);
    await fallback.locator('.stone-lesson').first().waitFor();
    await fallback.waitForFunction(() => document.querySelectorAll('.stone-thumbnail[hidden]').length === 2);
    // Failed demo images can settle before the independent performance video.
    await fallback.waitForFunction(() => document.querySelector('video.stone-thumbnail').readyState >= 2);
    assert.equal(await fallback.locator('.stone-placeholder:visible').count(), 2);
    await fallback.locator('.stone-lesson').nth(2).click();
    assert.equal(await fallback.locator('#detail-title').innerText(), 'Water Instead');
    await fallback.close();

    if (process.env.STONE_QA_ELECTRON === '1') {
      const original = fs.readFileSync(path.join(__dirname, 'modern-toy-ui.cjs'), 'utf8');
      const program = original.match(/const electronProgram = `([\s\S]*?)`;/)[1];
      const ownedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stone-native-'));
      const main = path.join(ownedRoot, 'electron-sample.cjs');
      fs.writeFileSync(main, program);
      const env = { ...process.env, TOY_QA_USER_DATA: path.join(ownedRoot, 'user-data'),
        TOY_QA_PRELOAD: path.resolve(__dirname, '../../electron/preload.cjs'), TOY_QA_URL: url };
      delete env.ELECTRON_RUN_AS_NODE;
      electron = await _electron.launch({ executablePath: path.resolve(__dirname, '../node_modules/electron/dist/electron.exe'), args: [main], env });
      const native = await electron.firstWindow();
      const nativeErrors = [];
      native.on('pageerror', e => nativeErrors.push(e.message));
      await sampleReady(native);
      await inspect(native, { width: 800, height: 600 });
      assert.equal(await native.locator('#map-view .window-controls').count(), 1);
      await native.locator('#current-lesson-button').click();
      await native.waitForFunction(() => document.activeElement?.matches('.stone-lesson[aria-current]'));
      const png = await electron.evaluate(async () => {
        let capture;
        for (let i = 0; i < 3; i++) {
          capture = await global.qaWindow.webContents.capturePage(undefined, { stayHidden: true });
          await new Promise(r => setTimeout(r, 100));
        }
        return capture.toPNG().toString('base64');
      });
      fs.writeFileSync(path.join(output, 'sample-electron-800x600.png'), Buffer.from(png, 'base64'));
      await native.locator('.stone-lesson').nth(1).click();
      assert.equal(await native.locator('#detail-title').innerText(), 'The Dinosaur Shirt');
      await native.locator('#detail-view .wc-minimize').click();
      assert.equal(await electron.evaluate(() => global.qaWindow.isMinimized()), true);
      assert.deepEqual(nativeErrors, []);
      findings.push({ electron: true, realPreload: true, minimize: true, detail: true });
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(findings, null, 2));
    console.log(JSON.stringify({ pass: true, output, findings }, null, 2));
  } finally {
    if (electron) await electron.close();
    if (browser) await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
