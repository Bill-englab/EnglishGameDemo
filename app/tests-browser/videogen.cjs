// Run only against tools/preview_stone_map.py. No uploads or real accounts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const url = new URL('/', process.env.STONE_QA_URL).href;
const output = process.env.STONE_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'videogen-qa-'));
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.copiedPrompts = [];
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copiedPrompts.push(text); } } });
    });
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.stone-lesson').length === 30);
    const library = await (await page.request.get(new URL('/api/library', url).href)).json();
    const lessons = library.flatMap(ch => ch.levels.map(lv => ({ ...lv, chapter: ch.name })));
    const expected = [];
    for (const lesson of lessons) {
      const response = await page.request.get(new URL(`/api/prompts/${lesson.chapter}/${lesson.level}`, url).href);
      assert.equal(response.status(), 200);
      const prompts = await response.json();
      for (const part of ['a', 'b', 'c']) {
        const source = fs.readFileSync(path.join(__dirname, '../../prompts/04', lesson.chapter, lesson.level, `${part}.txt`), 'utf8');
        const clean = source.split('\n')[0] + '\n\nVIDEO AND SOUND\n' + source.split('\n\nVIDEO AND SOUND\n')[1];
        assert.equal(prompts[part], clean, `Preview serves clean canonical ${lesson.chapter}/${lesson.level}/${part}`);
        assert.doesNotMatch(prompts[part], /Production prompt draft|Source SHA256:|Content revision:|The source\/revision above/);
        expected.push(clean);
      }
    }
    await page.locator('.stone-lesson').first().click();
    for (let index = 0; index < lessons.length; index++) {
      if (index) await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.locator('#videogen-open').click();
      await page.waitForFunction(() => document.querySelectorAll('#detail-prompts .prompt-copy-btn').length === 3);
      assert.doesNotMatch(await page.locator('#detail-prompts').textContent(), /Production prompt draft|Source SHA256:|Content revision:|The source\/revision above/);
      assert.equal(await page.locator('#detail-title').innerText(), lessons[index].title);
      assert.equal(await page.locator('#detail-videogen').getAttribute('open'), '');
      for (let part = 0; part < 3; part++) await page.locator('#detail-prompts .prompt-copy-btn').nth(part).click();
      if (!index) await page.screenshot({ path: path.join(output, 'videogen-desktop.png') });
    }
    assert.deepEqual(await page.evaluate(() => window.copiedPrompts), expected, 'All 90 Copy actions preserve the canonical prompt text');

    await page.locator('#back-btn').click();
    await page.route('**/api/prompts/**', route => route.fulfill({ status: 500, json: { error: 'fixture' } }));
    await page.locator('.stone-lesson').first().click();
    await page.locator('#videogen-open').click();
    await page.getByRole('button', { name: 'Retry prompts', exact: true }).waitFor();
    assert.match(await page.locator('#detail-prompts').innerText(), /Could not load prompts/);
    await page.unroute('**/api/prompts/**');
    await page.getByRole('button', { name: 'Retry prompts', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('#detail-prompts .prompt-copy-btn').length === 3);
    await page.locator('#back-btn').click();
    await page.route('**/api/prompts/**', route => route.fulfill({ json: { a: '', b: '', c: '' } }));
    await page.locator('.stone-lesson').first().click();
    await page.locator('#videogen-open').click();
    await page.getByText('No prompts available for this lesson yet.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Retry prompts', exact: true }).count(), 0);
    await page.unroute('**/api/prompts/**');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#back-btn').click();
    await page.locator('.stone-lesson').first().click();
    await page.getByRole('tab', { name: 'Watch & Learn', exact: true }).click();
    await page.locator('#videogen-open').click();
    await page.waitForFunction(() => document.querySelectorAll('#detail-prompts .prompt-copy-btn').length === 3);
    assert.equal(await page.locator('#detail-videogen > summary').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(output, 'videogen-mobile.png') });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ lessons: lessons.length, canonicalPrompts: expected.length, copyActions: 90, retry: true, emptyState: true, desktopAndMobile: true, output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
