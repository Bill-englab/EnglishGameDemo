// Focused regression flows run within modern-toy-ui's isolated server and browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function completeLessons(fixtureRoot, lessons) {
  for (const level of lessons) {
    const directory = path.join(fixtureRoot, 'recordings', 'alice', '04', level.chapter, level.level);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'performance.webm'), 'temporary scanner presence marker');
  }
}

async function route(page, output) {
  const originalViewport = page.viewportSize();
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(() => document.querySelector('#path-svg .trail--current') &&
      Number(document.querySelector('#path-svg').getAttribute('width')) === document.querySelector('#map-scroll').clientWidth);
    const deviations = await page.evaluate(() => {
      const surfaces = [...document.querySelectorAll('#path-svg .trail--surface')];
      return [...document.querySelectorAll('#path-svg .trail__progress, #path-svg .trail--current')].map(overlay => {
        let maximum = 0;
        // Endpoint-only tests miss a straight chord drifting out of its curved road.
        for (let sample = 1; sample < 20; sample++) {
          const point = overlay.getPointAtLength(overlay.getTotalLength() * sample / 20);
          const nearest = Math.min(...surfaces.map(surface => {
            let low = 0, high = surface.getTotalLength();
            for (let step = 0; step < 24; step++) {
              const middle = (low + high) / 2;
              if (surface.getPointAtLength(middle).y < point.y) low = middle;
              else high = middle;
            }
            const base = surface.getPointAtLength((low + high) / 2);
            return Math.hypot(base.x - point.x, base.y - point.y);
          }));
          maximum = Math.max(maximum, nearest);
        }
        return { stroke: overlay.classList.contains('trail--current') ? 'teal' : 'gold', maximum };
      });
    });
    assert.deepEqual(deviations.map(item => item.stroke), ['gold', 'teal']);
    if (output) await page.screenshot({ path: path.join(output, `partial-route-${viewport.width}x${viewport.height}.png`) });
    assert.ok(deviations.every(item => item.maximum < 1),
      `Partial strokes leave the ivory route at ${viewport.width}px: ${JSON.stringify(deviations)}`);
    console.log(`PASS route alignment ${viewport.width}px: ${JSON.stringify(deviations)}`);
  }
  await page.setViewportSize(originalViewport);
}

const celebrationClasses = '.level-node-wrap--just-completed, .chapter-world--just-completed';
const lessonSelector = level => `.level-node-wrap[data-level-key="${level.chapter}/${level.level}"]`;

async function saveChapterFinalLesson(page, fixtureRoot, chapter) {
  completeLessons(fixtureRoot, chapter.levels.slice(0, 2));
  await page.reload();
  await page.locator('.level-node').first().waitFor();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const level = chapter.levels[2];
  await page.locator(lessonSelector(level)).click();
  await page.getByRole('button', { name: 'Start recording', exact: true }).click();
  await page.locator('.record-preview').waitFor();
  await page.locator('.record-btn').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
  await page.locator('.record-playback').waitFor();
  await page.getByRole('button', { name: 'Save', exact: false }).click();
  await page.getByRole('button', { name: 'Record again', exact: true }).waitFor();
  await page.evaluate(() => {
    window.qaFeedbackStarts = [];
    document.addEventListener('animationstart', event => {
      if (['completedStarSettle', 'chapterTitleGlow'].includes(event.animationName)) {
        window.qaFeedbackStarts.push(event.animationName);
      }
    });
  });
  return level;
}

async function navigationCelebration(page, fixtureRoot, library, chapterIndex, output) {
  const level = await saveChapterFinalLesson(page, fixtureRoot, library[chapterIndex]);
  await page.locator('#detail-nav button').last().click();
  assert.equal(await page.locator('#detail-title').innerText(), library[chapterIndex + 1].levels[0].title);
  await page.locator('#back-btn').click();
  assert.deepEqual(await page.locator('.level-node-wrap--just-completed').evaluateAll(nodes => nodes.map(node => node.dataset.levelKey)),
    [`${level.chapter}/${level.level}`], 'Save A -> Next B -> Back must celebrate the saved lesson A');
  assert.deepEqual(await page.locator('.chapter-world--just-completed').evaluateAll(nodes => nodes.map(node => node.dataset.chapter)),
    [level.chapter], 'Returning from B must also consume A\'s pending chapter celebration');
  if (output) await page.screenshot({ path: path.join(output, 'save-a-next-b-back.png') });
  await page.waitForFunction(selector => !document.querySelector(selector), celebrationClasses);
  assert.deepEqual((await page.evaluate(() => window.qaFeedbackStarts)).sort(), ['chapterTitleGlow', 'completedStarSettle']);
  await page.locator(lessonSelector(level)).click();
  await page.locator('#back-btn').click();
  assert.equal(await page.locator(celebrationClasses).count(), 0, 'Consumed celebrations do not replay on a later Back');
  await page.reload();
  await page.locator('.level-node').first().waitFor();
  assert.equal(await page.locator(celebrationClasses).count(), 0, 'Refresh resets pending celebrations');
}

async function cancelCelebration(page, fixtureRoot, chapter, output) {
  const level = await saveChapterFinalLesson(page, fixtureRoot, chapter);
  // Give the navigation action a deterministic window within real CSS animations.
  await page.addStyleTag({ content: `
    .level-node-wrap--just-completed .level-node__marker--star,
    .chapter-world--just-completed .chapter-heading { animation-duration: 5s !important; }
  ` });
  await page.evaluate(() => {
    window.qaFeedbackCancels = [];
    document.addEventListener('animationcancel', event => {
      if (['completedStarSettle', 'chapterTitleGlow'].includes(event.animationName)) {
        window.qaFeedbackCancels.push(event.animationName);
      }
    });
  });
  await page.locator('#back-btn').click();
  await page.waitForFunction(() => window.qaFeedbackStarts.length === 2);
  await page.locator(lessonSelector(level)).click();
  await page.waitForFunction(() => window.qaFeedbackCancels.length === 2);
  assert.deepEqual(await page.evaluate(() => ({
    lesson: document.querySelectorAll('.level-node-wrap--just-completed').length,
    chapter: document.querySelectorAll('.chapter-world--just-completed').length,
  })), { lesson: 0, chapter: 0 }, 'Opening a lesson must clear both cancelled celebration classes');
  await page.locator('#back-btn').click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.locator(celebrationClasses).count(), 0, 'Returning must not restart either consumed effect');
  assert.deepEqual((await page.evaluate(() => window.qaFeedbackStarts)).sort(), ['chapterTitleGlow', 'completedStarSettle']);
  assert.deepEqual((await page.evaluate(() => window.qaFeedbackCancels)).sort(), ['chapterTitleGlow', 'completedStarSettle']);
  if (output) await page.screenshot({ path: path.join(output, 'cancelled-celebrations-no-replay.png') });
  await page.reload();
  await page.locator('.level-node').first().waitFor();
}

async function accessibleStates(page, library) {
  const observed = {};
  for (const [state, level] of [
    ['completed', library[0].levels[0]], ['current', library[0].levels[2]], ['locked', library[1].levels[0]],
  ]) {
    const title = level.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    observed[state] = await page.getByRole('button', { name: new RegExp(`${title}.*\\b${state}\\b`, 'i') }).count() === 1;
  }
  const currentLabel = page.locator('.level-node-wrap--current .level-title').getByText('Current lesson', { exact: true });
  observed.currentLabel = await currentLabel.count() === 1 && await currentLabel.isVisible();
  assert.deepEqual(observed, { completed: true, current: true, locked: true, currentLabel: true },
    'Every level exposes its state to assistive technology and the current title has a local visible label');
}

module.exports = { completeLessons, route, navigationCelebration, cancelCelebration, accessibleStates };
