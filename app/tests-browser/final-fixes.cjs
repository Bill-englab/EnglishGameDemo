const assert = require('node:assert/strict');
const path = require('node:path');

async function selectedLesson(page, key) {
  assert.deepEqual(await page.locator('.course-lesson[data-selected="true"]').evaluateAll(
    buttons => buttons.map(button => button.dataset.lessonKey)), [key]);
  assert.equal(await page.locator('#star-count').innerText(), '0');
  assert.equal(await page.locator('.course-lesson[aria-current="step"]').getAttribute('data-lesson-key'),
    await page.locator('.course-lesson').first().getAttribute('data-lesson-key'));
}

async function selection(page) {
  const failures = [];
  const check = async (key, pathway) => {
    try { await selectedLesson(page, key); }
    catch (error) { error.message = `${pathway}: ${error.message}`; failures.push(error); }
  };
  await page.locator('#adventure-menu-button').click();
  const keys = await page.locator('.course-lesson').evaluateAll(buttons => buttons.map(b => b.dataset.lessonKey));
  await page.locator('.course-lesson').first().click();
  await check(keys[0], 'drawer click');
  await page.locator('#detail-nav button').last().click();
  await check(keys[1], 'Next');
  await page.locator('#detail-nav button').last().click();
  await page.locator('#detail-nav button').first().click();
  await check(keys[1], 'Previous');
  await page.locator('#back-btn').click();
  await page.locator('.level-node').nth(2).click();
  await check(keys[2], 'direct map');
  await page.locator('#back-btn').click();
  await page.locator('#adventure-menu-button').click();
  assert.equal(await page.locator('.course-lesson[data-selected="true"]').isVisible(), true);
  await page.keyboard.press('Escape');
  if (failures.length) throw new AggregateError(failures, 'Drawer selection navigation regressions');
}

async function account(page, url, output) {
  const admin = await page.context().newPage();
  try {
    await admin.goto(`${url}/login`);
    await admin.locator('[name=username]').fill('admin');
    await admin.locator('[name=password]').fill('admin123'); // isolated fixture default only
    await admin.locator('button[type=submit]').click();
    await admin.locator('.level-node').first().waitFor();
    for (const viewport of [{ width: 800, height: 600 }, { width: 390, height: 844 }]) {
      await admin.setViewportSize(viewport);
      await admin.locator('#user-menu-trigger').click();
      await admin.locator('#admin-btn').click();
      await admin.locator('.del-user').waitFor();
      await admin.waitForLoadState('networkidle');
      await admin.evaluate(() => document.fonts.ready);
      const controls = await admin.locator('#user-menu-popup button, #user-menu-popup input').evaluateAll(elements =>
        elements.filter(e => e.getClientRects().length).map(e => {
          const rect = e.getBoundingClientRect(), style = getComputedStyle(e);
          return { name: e.id || e.className, width: rect.width, height: rect.height,
            font: parseFloat(style.fontSize), family: style.fontFamily, right: rect.right, left: rect.left };
        }));
      assert.ok(controls.length >= 7, 'Actual admin account controls are rendered');
      assert.deepEqual(controls.filter(c => c.width < 44 || c.height < 44 || c.font < 14 || !c.family.includes('Nunito') || c.left < 0 || c.right > viewport.width), [],
        'Account controls must use Nunito >=14px and reachable 44px targets');
      assert.ok(await admin.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.admin-user-list li')).fontSize) >= 14));
      if (output) await admin.screenshot({ path: path.join(output, `account-${viewport.width}x${viewport.height}.png`) });
      await admin.locator('#user-menu-trigger').click();
      // Keep the panel closed for the next viewport's explicit open action.
      await admin.locator('#user-menu-trigger').click();
      await admin.locator('#admin-btn').click();
      await admin.locator('#user-menu-trigger').click();
    }
  } finally {
    await admin.close();
    // The shared context used the isolated admin login; restore the regular fixture user.
    await page.goto(`${url}/login`);
    await page.locator('[name=username]').fill('alice');
    await page.locator('[name=password]').fill('qa-only-password');
    await page.locator('button[type=submit]').click();
    await page.locator('.level-node').first().waitFor();
  }
}

async function refresh(page, url) {
  const errors = [];
  const check = await page.context().newPage();
  check.on('pageerror', error => errors.push(error.message));
  try {
    await check.goto(url);
    await check.locator('.level-node').first().waitFor();
    await check.evaluate(() => { window.qaOriginalNodes = [...document.querySelectorAll('.level-node')]; });
    await check.route('**/api/library', route => route.fulfill({ status: 200, body: 'deliberately invalid QA JSON' }));
    // Exercise the real refresh event handler after a successful first load.
    await check.locator('#map-retry').dispatchEvent('click');
    await check.locator('#map-error').waitFor({ state: 'visible' });
    assert.equal(await check.locator('#map-scroll').isVisible(), true);
    assert.equal(await check.locator('#current-lesson-button').isVisible(), false);
    assert.equal(await check.evaluate(() => window.qaOriginalNodes.every((node, index) =>
      node === document.querySelectorAll('.level-node')[index])), true);
    await check.locator('.level-node').nth(1).click();
    assert.equal(await check.locator('#detail-view').isVisible(), true);
    await check.locator('#back-btn').click();
    await check.unroute('**/api/library');
    await check.locator('#map-retry').click();
    await check.locator('#map-error').waitFor({ state: 'hidden' });
    assert.equal(await check.locator('#current-lesson-button').isVisible(), true);
    assert.deepEqual(errors, []);
  } finally { await check.close(); }
}

async function electronDrawer(native, electron) {
  for (const selector of ['#course-drawer-close', '#drawer-backdrop']) {
    await native.locator('#adventure-menu-button').click();
    const regions = await native.locator('#course-drawer, #drawer-backdrop').evaluateAll(
      elements => elements.map(e => getComputedStyle(e).webkitAppRegion));
    assert.deepEqual(regions, ['no-drag', 'no-drag'], 'Modal surfaces must exclude the underlying native drag region');
    const point = await native.evaluate(selector => {
      const topbar = document.querySelector('.topbar').getBoundingClientRect();
      const target = document.querySelector(selector).getBoundingClientRect();
      return selector === '#course-drawer-close'
        ? { x: Math.round(target.left + target.width / 2),
          y: Math.floor((Math.max(target.top, topbar.top) + Math.min(target.bottom, topbar.bottom)) / 2) }
        : { x: Math.round(topbar.left + topbar.width / 2), y: Math.round(topbar.top + topbar.height / 2) };
    }, selector);
    assert.equal(await native.evaluate(({ selector, point }) => document.elementFromPoint(point.x, point.y)?.closest(selector) !== null,
      { selector, point }), true, 'Click point hits the requested modal surface');
    assert.equal(await native.evaluate(point => {
      const r = document.querySelector('.topbar').getBoundingClientRect();
      return point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom;
    }, point), true, 'Renderer input exercises the overlap with the native draggable topbar');
    await electron.evaluate(({ BrowserWindow }, point) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents;
      contents.sendInputEvent({ type: 'mouseMove', ...point });
      contents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
      contents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
    }, point);
    await native.locator('#course-drawer').waitFor({ state: 'hidden' });
    assert.equal(await native.locator('#map-view').evaluate(e => e.inert), false);
    assert.equal(await native.locator('#adventure-menu-button').evaluate(e => e === document.activeElement), true);
    assert.equal(await electron.evaluate(() => global.qaWindow.isVisible()), false);
  }
}

module.exports = { selection, account, refresh, electronDrawer };
