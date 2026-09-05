// Optional acceptance: existing Playwright + Edge + Python/app requirements only.
// Browser plugin not available in the acceptance environment; use Playwright/Edge.
// NODE_PATH=<existing runtime> node tests-browser/modern-toy-ui.cjs
// TOY_QA_PYTHON selects Python; TOY_QA_OUTPUT optionally retains screenshots outside
// application data. TOY_QA_ELECTRON=1 also tests the installed native Electron shell.
// All users, curriculum copies, config and media belong to a temporary fixture.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const finalFixes = require('./final-fixes.cjs');

// Harness resilience helpers also have zero-browser fault-injection checks:
// node tests-browser/modern-toy-ui.cjs --self-test
function withTimeout(operation, label, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms waiting for ${label}`)), timeoutMs);
    Promise.resolve(operation).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}
function unexpectedFailures(responses, messages) {
  return {
    responses: responses.filter(response => !response.expected),
    consoleErrors: messages.filter(message => !(
      /^Failed to load resource: the server responded with a status of 404(?: |$)/.test(message.text) &&
      responses.some(response => response.status === 404 && response.expected && response.url === message.url)
    )),
  };
}
async function cleanupResources(resources, primaryError) {
  const failures = [];
  for (const { name, close } of resources) {
    try {
      await withTimeout(Promise.resolve().then(close), `${name} cleanup`, 5000);
    } catch (error) {
      failures.push({ resource: name, error });
    }
  }
  if (primaryError) {
    if (failures.length) primaryError.cleanupFailures = failures;
    throw primaryError;
  }
  if (failures.length) {
    const error = new AggregateError(failures.map(failure => failure.error), 'Acceptance resource cleanup failed');
    error.cleanupFailures = failures;
    throw error;
  }
}
async function selfTest(selected) {
  const cases = {
    timeout: async () => {
      let watchdog;
      try {
        await assert.rejects(Promise.race([
          withTimeout(new Promise(() => {}), 'demo upload request (capture)', 30),
          new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('test watchdog: upload wait remained pending')), 150); }),
        ]), /Timed out.*demo upload request.*capture/);
      } finally { clearTimeout(watchdog); }
      assert.equal(await withTimeout(Promise.resolve('started'), 'upload', 30), 'started');
      const requestError = new Error('request failed');
      await assert.rejects(withTimeout(Promise.reject(requestError), 'upload', 30), error => error === requestError);
    },
    '404': async () => {
      const text = 'Failed to load resource: the server responded with a status of 404 (NOT FOUND)';
      const responses = [
        { url: 'http://fixture/thumb/ch/lesson', status: 404, expected: true },
        { url: 'http://fixture/static/missing-module.mjs', status: 404, expected: false },
      ];
      const messages = responses.map(({ url }) => ({ url, text }));
      const unexpected = unexpectedFailures(responses, messages);
      assert.deepEqual(unexpected.responses, [responses[1]], 'missing required resources must fail');
      assert.deepEqual(unexpected.consoleErrors, [messages[1]], 'unexpected 404 console errors must remain');
      assert.deepEqual(unexpectedFailures([responses[0]], [messages[0]]), { responses: [], consoleErrors: [] });
      assert.equal(unexpectedFailures([], [{ url: '', text }]).consoleErrors.length, 1, 'unattributed 404 errors must remain');
    },
    cleanup: async () => {
      const cleaned = [];
      const primary = new Error('primary acceptance failure');
      const shutdown = new Error('Electron shutdown failed');
      await assert.rejects(cleanupResources([
        { name: 'Electron', close: async () => { cleaned.push('Electron'); throw shutdown; } },
        { name: 'browser', close: async () => { cleaned.push('browser'); } },
        { name: 'server', close: async () => { cleaned.push('server'); } },
        { name: 'temporary root', close: async () => { cleaned.push('temporary root'); } },
      ], primary), error => error === primary);
      assert.deepEqual(cleaned, ['Electron', 'browser', 'server', 'temporary root']);
      assert.equal(primary.cleanupFailures[0].resource, 'Electron');
      assert.equal(primary.cleanupFailures[0].error, shutdown);
      await assert.rejects(cleanupResources([{ name: 'browser', close: async () => { throw shutdown; } }]), AggregateError);
    },
  };
  const names = selected ? [selected] : Object.keys(cases);
  for (const name of names) {
    assert.ok(cases[name], `Unknown self-test: ${name}`);
    await cases[name]();
    console.log(`PASS harness resilience: ${name}`);
  }
}

const fixtureProgram = `
import json, os, shutil, sys
from pathlib import Path
from unittest.mock import patch
from werkzeug.security import generate_password_hash
from werkzeug.serving import make_server
root = Path(sys.argv[1])
shutil.copytree(Path.cwd().parent / 'curriculum', root / 'curriculum')
for key in ('CURRICULUM', 'DEMO', 'RECORDINGS', 'PROMPTS', 'PROFILES'):
    os.environ[key + '_ROOT'] = str(root / key.lower())
os.environ['CURRICULUM_STAGE'] = '04'
# Prevent even reading the user's real config during import.
original_exists = Path.exists
config = Path.cwd() / 'config.json'
with patch.object(Path, 'exists', lambda self: False if self == config else original_exists(self)):
    import app as m
m.USERS_FILE = root / 'users.json'
m.USERS_FILE.write_text(json.dumps({'alice': generate_password_hash('qa-only-password')}))
server = make_server('127.0.0.1', 0, m.app, threaded=True)
print('QA_URL=http://127.0.0.1:' + str(server.server_port), flush=True)
server.serve_forever()
`;

// A separate main process avoids electron/main.cjs's production server/startup
// scan and port-5000 cleanup. Uses the real preload and real native window APIs.
const electronProgram = `
const { app, BrowserWindow, ipcMain } = require('electron');
app.setPath('userData', process.env.TOY_QA_USER_DATA);
let win;
app.whenReady().then(() => {
  win = new BrowserWindow({ width: 800, height: 600, show: false, frame: false,
    webPreferences: { preload: process.env.TOY_QA_PRELOAD, contextIsolation: true, backgroundThrottling: false,
      nodeIntegration: false, sandbox: false } });
  global.qaWindow = win;
  global.qaIPC = [];
  ipcMain.on('window-minimize', () => { global.qaIPC.push('minimize'); win.minimize(); });
  ipcMain.on('window-maximize', () => { global.qaIPC.push('maximize');
    if (win.isMaximized()) win.unmaximize(); else win.maximize(); });
  ipcMain.on('window-close', () => { global.qaIPC.push('close'); win.close(); });
  win.loadURL(process.env.TOY_QA_URL);
});
// Playwright owns process shutdown after observing the close IPC.
app.on('window-all-closed', () => {});
`;

async function login(page, url) {
  await page.goto(url);
  await page.locator('[name=username]').fill('alice');
  await page.locator('[name=password]').fill('qa-only-password');
  await page.locator('button[type=submit]').click();
  await page.locator('.level-node').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function noOverflow(page) {
  assert.deepEqual(await page.evaluate(() => ['html', 'body', '#map-view', '#detail-view', '#course-drawer']
    .filter(s => { const e = document.querySelector(s); return e.getClientRects().length && e.scrollWidth > e.clientWidth + 1; })), []);
}
async function screenshot(page, output, name) {
  if (output) await page.screenshot({ path: path.join(output, `${name}.png`) });
}
async function nativeScreenshot(electron, output, name) {
  if (!output) return;
  const png = await electron.evaluate(async () => {
    // A hidden Windows compositor can return the previous surface on its first
    // capture request. Request/flush two frames before keeping the final image.
    let capture;
    for (let frame = 0; frame < 3; frame++) {
      capture = await global.qaWindow.webContents.capturePage(undefined, { stayHidden: true });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return capture.toPNG().toString('base64');
  });
  fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(png, 'base64'));
}
async function pathAligned(page) {
  const delta = await page.evaluate(() => {
    const svg = document.querySelector('#path-svg');
    const paths = [...svg.querySelectorAll('path')];
    const origin = document.querySelector('#map-scroll').getBoundingClientRect();
    return Math.max(...[...document.querySelectorAll('.level-node')].map(node => {
      const r = node.getBoundingClientRect();
      const x = r.left + r.width / 2 - origin.left;
      const y = r.top + r.height / 2 - origin.top;
      let distance = Infinity;
      for (const line of paths) {
        // The chapter path is monotone vertically: binary-search its height
        // instead of sampling every pixel of a 30-lesson SVG repeatedly.
        let low = 0, high = line.getTotalLength();
        for (let step = 0; step < 22; step++) {
          const middle = (low + high) / 2;
          if (line.getPointAtLength(middle).y < y) low = middle;
          else high = middle;
        }
        const p = line.getPointAtLength((low + high) / 2);
        distance = Math.min(distance, Math.hypot(p.x - x, p.y - y));
      }
      return distance;
    }));
  });
  assert.ok(delta < 4, `Path misses a node center by ${delta}px`);
}

async function main() {
  const { chromium, _electron } = require('playwright');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'english-modern-toy-'));
  const output = process.env.TOY_QA_OUTPUT && path.resolve(process.env.TOY_QA_OUTPUT);
  if (output) fs.mkdirSync(output, { recursive: true });
  const server = spawn(process.env.TOY_QA_PYTHON || 'python', ['-u', '-c', fixtureProgram, fixtureRoot],
    { cwd: path.resolve(__dirname, '..'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser, electron, primaryError;
  const results = [], errors = [], consoleErrors = [], failedResponses = [];
  const allowed404Urls = new Set();
  function watchDiagnostics(page) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url });
    });
    page.on('response', response => {
      if (response.status() >= 400) failedResponses.push({
        url: response.url(), status: response.status(),
        expected: response.status() === 404 && allowed404Urls.has(response.url()),
      });
    });
  }
  try {
    const url = await new Promise((resolve, reject) => {
      let stdout = '', stderr = '';
      const timer = setTimeout(() => reject(new Error(`Fixture timeout: ${stderr}`)), 15000);
      const fail = error => { clearTimeout(timer); reject(error); };
      server.once('error', fail);
      server.once('exit', code => fail(new Error(`Fixture exited ${code}: ${stderr}`)));
      server.stderr.on('data', data => { stderr += data; });
      server.stdout.on('data', data => {
        stdout += data;
        const match = stdout.match(/QA_URL=(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    browser = await chromium.launch({ channel: 'msedge', headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    watchDiagnostics(page);
    // Every upload is intercepted, including accidental performance uploads.
    await page.route('**/upload/**', route => route.fulfill({ status: 409, json: { error: 'QA upload interception' } }));
    await login(page, url);
    assert.equal(await page.title(), 'My English Adventure');
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(await page.locator('#star-count').innerText(), '0');
    assert.equal(await page.locator('#star-total').innerText(), '30');
    const library = await (await page.request.get(`${url}/api/library`)).json();
    assert.equal(library.length, 10);
    assert.equal(library.flatMap(c => c.levels).length, 30);
    assert.equal(library.flatMap(c => c.levels).filter(l => l.has_performance).length, 0);

    if (process.env.TOY_QA_FINAL_FIX && process.env.TOY_QA_FINAL_FIX !== 'electron') {
      await finalFixes[process.env.TOY_QA_FINAL_FIX](page, url, output);
      console.log(`PASS focused regression: ${process.env.TOY_QA_FINAL_FIX}`);
      return;
    }
    if (process.env.TOY_QA_FINAL_FIX !== 'electron') {
      await finalFixes.selection(page);
      await finalFixes.account(page, url, output);
      await finalFixes.refresh(page, url);
      results.push({ drawerSelection: 'drawer, next, previous, direct map', account: '800x600 and 390x844 controls >=44px, Nunito >=14px' });

      for (const [width, height] of [[1440, 960], [800, 600], [390, 844], [844, 390]]) {
        await page.setViewportSize({ width, height });
        await page.reload();
        await page.locator('.level-node').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(mobile => [...document.querySelectorAll('.bg-layer__slide')]
          .every(e => e.style.backgroundImage.includes(mobile ? '-mobile.webp' : '-desktop.webp')), width < 768);
        assert.equal(await page.locator('.chapter-world').count(), 10);
        assert.equal(await page.locator('.level-node').count(), 30);
        assert.deepEqual(await page.locator('.chapter-world').evaluateAll(chapters => chapters.map(c => c.querySelectorAll('.level-node').length)), Array(10).fill(3));
        await screenshot(page, output, `map-${width}x${height}`);
        await noOverflow(page);
        await pathAligned(page);
        for (let i = 0; i < 10; i++) {
          await page.locator('.chapter-world').nth(i).evaluate(e => e.scrollIntoView({ block: 'center' }));
          await page.waitForFunction(chapter => document.querySelector('.bg-layer__slide.is-active')?.dataset.chapter === chapter, library[i].name);
        }
        await page.locator('#current-lesson-button').click();
        await page.waitForFunction(() => document.activeElement?.hasAttribute('data-current-lesson'));
        assert.equal(await page.locator('#detail-view').isVisible(), false);
        const scrollBefore = await page.locator('#map-view').evaluate(e => e.scrollTop);
        await page.locator('#adventure-menu-button').click();
        assert.equal(await page.locator('#course-drawer-close').evaluate(e => e === document.activeElement), true);
        assert.equal(await page.locator('#map-view').evaluate(e => e.inert && e.style.overflowY === 'hidden'), true);
        assert.equal(await page.locator('.course-stage').count(), 3);
        assert.equal(await page.locator('.course-stage:disabled').count(), 2);
        assert.match(await page.locator('.course-stage').nth(1).innerText(), /Stage 2[\s\S]*Planned/);
        assert.match(await page.locator('.course-stage').nth(2).innerText(), /Stage 3[\s\S]*Planned/);
        assert.equal(await page.locator('.course-chapter').count(), 10);
        await screenshot(page, output, `drawer-${width}x${height}`);
        await noOverflow(page);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.locator('#course-profile-button').evaluate(e => e === document.activeElement), true);
        await page.keyboard.press('Tab');
        assert.equal(await page.locator('#course-drawer-close').evaluate(e => e === document.activeElement), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#adventure-menu-button').evaluate(e => e === document.activeElement), true);
        assert.equal(await page.locator('#map-view').evaluate(e => e.scrollTop), scrollBefore);
        await page.locator('#adventure-menu-button').click();
        await page.locator('#course-drawer-close').click();
        await page.locator('#adventure-menu-button').click();
        await page.locator('#drawer-backdrop').click({ position: { x: width - 5, y: height - 5 } });
        assert.equal(await page.locator('#course-drawer').isVisible(), false);
        await page.locator('#adventure-menu-button').click();
        await page.locator('.course-lesson').first().click();
        assert.equal(await page.locator('#detail-title').innerText(), library[0].levels[0].title);
        assert.equal(await page.locator('#course-drawer').isVisible(), false);
        assert.equal(await page.locator('.dialogue-part').count(), 3);
        assert.equal(await page.locator('.replay-card').count(), 2);
        assert.deepEqual(await page.locator('.detail-reading > section').evaluateAll(nodes => nodes.map(n => n.className)), ['reading-section', 'replay-section', 'grownup-section']);
        assert.equal(await page.locator('.detail-disclosure[open]').count(), 0);
        assert.equal(await page.locator('.detail-media > section').first().getAttribute('id'), 'media-panel-performance');
        if (width < 768) {
          assert.equal(await page.locator('#media-panel-demo').isVisible(), false);
          await page.locator('#media-tab-demo').click();
          assert.equal(await page.locator('#media-panel-performance').isVisible(), false);
          assert.equal(await page.getByRole('button', { name: 'Add demo', exact: true }).isVisible(), true);
          await page.locator('#media-tab-performance').click();
        } else {
          assert.equal(await page.locator('#media-panel-demo').isVisible(), true);
        }
        await screenshot(page, output, `detail-${width}x${height}`);
        await noOverflow(page);
        await page.locator('#detail-nav button').last().click();
        assert.equal(await page.locator('#detail-title').innerText(), library[0].levels[1].title);
        await page.locator('#detail-nav button').first().click();
        assert.equal(await page.locator('#detail-title').innerText(), library[0].levels[0].title);
        await page.locator('#back-btn').click();
        assert.equal(await page.locator('#map-view').evaluate(e => e.scrollTop), scrollBefore);
        results.push({ viewport: `${width}x${height}`, map: 30, chapters: 10, focus: true, drawer: true, assets: true, overflow: false, detail: true });
      }

      if (output) {
        // Desktop concepts are 1536x1024. The mobile concept is a 1683x935
        // side-by-side presentation, so capture two actual narrow app frames
        // within that same canvas as well as the required 390x844 screenshots.
        await page.setViewportSize({ width: 1536, height: 1024 });
        await page.reload();
        await page.locator('.level-node').first().waitFor();
        await page.waitForFunction(() => document.querySelector('.bg-layer__slide')?.style.backgroundImage.includes('-desktop.webp'));
        await screenshot(page, output, 'reference-map-1536x1024');
        await page.locator('#adventure-menu-button').click();
        await screenshot(page, output, 'reference-drawer-1536x1024');
        await page.locator('.course-lesson').first().click();
        await screenshot(page, output, 'reference-detail-1536x1024');
        await page.setViewportSize({ width: 575, height: 910 });
        await page.reload();
        await page.locator('.level-node').first().waitFor();
        await page.waitForFunction(() => document.querySelector('.bg-layer__slide')?.style.backgroundImage.includes('-mobile.webp'));
        const mapImage = (await page.screenshot()).toString('base64');
        await page.setViewportSize({ width: 562, height: 910 });
        await page.locator('.level-node').first().click();
        const detailImage = (await page.screenshot()).toString('base64');
        const comparison = await page.context().newPage();
        watchDiagnostics(comparison);
        await comparison.setViewportSize({ width: 1683, height: 935 });
        await comparison.setContent(`<style>body{margin:0;background:#f7f4ef}img{position:absolute;top:12px;height:910px;border-radius:24px}#map{left:225px;width:575px}#detail{left:893px;width:562px}</style><img id="map" alt="Actual mobile map" src="data:image/png;base64,${mapImage}"><img id="detail" alt="Actual mobile detail" src="data:image/png;base64,${detailImage}">`);
        await screenshot(comparison, output, 'reference-mobile-1683x935');
        await comparison.close();
        await page.locator('#back-btn').click();
      }

      // Real scanner state: create only temporary filesystem markers, not API mocks.
      for (const level of library[0].levels.slice(0, 2)) {
        const directory = path.join(fixtureRoot, 'recordings', 'alice', '04', library[0].name, level.level);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, 'performance.webm'), 'temporary scanner presence marker');
      }
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#star-count').textContent === '2');
      assert.equal(await page.locator('.level-node--completed').count(), 2);
      assert.equal(await page.locator('[data-current-lesson]').getAttribute('aria-label'), library[0].levels[2].title);
      await page.locator('#adventure-menu-button').click();
      assert.match(await page.locator('#course-drawer-progress').innerText(), /2 \/ 30 completed/);
      assert.equal(await page.locator('.course-chapter__count').first().innerText(), '2 / 3');
      await page.keyboard.press('Escape');
      results.push({ realProgress: '0/30 -> 2/30', current: 'lesson 3' });

      await page.setViewportSize({ width: 1440, height: 960 });
      // This one lesson's mock demo intentionally has no generated thumbnail.
      // Missing assets outside this explicit phase/URL are acceptance failures.
      const optionalThumbnailUrl = `${url}/thumb/${library[0].name}/${library[0].levels[0].level}`;
      allowed404Urls.add(optionalThumbnailUrl);
      let uploaded = false;
      await page.route('**/api/library', async route => {
        const response = await route.fetch();
        const data = await response.json();
        data[0].levels[0].has_demo = uploaded;
        data[0].levels[0].has_performance = false;
        await route.fulfill({ json: data });
      });
      await page.route('**/video/**/demo?*', route => route.fulfill({ status: 204 }));
      for (const phase of ['capture', 'unsaved playback']) {
        uploaded = false;
        await page.reload();
        await page.locator('.level-node').first().click();
        let finishUpload, uploadStarted;
        const started = new Promise(resolve => { uploadStarted = resolve; });
        await page.route('**/upload/**/demo', route => {
          finishUpload = () => { uploaded = true; return route.fulfill({ json: { ok: true } }); };
          uploadStarted();
        });
        await page.evaluate(() => {
          window.showOpenFilePicker = async () => [{ getFile: async () => new File(['QA'], 'demo.webm', { type: 'video/webm' }) }];
        });
        await page.getByRole('button', { name: 'Add demo', exact: true }).click();
        await withTimeout(started, `demo upload request (${phase})`);
        await page.getByRole('button', { name: 'Start recording', exact: true }).click();
        await page.locator('.record-preview').waitFor();
        await page.locator('.record-btn').click();
        if (phase === 'unsaved playback') {
          await page.waitForTimeout(300);
          await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
          await page.locator('.record-playback').waitFor();
        }
        await page.evaluate(() => {
          window.qaVideo = document.querySelector('#detail-perf video');
          window.qaSource = window.qaVideo.srcObject || window.qaVideo.src;
        });
        // Also cross the responsive boundary while the performance owns its DOM.
        await page.setViewportSize({ width: 390, height: 844 });
        await finishUpload();
        await page.waitForFunction(() => document.querySelector('#detail-demo button')?.textContent === 'Replace');
        assert.equal(await page.evaluate(() => {
          const current = document.querySelector('#detail-perf video');
          return current === window.qaVideo && (current.srcObject || current.src) === window.qaSource;
        }), true);
        if (phase === 'capture') assert.equal(await page.evaluate(() => window.qaVideo.srcObject.getTracks().every(t => t.readyState === 'live')), true);
        else assert.equal(await page.getByRole('button', { name: 'Save', exact: false }).isVisible(), true);
        await noOverflow(page);
        await page.unroute('**/upload/**/demo');
        await page.setViewportSize({ width: 1440, height: 960 });
        results.push({ delayedDemo: phase, performanceRetainedAcrossResize: true });
      }
      await page.waitForLoadState('networkidle');
      allowed404Urls.delete(optionalThumbnailUrl);

      await page.unroute('**/api/library');
      for (const chapter of library) for (const level of chapter.levels) {
        const directory = path.join(fixtureRoot, 'recordings', 'alice', '04', chapter.name, level.level);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(path.join(directory, 'performance.webm'), 'temporary scanner presence marker');
      }
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#star-count').textContent === '30');
      assert.equal(await page.locator('[data-current-lesson]').count(), 0);
      assert.equal(await page.locator('#current-lesson-button').isVisible(), false);
      assert.equal(await page.locator('#adventure-complete').isVisible(), true);
      // Block every world candidate to exercise the final local material fallback.
      const { getWorldAssetUrls } = await import('../static/world-assets.mjs');
      const worlds = await page.locator('.bg-layer__slide').evaluateAll(slides => slides.map(slide => slide.dataset.world));
      const missingBackgroundUrls = new Set(worlds.flatMap(world => getWorldAssetUrls(world, false)).map(asset => new URL(asset, url).href));
      missingBackgroundUrls.forEach(asset => allowed404Urls.add(asset));
      await page.route('**/static/worlds*/**', route => missingBackgroundUrls.has(route.request().url())
        ? route.fulfill({ status: 404 }) : route.continue());
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForFunction(() => document.querySelectorAll('.bg-layer__slide--placeholder').length === 10);
      assert.equal(await page.locator('.level-node').count(), 30);
      await page.locator('.level-node').last().click();
      assert.equal(await page.locator('#detail-title').innerText(), library[9].levels[2].title);
      await page.unroute('**/static/worlds*/**');
      missingBackgroundUrls.forEach(asset => allowed404Urls.delete(asset));
      results.push({ allComplete: '30/30', currentHidden: true, missingBackgrounds: 'material fallback; lesson usable' });
    }

    if (process.env.TOY_QA_ELECTRON === '1') {
      const main = path.join(fixtureRoot, 'electron-acceptance.cjs');
      fs.writeFileSync(main, electronProgram);
      const electronEnv = { ...process.env, TOY_QA_URL: url,
        TOY_QA_USER_DATA: path.join(fixtureRoot, 'electron-user-data'), TOY_QA_PRELOAD: path.resolve(__dirname, '../../electron/preload.cjs') };
      delete electronEnv.ELECTRON_RUN_AS_NODE;
      electron = await _electron.launch({ executablePath: path.resolve(__dirname, '../node_modules/electron/dist/electron.exe'),
        args: [main], env: electronEnv });
      const native = await electron.firstWindow();
      watchDiagnostics(native);
      await login(native, url);
      await native.waitForFunction(() => document.querySelector('.bg-layer__slide')?.style.backgroundImage.includes('-desktop.webp'));
      await native.waitForTimeout(300); // Hidden native compositor needs a frame before capturePage.
      await noOverflow(native);
      assert.equal(await native.evaluate(() => Boolean(window.electronAPI?.isElectron)), true);
      assert.equal(await electron.evaluate(() => global.qaWindow.isVisible()), false);
      assert.equal(await native.locator('.topbar').evaluate(e => getComputedStyle(e).webkitAppRegion), 'drag');
      assert.equal(await native.locator('.topbar button').evaluateAll(buttons => buttons.every(e => getComputedStyle(e).webkitAppRegion === 'no-drag')), true);
      await finalFixes.electronDrawer(native, electron);
      await nativeScreenshot(electron, output, 'electron-map-800x600');
      await native.locator('.level-node').nth(2).click();
      await native.locator('#detail-view').waitFor({ state: 'visible' });
      await native.waitForTimeout(300);
      await noOverflow(native);
      assert.equal(await native.locator('.detail-header button').evaluateAll(buttons => buttons.every(e => getComputedStyle(e).webkitAppRegion === 'no-drag')), true);
      await nativeScreenshot(electron, output, 'electron-detail-800x600');
      await native.locator('#back-btn').click();
      await native.locator('.topbar .wc-minimize').evaluate(e => e.click());
      await native.waitForTimeout(150);
      assert.equal(await electron.evaluate(() => global.qaWindow.isMinimized()), true);
      await electron.evaluate(() => { global.qaWindow.restore(); global.qaWindow.hide(); });
      await native.locator('.topbar .wc-maximize').evaluate(e => e.click());
      await native.waitForTimeout(150);
      assert.equal(await electron.evaluate(() => global.qaWindow.isMaximized()), true);
      await native.locator('.topbar .wc-maximize').evaluate(e => e.click());
      await native.waitForTimeout(150);
      assert.equal(await electron.evaluate(() => global.qaWindow.isMaximized()), false);
      const closed = native.waitForEvent('close');
      await native.locator('.topbar .wc-close').evaluate(e => e.click());
      await closed;
      assert.deepEqual(await electron.evaluate(() => global.qaIPC), ['minimize', 'maximize', 'maximize', 'close']);
      assert.equal(await electron.evaluate(() => global.qaWindow.isDestroyed()), true);
      results.push({ electron: '800x600', realPreload: true, drawerNoDrag: true,
        rendererInputDismissal: ['close lower strip', 'backdrop over draggable topbar'],
        nativeIPC: ['minimize', 'maximize', 'unmaximize', 'close'], overflow: false });
    }
    assert.deepEqual(errors, []);
    // Only console 404s correlated to explicitly expected failed-response URLs
    // are excused. Required assets, unrelated endpoints and unattributed errors fail.
    const unexpected = unexpectedFailures(failedResponses, consoleErrors);
    assert.deepEqual(unexpected.responses, [], 'Unexpected failed HTTP responses');
    assert.deepEqual(unexpected.consoleErrors, [], 'Unexpected browser console errors');
    console.log(JSON.stringify({ results, pageErrors: errors, consoleErrors: unexpected.consoleErrors,
      expected404s: failedResponses.filter(response => response.expected), output }, null, 2));
  } catch (error) {
    primaryError = error;
  } finally {
    await cleanupResources([
      { name: 'Electron', close: async () => { if (electron) await electron.close(); } },
      { name: 'browser', close: async () => { if (browser) await browser.close(); } },
      { name: 'server', close: async () => {
        if (server.exitCode === null) await new Promise((resolve, reject) => {
          server.once('exit', resolve);
          if (!server.kill()) reject(new Error('Could not stop the owned fixture server'));
        });
      } },
      // Only this exact mkdtemp-owned root is removed; no application data roots.
      { name: 'temporary root', close: () => fs.rmSync(fixtureRoot, { recursive: true, force: true }) },
    ], primaryError);
  }
}
const selfTestArgument = process.argv.find(argument => /^--self-test(?:=|$)/.test(argument));
(selfTestArgument ? selfTest(selfTestArgument.split('=')[1]) : main())
  .catch(error => { console.error(error); process.exitCode = 1; });
