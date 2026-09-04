// Optional integration regression; no repository dependencies are installed.
// Requires existing Playwright + Microsoft Edge and Python with app requirements.
// NODE_PATH=<existing Playwright runtime> node tests-browser/detail-upload.cjs
// DETAIL_QA_PYTHON may select an existing Python executable (default: python).
// Starts its own ephemeral-port Flask fixture with temporary users/media, never
// runs app.py's startup optimizer, and intercepts every upload without writing it.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const fixtureProgram = `
import json, sys
from pathlib import Path
from werkzeug.security import generate_password_hash
from werkzeug.serving import make_server
import app as m
root = Path(sys.argv[1])
m.USERS_FILE = root / 'users.json'
m.USERS_FILE.write_text(json.dumps({'alice': generate_password_hash('qa-only-password')}))
m.PROFILES_ROOT = root / 'profiles'
m.DEMO_ROOT = root / 'demo'
m.RECORDINGS_ROOT = root / 'recordings'
m.PROMPTS_ROOT = root / 'prompts'
server = make_server('127.0.0.1', 0, m.app, threaded=True)
print('QA_URL=http://127.0.0.1:' + str(server.server_port), flush=True)
server.serve_forever()
`;

(async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'english-detail-upload-'));
  const server = spawn(process.env.DETAIL_QA_PYTHON || 'python', ['-u', '-c', fixtureProgram, fixtureRoot],
    { cwd: path.resolve(__dirname, '..'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    const fixtureURL = await new Promise((resolve, reject) => {
      let output = '', diagnostics = '';
      const timer = setTimeout(() => reject(new Error('Isolated Flask fixture did not become ready')), 15000);
      const fail = error => { clearTimeout(timer); reject(error); };
      server.once('error', fail);
      server.once('exit', code => fail(new Error(`Fixture exited (${code}): ${diagnostics}`)));
      server.stderr.on('data', data => { diagnostics += data; });
      server.stdout.on('data', data => {
        output += data;
        const match = output.match(/QA_URL=(http:\/\/127\.0\.0\.1:\d+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    browser = await chromium.launch({ channel: 'msedge', headless: true,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(fixtureURL);
    await page.locator('[name=username]').fill('alice');
    await page.locator('[name=password]').fill('qa-only-password');
    await page.locator('button[type=submit]').click();
    await page.locator('.level-node-wrap').first().waitFor();

    let uploaded = false;
    await page.route('**/api/library', async route => {
      const response = await route.fetch();
      const library = await response.json();
      library[0].levels[0].has_demo = uploaded;
      library[0].levels[0].has_performance = false;
      await route.fulfill({ json: library });
    });
    // The test verifies panel refresh/ownership, not video decoding.
    await page.route('**/video/**/demo?*', route => route.fulfill({ status: 204 }));

    const results = [];
    for (const phase of ['capture', 'unsaved playback']) {
      uploaded = false;
      await page.reload();
      await page.locator('.level-node-wrap').first().click();
      let finishUpload;
      let uploadStarted;
      const pending = new Promise(resolve => { uploadStarted = resolve; });
      await page.route('**/upload/**/demo', route => {
        finishUpload = () => { uploaded = true; return route.fulfill({ json: { ok: true } }); };
        uploadStarted();
      });
      await page.evaluate(() => {
        window.showOpenFilePicker = async () => [{ getFile: async () =>
          new File(['intercepted QA file'], 'demo.webm', { type: 'video/webm' }) }];
      });
      await page.getByRole('button', { name: 'Add demo', exact: true }).click();
      await pending;
      await page.getByRole('button', { name: 'Start recording', exact: true }).click();
      await page.locator('.record-preview').waitFor();
      await page.locator('.record-btn').click();
      if (phase === 'unsaved playback') {
        await page.waitForTimeout(250);
        await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
        await page.locator('.record-playback').waitFor();
      }
      await page.evaluate(() => {
        window.ownedPerformance = document.querySelector('#detail-perf video');
        window.ownedSource = window.ownedPerformance.srcObject || window.ownedPerformance.src;
      });
      await finishUpload();
      await page.getByRole('button', { name: 'Replace', exact: true }).waitFor();
      const retained = await page.evaluate(() => {
        const current = document.querySelector('#detail-perf video');
        return current === window.ownedPerformance &&
          (current.srcObject || current.src) === window.ownedSource;
      });
      const active = phase === 'capture'
        ? await page.evaluate(() => Boolean(window.ownedPerformance.srcObject?.getTracks().every(t => t.readyState === 'live')))
        : await page.getByRole('button', { name: 'Save', exact: false }).isVisible();
      results.push({ phase, retained, active });
      await page.unroute('**/upload/**/demo');
    }
    console.log(JSON.stringify(results));
    assert.deepEqual(results, [
      { phase: 'capture', retained: true, active: true },
      { phase: 'unsaved playback', retained: true, active: true },
    ]);
  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) await new Promise(resolve => {
      server.once('exit', resolve);
      if (!server.kill()) resolve();
    });
    // This is the exact mkdtemp-owned directory, never an application media root.
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
