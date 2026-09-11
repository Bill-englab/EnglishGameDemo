// Full-map acceptance against tools/preview_stone_map.py only. All mutations are
// intercepted in-browser; never uploads to or scans family media.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium, _electron } = require('playwright');
const url = new URL('/', process.env.STONE_QA_URL).href;
const output = process.env.STONE_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'stone-full-'));
fs.mkdirSync(output, { recursive: true });
let browser, electron;
const results = [];

async function ready(page) {
  await page.waitForFunction(() => document.querySelectorAll('.stone-lesson').length === 30 && document.querySelectorAll('.stone-paver').length === 145);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => document.querySelector('.bg-layer__slide')?.style.backgroundImage
    && [...document.querySelectorAll('.bg-layer__slide')].every(s => parseFloat(s.style.height) > 0));
}
async function geometry(page) {
  const metrics = await page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    return { width: innerWidth, height: innerHeight, header: rect(document.querySelector('.topbar')),
      brand: rect(document.querySelector('.shell-left')), progress: rect(document.querySelector('.progress')),
      avatar: rect(document.querySelector('#user-menu-trigger')),
      numbers: [...document.querySelectorAll('.stone-number')].map(e => +e.textContent),
      frames: [...document.querySelectorAll('.stone-frame')].map(rect),
      headings: [...document.querySelectorAll('.chapter-heading')].map(rect),
      titles: [...document.querySelectorAll('.stone-title')].map(rect),
      stones: [...document.querySelectorAll('.stone-paver')].map(e => ({ ...rect(e), gap: +e.dataset.gap })),
      sections: [...document.querySelectorAll('.stone-chapter')].map(rect),
      scenes: [...document.querySelectorAll('.bg-layer__slide')].map(e => ({...rect(e), world: e.dataset.world})),
      strips: [...document.querySelectorAll('.bg-layer__slide[data-art="map"] .stone-world-art')].map(rect),
      shadow: getComputedStyle(document.querySelector('.stone-paver')).filter,
      canvas: rect(document.querySelector('#map-scroll')) };
  });
  assert.deepEqual(metrics.numbers, Array.from({length:30}, (_,i) => i+1));
  assert.equal(new Set(metrics.scenes.map(s => s.world)).size, 10);
  assert.ok(metrics.strips.every(s => Math.abs(s.width - metrics.canvas.width) < 1 && Math.abs(s.x - metrics.canvas.x) < 1), 'Scenery fills the entire map width without grass sidebars');
  assert.equal((metrics.shadow.match(/drop-shadow/g) || []).length, 2, 'Pavers have contact and cast shadows');
  assert.ok(metrics.header.height <= 64);
  assert.ok(metrics.progress.width <= 180);
  assert.ok(metrics.progress.x - metrics.brand.right <= 12);
  assert.ok(metrics.avatar.x - metrics.progress.right >= 9, 'Avatar is separate from progress');
  for (const r of [...metrics.frames, ...metrics.stones, metrics.avatar]) assert.ok(r.x >= 0 && r.right <= metrics.width, 'Map/control fits viewport');
  for (const stone of metrics.stones) {
    const nextChapter = (stone.gap + 1) % 3 === 0;
    const destination = nextChapter ? metrics.headings[(stone.gap + 1) / 3] : metrics.frames[stone.gap + 1];
    assert.ok(stone.y >= metrics.titles[stone.gap].bottom - 1, `Path stays below lesson text: gap ${stone.gap}, stone ${stone.y}, title ${metrics.titles[stone.gap].bottom}, viewport ${metrics.width}`);
    assert.ok(stone.bottom <= destination.y + 1, 'Path stops before photo or chapter gateway');
  }
  for (let gap=0; gap<29; gap++) {
    const middle = metrics.stones.filter(s => s.gap === gap)[2];
    const center = metrics.frames[gap].x + metrics.frames[gap].width / 2;
    assert.ok(gap % 2 ? middle.x + middle.width/2 > center + 25 : middle.x + middle.width/2 < center - 25, 'Arcs alternate across chapter boundaries');
  }
  metrics.sections.forEach((r,i) => {
    assert.ok(metrics.scenes[i].y <= r.y && metrics.scenes[i].bottom >= r.bottom - 1);
  });
  assert.ok(metrics.scenes.at(-1).bottom >= metrics.canvas.bottom - 1, 'Scenery covers map tail');
}

(async () => {
  try {
    browser = await chromium.launch({channel:'msedge',headless:true});
    const page = await browser.newPage({reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await ready(page);
    assert.ok(await page.locator('.bg-layer__slide[data-art]').count() < 10, 'First screen does not download all chapter artwork');
    const library = await (await page.request.get(new URL('/api/library',url).href)).json();
    for (const viewport of [{width:1920,height:1080},{width:1440,height:960},{width:1024,height:1900},{width:800,height:600},{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport);
      await page.goto(url);
      await ready(page);
      await geometry(page);
      assert.equal(await page.locator('.bg-layer__slide').first().evaluate(s => s.style.backgroundImage.includes('-desktop.')), viewport.width >= 768, 'Desktop uses landscape art; mobile keeps portrait art');
      await page.screenshot({path:path.join(output,`full-${viewport.width}x${viewport.height}.png`)});
      const seam = page.locator('.chapter-heading').nth(1);
      await seam.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelectorAll('.bg-layer__slide')[1].dataset.art==='map');
      await page.screenshot({path:path.join(output,`boundary-${viewport.width}x${viewport.height}.png`)});
      const before = await page.evaluate(() => ({y:document.querySelector('.bg-layer__slide').getBoundingClientRect().top, p:document.querySelector('.stone-paver').getBoundingClientRect().top, header:document.querySelector('.topbar').getBoundingClientRect().top,scroll:document.querySelector('#map-view').scrollTop}));
      await page.evaluate(() => document.querySelector('#map-view').scrollBy({top:100,behavior:'instant'}));
      const after = await page.evaluate(() => ({y:document.querySelector('.bg-layer__slide').getBoundingClientRect().top, p:document.querySelector('.stone-paver').getBoundingClientRect().top,header:document.querySelector('.topbar').getBoundingClientRect().top,scroll:document.querySelector('#map-view').scrollTop}));
      assert.equal(after.y-before.y, -(after.scroll-before.scroll));
      assert.equal(after.p-before.p, after.y-before.y);
      assert.equal(after.header,before.header);
      await page.locator('.stone-lesson').nth(3).click();
      assert.equal(await page.locator('#detail-title').innerText(),library[1].levels[0].title);
      await page.locator('#back-btn').click();
      await ready(page);
      await page.locator('#current-lesson-button').click();
      await page.waitForFunction(() => document.activeElement?.matches('.stone-lesson[aria-current]'));
      await page.locator('#user-menu-trigger').click();
      await page.locator('#profile-open').click();
      assert.equal(await page.locator('#profile-dialog').isVisible(),true);
      await page.locator('#profile-cancel').click();
      results.push({viewport,fullMap:true,chapterBoundary:true,synchronizedScroll:true,compactHeader:true,profile:true});
    }
    assert.deepEqual(errors,[]);

    // Move the true current lesson past the first chapter, then exercise a
    // performance save through the actual UI with network-only fixture writes.
    const scenario = await browser.newPage();
    let data = structuredClone(library);
    let completed = 5;
    const setProgress = n => {
      let i=0;
      for (const ch of data) for (const lv of ch.levels) {
        lv.has_performance = i<n; lv.current=i===n; lv.state=i<n?'completed':i===n?'unlocked':'locked'; i++;
      }
    };
    setProgress(completed);
    const fixtureResponse = await page.request.get(new URL(`/video/${library[0].name}/${library[0].levels[0].level}/performance`,url).href);
    const video = await fixtureResponse.body();
    await scenario.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Test camera denied','NotAllowedError'); };
      window.showOpenFilePicker = async () => [{getFile:async () => new File(['fixture'],'fixture.webm',{type:'video/webm'})}];
      window.starAnimations = 0;
      document.addEventListener('animationstart', e => { if(e.animationName==='completedStarSettle') window.starAnimations++; });
    });
    await scenario.route('**/api/library*',r => r.fulfill({json:data}));
    await scenario.route('**/video/**/performance*',r => r.fulfill({contentType:'video/mp4',body:video}));
    await scenario.route('**/upload/**',r => { setProgress(++completed); return r.fulfill({json:{ok:true}}); });
    await scenario.goto(url); await ready(scenario);
    await scenario.locator('#current-lesson-button').click();
    await scenario.waitForFunction(() => document.activeElement?.getAttribute('aria-label')?.startsWith('6.'));
    await scenario.locator('.stone-lesson').nth(5).click();
    await scenario.getByRole('button',{name:'Start recording',exact:true}).click();
    await scenario.getByRole('button',{name:'Choose file',exact:true}).click();
    await scenario.waitForFunction(() => document.querySelector('#star-count').textContent==='6');
    await scenario.locator('#back-btn').click();
    await scenario.waitForFunction(() => window.starAnimations===1);
    await scenario.waitForFunction(() => !document.querySelector('.level-node-wrap--just-completed'));
    assert.equal(await scenario.locator('.chapter-heading .ch-progress').nth(1).innerText(),'★ 3/3');
    assert.match(await scenario.locator('.stone-lesson[aria-current]').getAttribute('aria-label'),/^7\./);
    await scenario.locator('.stone-lesson').nth(5).click();
    await scenario.locator('#back-btn').click();
    assert.equal(await scenario.evaluate(() => window.starAnimations),1,'Returning does not repeat completion');
    setProgress(30);
    await scenario.reload(); await ready(scenario);
    assert.equal(await scenario.locator('.stone-badge--completed').count(),30);
    assert.ok(await scenario.locator('video.stone-thumbnail[src]').count() < 30, 'Offscreen performance videos are deferred');
    await scenario.locator('.stone-lesson').last().scrollIntoViewIfNeeded();
    await scenario.waitForFunction(() => document.querySelectorAll('video.stone-thumbnail')[29].readyState >= 2);
    assert.equal(await scenario.locator('#current-lesson-button').isVisible(),false);
    assert.equal(await scenario.locator('#adventure-complete').isVisible(),true);
    data=[]; await scenario.reload();
    await scenario.getByText('Your adventure is being prepared.',{exact:true}).waitFor();
    assert.equal(await scenario.locator('#current-lesson-button').isVisible(),false);
    results.push({laterCurrent:true,saveFeedback:true,chapterCompletion:true,allCompleted:true,emptyLibrary:true});

    // Failed world art stays within that chapter's fallback chain.
    const missing = await browser.newPage();
    await missing.route('**/map-assets/worlds-map-color-market*.webp',r => r.fulfill({status:404,body:''}));
    await missing.route('**/worlds-v2/color-market-*',r => r.fulfill({status:404,body:''}));
    await missing.goto(url);
    await missing.locator('.chapter-heading').nth(1).scrollIntoViewIfNeeded();
    await missing.waitForFunction(() => {
      const slide=document.querySelectorAll('.bg-layer__slide')[1];
      return slide?.style.backgroundImage.includes('/worlds/02-refusing-bargaining');
    });
    await geometry(missing);
    results.push({sameChapterFallback:true});
    await missing.route('**/worlds/02-refusing-bargaining.*',r => r.fulfill({status:404,body:''}));
    await missing.reload();
    await missing.locator('.chapter-heading').nth(1).scrollIntoViewIfNeeded();
    await missing.waitForFunction(() => {
      const slide=document.querySelectorAll('.bg-layer__slide')[1];
      return slide?.classList.contains('bg-layer__slide--placeholder') && slide.style.backgroundImage==='';
    });
    assert.equal(await missing.locator('.bg-layer__slide').nth(1).getAttribute('data-world'),'color-market');
    results.push({missingArtPlaceholder:true});

    if(process.env.STONE_QA_ELECTRON==='1') {
      const original=fs.readFileSync(path.join(__dirname,'modern-toy-ui.cjs'),'utf8');
      const program=original.match(/const electronProgram = `([\s\S]*?)`;/)[1];
      const owned=fs.mkdtempSync(path.join(os.tmpdir(),'stone-full-native-'));
      const main=path.join(owned,'main.cjs'); fs.writeFileSync(main,program);
      const env={...process.env,TOY_QA_USER_DATA:path.join(owned,'profile'),TOY_QA_PRELOAD:path.resolve(__dirname,'../../electron/preload.cjs'),TOY_QA_URL:url};
      delete env.ELECTRON_RUN_AS_NODE;
      electron=await _electron.launch({executablePath:path.resolve(__dirname,'../node_modules/electron/dist/electron.exe'),args:[main],env});
      const native=await electron.firstWindow(); await ready(native); await geometry(native);
      assert.equal(await native.locator('#map-view .window-controls').count(),1);
      await native.locator('.stone-lesson').nth(3).click();
      await native.locator('#back-btn').click();
      await native.locator('#map-view .wc-minimize').click();
      assert.equal(await electron.evaluate(() => global.qaWindow.isMinimized()),true);
      results.push({nativeElectron:true,fullMap:true,detail:true,minimize:true});
    }
    fs.writeFileSync(path.join(output,'full-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({pass:true,results},null,2));
  } finally { if(electron) await electron.close(); if(browser) await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
