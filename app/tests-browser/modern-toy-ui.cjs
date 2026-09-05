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
const feedbackRegressions = require('./feedback-regressions.cjs');
const focus = (process.argv.find(argument => argument.startsWith('--focus=')) || '').slice('--focus='.length);

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
  const distances = await page.evaluate(() => {
    const svg = document.querySelector('#path-svg');
    const paths = [...svg.querySelectorAll('path')];
    const origin = document.querySelector('#map-scroll').getBoundingClientRect();
    return [...document.querySelectorAll('.level-node')].map(node => {
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
    });
  });
  const delta = Math.max(...distances);
  assert.ok(delta < 4, `Path misses a node center by ${delta}px; distances: ${distances.join(', ')}`);
}

function expectClose(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance}px of ${expected}`);
}

async function shellGeometry(page, viewport) {
  await page.setViewportSize(viewport);
  await page.reload();
  await page.locator('.level-node').first().waitFor();
  const shell = await page.locator('.topbar').evaluate(el => {
    const rect = selector => {
      const r = el.querySelector(selector).getBoundingClientRect();
      return { top: r.top, height: r.height, left: r.left, right: r.right, center: r.left + r.width / 2,
        radius: getComputedStyle(el.querySelector(selector)).borderRadius };
    };
    return { railHeight: el.getBoundingClientRect().height, brand: rect('.adventure-brand'), progress: rect('.progress'), account: rect('.user-menu__trigger') };
  });
  expectClose(shell.brand.top, shell.progress.top, 1);
  expectClose(shell.brand.top, shell.account.top, 1);
  expectClose(shell.railHeight, 56, 1);
  expectClose(shell.brand.height, 52, 1);
  expectClose(shell.progress.height, 52, 1);
  expectClose(shell.account.height, 52, 1);
  expectClose(shell.progress.center, viewport.width / 2, 1);
  assert.deepEqual([shell.brand.radius, shell.progress.radius, shell.account.radius], ['16px', '16px', '16px'],
    'Brand, progress and account use the shared 16px capsule radius');
  if (viewport.width < 768) {
    assert.ok(shell.brand.right <= shell.progress.left && shell.progress.right <= shell.account.left,
      `Compact capsules stay in separate columns: ${JSON.stringify(shell)}`);
    const title = await page.locator('.adventure-brand .title').evaluate(el => {
      const style = getComputedStyle(el);
      return { overflow: style.overflow, textOverflow: style.textOverflow, whiteSpace: style.whiteSpace };
    });
    assert.deepEqual(title, { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      'Narrow shells ellipsize the brand title instead of wrapping the grid cell');
  }
}

async function assertMinimumTargetSize(page, selector, label) {
  const undersized = await page.locator(selector).evaluateAll(elements => elements
    .filter(element => element.getClientRects().length)
    .map(element => {
      const rect = element.getBoundingClientRect();
      return { label: element.getAttribute('aria-label') || element.textContent.trim() || element.className,
        width: rect.width, height: rect.height };
    })
    .filter(target => target.width < 44 || target.height < 44));
  assert.deepEqual(undersized, [], `${label} targets must each be at least 44×44px`);
}

async function assertBrowserTargetDimensions(page, viewport) {
  await page.setViewportSize(viewport);
  await page.reload();
  await page.locator('.level-node').first().waitFor();
  await assertMinimumTargetSize(page,
    '.topbar button, .current-lesson-button, .level-node-wrap', `Map shell at ${viewport.width}×${viewport.height}`);
  await page.locator('#adventure-menu-button').click();
  await assertMinimumTargetSize(page, '#course-drawer button, #course-drawer summary',
    `Course drawer at ${viewport.width}×${viewport.height}`);
  await page.locator('.course-lesson').first().click();
  await page.locator('#detail-view').waitFor({ state: 'visible' });
  await assertMinimumTargetSize(page, '#detail-view button, #detail-view summary',
    `Lesson detail at ${viewport.width}×${viewport.height}`);
  await page.locator('#back-btn').click();
}

function addCompletedCoverFixture(fixtureRoot, level) {
  const recordingDir = path.join(fixtureRoot, 'recordings', 'alice', '04', level.chapter, level.level);
  const demoDir = path.join(fixtureRoot, 'demo', '04', level.chapter, level.level);
  fs.mkdirSync(recordingDir, { recursive: true });
  fs.mkdirSync(demoDir, { recursive: true });
  fs.writeFileSync(path.join(recordingDir, 'performance.webm'), 'temporary scanner presence marker');
  fs.writeFileSync(path.join(demoDir, 'demo.mp4'), 'temporary demo presence marker');
  fs.copyFileSync(path.resolve(__dirname, '../static/worlds/01-wants-requests.jpg'), path.join(demoDir, 'thumb.jpg'));
}

async function assertCompletedCoverAndStar(page, fixtureRoot, level, output) {
  addCompletedCoverFixture(fixtureRoot, level);
  await page.reload();
  const completed = page.locator('.level-node--completed').first();
  await completed.locator('.level-node__cover').waitFor();
  await page.waitForFunction(key => {
    const cover = document.querySelector(`.level-node-wrap[data-level-key="${key}"] .level-node__cover`);
    return Boolean(cover?.style.backgroundImage.includes('/thumb/'));
  }, `${level.chapter}/${level.level}`);
  assert.equal(await completed.locator('.level-node__cover').count(), 1,
    'A completed demo lesson retains one rendered cover');
  assert.equal(await completed.locator('.level-node__marker--star').count(), 1,
    'A completed demo lesson has exactly one completion star');
  const composition = await completed.evaluate(node => {
    const cover = node.querySelector('.level-node__cover').getBoundingClientRect();
    const star = node.querySelector('.level-node__marker--star').getBoundingClientRect();
    return { backgroundImage: node.querySelector('.level-node__cover').style.backgroundImage,
      corner: star.left + star.width / 2 > cover.left + cover.width / 2 && star.top + star.height / 2 > cover.top + cover.height / 2 };
  });
  assert.match(composition.backgroundImage, /\/thumb\//, 'Cover is served from the thumbnail route');
  assert.equal(composition.corner, true, 'The single completion star sits at the cover corner');
  await screenshot(page, output, 'completed-cover-star-1440x960');
}

async function assertFailedSaveDoesNotCelebrate(page, consoleErrors, output) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.unroute('**/upload/**');
  await page.route('**/upload/**/performance', route => route.fulfill({ status: 500, json: { error: 'QA failed performance save' } }));
  await page.locator('[data-current-lesson]').click();
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await page.locator('.record-preview').waitFor();
  await page.locator('.record-btn').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  await page.locator('.record-playback').waitFor();
  await page.getByRole('button', { name: 'Save', exact: false }).click();
  await page.getByRole('button', { name: 'Failed — retry', exact: true }).waitFor();
  assert.equal(await page.locator('.level-node-wrap--just-completed, .chapter-world--just-completed').count(), 0,
    'A failed save must not render a completion celebration before leaving detail');
  await page.locator('#back-btn').click();
  await page.waitForTimeout(50);
  assert.equal(await page.locator('.level-node-wrap--just-completed, .chapter-world--just-completed').count(), 0,
    'A failed save must not queue a celebration for the return to the map');
  assert.equal(await page.locator('#star-count').innerText(), '0', 'A failed save must not advance real progress');
  assert.equal(consoleErrors.filter(message => /^Save failed /.test(message.text)).length, 1,
    'The expected failed-save diagnostic is recorded exactly once');
  await screenshot(page, output, 'failed-save-no-celebration-1440x960');
  await page.unroute('**/upload/**/performance');
}

async function accountPopupStaysScrollable(page, url) {
  const admin = await page.context().newPage();
  try {
    await admin.setViewportSize({ width: 800, height: 600 });
    await admin.goto(`${url}/login`);
    await admin.locator('[name=username]').fill('admin');
    await admin.locator('[name=password]').fill('admin123');
    await admin.locator('button[type=submit]').click();
    await admin.locator('.level-node').first().waitFor();
    await admin.locator('#user-menu-trigger').click();
    await admin.locator('#admin-btn').click();
    await admin.locator('.del-user').waitFor();
    for (const username of ['qa-user-1', 'qa-user-2', 'qa-user-3', 'qa-user-4', 'qa-user-5']) {
      await admin.locator('#admin-username').fill(username);
      await admin.locator('#admin-password').fill('qa-only-password');
      await admin.locator('#admin-add-btn').click();
      await admin.locator('.admin-user-list').getByText(username, { exact: true }).waitFor();
    }
    const popup = await admin.locator('#user-menu-popup').evaluate(el => {
      const style = getComputedStyle(el);
      return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, overflowY: style.overflowY };
    });
    assert.ok(popup.scrollHeight > popup.clientHeight, 'Five-user account popup scrolls internally');
    assert.equal(popup.overflowY, 'auto');
    await admin.locator('#user-menu-popup').evaluate(el => { el.scrollTop = el.scrollHeight; });
    const logout = await admin.locator('#logout-btn').evaluate(el => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, viewportHeight: window.innerHeight };
    });
    assert.ok(logout.top >= 0 && logout.bottom <= logout.viewportHeight, 'Logout remains fully visible after popup scroll');
  } finally {
    await admin.close();
  }
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
    // Initial checks intercept all uploads. Performance-save scenarios later
    // write only generated recordings inside this fixture's temporary media root.
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

    if (focus === 'route') {
      feedbackRegressions.completeLessons(fixtureRoot, library[0].levels.slice(0, 2));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#star-count').textContent === '2');
      await feedbackRegressions.route(page, output);
      assert.deepEqual(errors, []);
      console.log('PASS focused regression: route');
      return;
    }

    if (focus === 'navigation-celebration') {
      await page.unroute('**/upload/**');
      await feedbackRegressions.navigationCelebration(page, fixtureRoot, library, 0, output);
      assert.deepEqual(errors, []);
      console.log('PASS focused regression: navigation-celebration');
      return;
    }

    if (focus === 'cancel-celebration') {
      await page.unroute('**/upload/**');
      await feedbackRegressions.cancelCelebration(page, fixtureRoot, library[0], output);
      assert.deepEqual(errors, []);
      console.log('PASS focused regression: cancel-celebration');
      return;
    }

    if (focus === 'accessible-state') {
      feedbackRegressions.completeLessons(fixtureRoot, library[0].levels.slice(0, 2));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('#star-count').textContent === '2');
      await feedbackRegressions.accessibleStates(page, library);
      assert.deepEqual(errors, []);
      console.log('PASS focused regression: accessible-state');
      return;
    }

    if (focus === 'evidence') {
      await assertFailedSaveDoesNotCelebrate(page, consoleErrors, output);
      await assertCompletedCoverAndStar(page, fixtureRoot, library[0].levels[0], output);
      assert.deepEqual(errors, []);
      console.log('PASS focused regression: evidence');
      return;
    }

    if (focus === 'account') {
      for (const viewport of [{ width: 1440, height: 960 }, { width: 800, height: 600 }, { width: 390, height: 844 }]) {
        await shellGeometry(page, viewport);
        await assertBrowserTargetDimensions(page, viewport);
      }
      await accountPopupStaysScrollable(page, url);
      console.log('PASS focused regression: account');
      return;
    }

    if (process.env.TOY_QA_FINAL_FIX && process.env.TOY_QA_FINAL_FIX !== 'electron') {
      await finalFixes[process.env.TOY_QA_FINAL_FIX](page, url, output);
      console.log(`PASS focused regression: ${process.env.TOY_QA_FINAL_FIX}`);
      return;
    }
    if (focus !== 'electron' && process.env.TOY_QA_FINAL_FIX !== 'electron') {
      await finalFixes.selection(page);
      await finalFixes.account(page, url, output);
      await finalFixes.refresh(page, url);
      results.push({ drawerSelection: 'drawer, next, previous, direct map', account: '800x600 and 390x844 controls >=44px, Nunito >=14px' });

      for (const [width, height] of [[1440, 960], [800, 600], [390, 844], [844, 390]]) {
        await shellGeometry(page, { width, height });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(mobile => [...document.querySelectorAll('.bg-layer__slide')]
          .every(e => e.style.backgroundImage.includes(mobile ? '-mobile.webp' : '-desktop.webp')), width < 768);
        assert.equal(await page.locator('.chapter-world').count(), 10);
        assert.equal(await page.locator('.level-node').count(), 30);
        assert.deepEqual(await page.locator('.chapter-world').evaluateAll(chapters => chapters.map(c => c.querySelectorAll('.level-node').length)), Array(10).fill(3));
        await assertMinimumTargetSize(page, '.topbar button, .current-lesson-button, .level-node-wrap',
          `Map shell at ${width}×${height}`);
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
        await assertMinimumTargetSize(page, '#course-drawer button, #course-drawer summary',
          `Course drawer at ${width}×${height}`);
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
        await assertMinimumTargetSize(page, '#detail-view button, #detail-view summary',
          `Lesson detail at ${width}×${height}`);
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
      assert.deepEqual(await page.locator('.level-node--completed').evaluateAll(nodes => nodes.map(node => node.querySelectorAll('.level-node__marker--star').length)), [1, 1]);
      assert.equal(await page.locator('.level-node--current .level-node__marker--star').count(), 0);
      assert.equal(await page.locator('.level-node--current .level-node__marker--locator').count(), 1);
      assert.equal(await page.locator('.level-node--locked').first().locator('.level-node__marker--lock').count(), 1);
      await feedbackRegressions.route(page, output);
      await feedbackRegressions.accessibleStates(page, library);
      assert.match(await page.locator('.chapter-heading').first().innerText(), /★ 2\/3/);
      await page.locator('#adventure-menu-button').click();
      assert.match(await page.locator('#course-drawer-progress').innerText(), /2 \/ 30 completed/);
      assert.equal(await page.locator('.course-chapter__count').first().innerText(), '2 / 3');
      await page.keyboard.press('Escape');
      results.push({ realProgress: '0/30 -> 2/30', current: 'lesson 3' });

      // A saved performance celebrates once after the detail closes. The
      // fixture already has the first two lessons complete, so this save also
      // completes the first chapter.
      if (focus === 'celebration') page.setDefaultTimeout(5000);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.unroute('**/upload/**');
      await page.locator('[data-current-lesson]').click();
      await page.getByRole('button', { name: 'Start recording', exact: true }).click();
      await page.locator('.record-preview').waitFor();
      await page.locator('.record-btn').click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
      await page.locator('.record-playback').waitFor();
      await page.getByRole('button', { name: 'Save', exact: false }).click();
      await page.getByRole('button', { name: 'Record again', exact: true }).waitFor();
      await page.evaluate(() => {
        window.qaCelebrationEnds = new Promise(resolve => {
          const ended = new Set();
          document.addEventListener('animationend', event => {
            if (event.target.matches('.level-node__marker--star, .chapter-heading')) ended.add(event.target);
            if (ended.size === 2) resolve();
          }, { capture: true });
        });
      });
      await page.locator('#back-btn').click();
      await page.locator('.level-node-wrap--just-completed').waitFor();
      await page.locator('.chapter-world--just-completed').waitFor();
      assert.equal(await page.locator('.level-node-wrap--just-completed .level-node__marker--star').count(), 1);
      await withTimeout(page.evaluate(() => window.qaCelebrationEnds), 'lesson and chapter animation completion');
      assert.equal(await page.locator('.level-node-wrap--just-completed').count(), 0);
      assert.equal(await page.locator('.chapter-world--just-completed').count(), 0);
      assert.equal(await page.locator('.level-node--completed .level-node__marker--star').count(), 3);
      await page.reload();
      await page.locator('.level-node').first().waitFor();
      assert.equal(await page.locator('.level-node-wrap--just-completed').count(), 0);
      assert.equal(await page.locator('.chapter-world--just-completed').count(), 0);
      // A re-record saves successfully but does not create a false-to-true
      // completion transition, so neither celebration replays.
      await page.locator('.level-node--completed').nth(2).click();
      await page.getByRole('button', { name: 'Record again', exact: true }).click();
      await page.locator('.record-preview').waitFor();
      await page.locator('.record-btn').click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
      await page.locator('.record-playback').waitFor();
      await page.getByRole('button', { name: 'Save', exact: false }).click();
      await page.getByRole('button', { name: 'Record again', exact: true }).waitFor();
      await page.locator('#back-btn').click();
      await page.waitForTimeout(50);
      assert.equal(await page.locator('.level-node-wrap--just-completed').count(), 0);
      assert.equal(await page.locator('.chapter-world--just-completed').count(), 0);

      // A camera error falls back to a file upload, which is still a
      // performance save and earns the same one-shot celebration.
      await page.locator('[data-current-lesson]').click();
      await page.evaluate(() => {
        window.qaGetUserMedia = navigator.mediaDevices.getUserMedia;
        navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('camera unavailable', 'NotFoundError'); };
        window.showOpenFilePicker = async () => [{ getFile: async () => new File(['QA'], 'performance.webm', { type: 'video/webm' }) }];
      });
      await page.getByRole('button', { name: 'Start recording', exact: true }).click();
      await page.getByRole('button', { name: 'Choose file', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Choose file', exact: true }).click();
      await page.getByRole('button', { name: 'Record again', exact: true }).waitFor();
      await page.evaluate(() => { navigator.mediaDevices.getUserMedia = window.qaGetUserMedia; });
      await page.locator('#back-btn').click();
      await page.locator('.level-node-wrap--just-completed').waitFor();
      await page.locator('.level-node-wrap--just-completed .level-node__marker--star').waitFor();
      await page.waitForTimeout(700);

      // The user can return to the map while a save is in flight. Once it
      // resolves, the refreshed visible map must still celebrate once.
      await page.locator('[data-current-lesson]').click();
      await page.getByRole('button', { name: 'Start recording', exact: true }).click();
      await page.locator('.record-preview').waitFor();
      await page.locator('.record-btn').click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
      await page.locator('.record-playback').waitFor();
      const inFlightKey = await page.locator('[data-current-lesson]').getAttribute('data-current-lesson');
      let inFlightSaved = false;
      await page.route('**/api/library', async route => {
        const response = await route.fetch();
        const data = await response.json();
        if (inFlightSaved) {
          const [chapterName, levelName] = inFlightKey.split('/');
          const level = data.find(chapter => chapter.name === chapterName).levels.find(item => item.level === levelName);
          level.has_performance = true;
        }
        await route.fulfill({ json: data });
      });
      let heldPerformanceUpload;
      const performanceUploadStarted = new Promise(resolve => {
        heldPerformanceUpload = { resolve, route: null };
      });
      await page.route('**/upload/**/performance', route => {
        heldPerformanceUpload.route = route;
        heldPerformanceUpload.resolve();
      });
      await page.getByRole('button', { name: 'Save', exact: false }).click();
      await withTimeout(performanceUploadStarted, 'performance upload request');
      await page.locator('#back-btn').click();
      inFlightSaved = true;
      await heldPerformanceUpload.route.fulfill({ json: { ok: true } });
      await page.locator('.level-node-wrap--just-completed').waitFor();
      assert.equal(await page.locator('.level-node-wrap--just-completed .level-node__marker--star').count(), 1);
      await page.unroute('**/upload/**/performance');
      await page.unroute('**/api/library');
      results.push({ performanceSave: 'one-shot lesson and chapter celebration', refresh: 'no replay' });

      if (focus === 'celebration') {
        assert.deepEqual(errors, []);
        const unexpected = unexpectedFailures(failedResponses, consoleErrors);
        assert.deepEqual(unexpected.responses, [], 'Unexpected failed HTTP responses');
        assert.deepEqual(unexpected.consoleErrors, [], 'Unexpected browser console errors');
        console.log('PASS focused regression: celebration');
        return;
      }

      await feedbackRegressions.navigationCelebration(page, fixtureRoot, library, 2, output);
      await feedbackRegressions.cancelCelebration(page, fixtureRoot, library[3], output);
      results.push({ navigationCelebration: 'Save A -> Next B -> Back celebrates A and its chapter once' });
      results.push({ cancellation: 'lesson and chapter classes clear on view teardown without replay' });

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
      await assertMinimumTargetSize(native, '.topbar button, .level-node-wrap', 'Electron map shell');
      await native.locator('#user-menu-trigger').click();
      assert.equal(await native.locator('#user-menu-popup').isVisible(), true);
      await assertMinimumTargetSize(native, '#user-menu-popup button', 'Electron account menu');
      await native.locator('#user-menu-trigger').click();
      assert.equal(await native.locator('#user-menu-popup').isVisible(), false);
      await native.locator('#adventure-menu-button').click();
      await assertMinimumTargetSize(native, '#course-drawer button, #course-drawer summary', 'Electron course drawer');
      await native.locator('#course-drawer-close').click();
      await finalFixes.electronDrawer(native, electron);
      await nativeScreenshot(electron, output, 'electron-map-800x600');
      await native.locator('.level-node').nth(2).click();
      await native.locator('#detail-view').waitFor({ state: 'visible' });
      await native.waitForTimeout(300);
      await noOverflow(native);
      await assertMinimumTargetSize(native, '#detail-view button, #detail-view summary', 'Electron lesson detail');
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
