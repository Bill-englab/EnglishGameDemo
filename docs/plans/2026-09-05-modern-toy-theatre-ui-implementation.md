# Modern Toy Theatre UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将地图、Stage/课程目录、课程详情和手机端统一为获批的“现代玩具剧场”界面，同时保留真实录像、二元进度与本地 Electron/Web 架构。

**Architecture:** 20 张无 UI 的响应式场景图只负责微缩世界；路径、节点、视频封面、文字和控件继续由 HTML/CSS/SVG 绘制。新增纯导航/资产模型和独立 shell 编排模块，`app.js` 只把 `/api/library`、详情与录像生命周期接入它们；不改后端数据契约。

**Tech Stack:** Flask/Jinja、原生 ES Modules、HTML/CSS/SVG、Electron preload、Node `node:test`、pytest、内置 ImageGen；无打包器、框架、数据库或 CDN。

## Global Constraints

- 唯一设计规格是 `docs/specs/2026-09-05-modern-toy-theatre-ui-design.md`，四张 `design/reference/modern-toy-theatre-*.png` 是视觉基准。
- 只有当前用户的 `performance` 视频能完成课程；不增加星级、积分、连续打卡、能力评分、排行榜或 AI 教学。
- 保留 `curriculum/04`、`demo/04`、`recordings/<user>/04`、`prompts/04` 的身份、内容、顺序和路径；不得写入家庭媒体做测试。
- 前端仍是原生 ES Modules；不增加运行时前端依赖、打包器、数据库或云服务。
- 桌面场景 8:5、手机场景 9:16；背景无 UI、文字、人物、路线和关卡节点，路线/节点由代码绘制。
- 断点：小于 768px 手机；768–1023px 紧凑桌面；1024px 以上完整桌面。Electron 800×600 必须可用且无横向滚动。
- 控件至少 44×44px；对话桌面 17–18px，手机至少 16px，辅助文字至少 14px。
- Stage 1 可用；Stage 2/3 只显示 `Planned` 且不可进入。UI 选择不回写课程状态。
- 本计划不实现 3 秒录制倒计时或 0.75×/1× 播放速度；不改录制状态机。
- 每个浏览器/上传测试使用临时账号与临时媒体根，不调用启动媒体扫描。

---

### Task 1: Produce the responsive chapter worlds and asset contract

**Files:**
- Create: `app/static/worlds-v2/README.md`
- Create: `app/static/worlds-v2/<world>-desktop.webp`（10 张）
- Create: `app/static/worlds-v2/<world>-mobile.webp`（10 张）
- Create: `app/static/world-assets.mjs`
- Test: `app/tests-js/world-assets.test.mjs`
- Modify: `app/tests/test_app.py`

**Interfaces:**
- Produces: `WORLD_ASSET_ROOT = "/static/worlds-v2"`。
- Produces: `getWorldAssetUrls(world: string, mobile: boolean) -> string[]`，首项是 v2 WebP，后续项是现有 `/static/worlds/<legacy>.<ext>` 回退候选。
- Produces: `WORLD_LEGACY_ASSETS: Record<string,string>`，把 10 个 `world` 映射到当前 `chapter.background_asset` 文件基名。
- Consumes: `CHAPTER_THEMES[*].world` 的 10 个稳定 world 名。

- [x] **Step 1: Write failing asset/model tests**

在 `world-assets.test.mjs` 明确断言所有 world 都有两个 v2 URL、非法 world 回到第一章、手机/桌面 URL 不同且以 `.webp` 结束：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { CHAPTER_THEMES } from "../static/map-model.mjs";
import { getWorldAssetUrls } from "../static/world-assets.mjs";

test("every chapter resolves desktop and mobile v2 assets before legacy fallbacks", () => {
  for (const { world } of Object.values(CHAPTER_THEMES)) {
    const desktop = getWorldAssetUrls(world, false);
    const mobile = getWorldAssetUrls(world, true);
    assert.equal(desktop[0], `/static/worlds-v2/${world}-desktop.webp`);
    assert.equal(mobile[0], `/static/worlds-v2/${world}-mobile.webp`);
    assert.ok(desktop.length >= 2 && mobile.length >= 2);
  }
});
```

在 `test_app.py` 参数化请求 20 个新静态路径并预期 200 与 `image/webp`。

- [x] **Step 2: Run the tests and confirm red**

Run: `cd app && npm test && python -m pytest tests/test_app.py -q`

Expected: Node 因 `world-assets.mjs` 不存在而失败；pytest 因 v2 资产 404 失败。

- [x] **Step 3: Generate and curate all 20 scene assets**

对每章分别调用内置 ImageGen，桌面与手机使用独立提示，不裁切同一张图。每条提示逐字包含：

```text
Premium modern toy-theatre chapter background for My English Adventure.
Tactile clay, painted wood, matte ceramic and fabric; muted teal, apricot,
butter yellow and cocoa; warm natural daylight. No people, characters,
text, UI, buttons, route, path, circles, lesson nodes or watermark.
Leave a broad uncluttered zig-zag grass corridor through the composition
for a code-rendered route and three large video nodes. Keep the chapter's
named props at the edges; preserve readable foreground/midground/background.
```

追加规格表中的章主题和明确比例；检查无嵌入文字/节点/人物。用本机 Pillow 只做尺寸与色彩空间转换，将最终稿分别保存为 1920×1200 的 8:5 WebP 和 1080×1920 的 9:16 WebP，quality 固定为 88；不得把桌面图机械裁成手机图。

- [x] **Step 4: Implement the pure resolver and asset README**

`getWorldAssetUrls` 返回确定顺序，例如：

```js
export function getWorldAssetUrls(world, mobile) {
  const safeWorld = WORLD_LEGACY_ASSETS[world] ? world : "morning-picnic";
  const legacy = WORLD_LEGACY_ASSETS[safeWorld];
  return [
    `${WORLD_ASSET_ROOT}/${safeWorld}-${mobile ? "mobile" : "desktop"}.webp`,
    `/static/worlds/${legacy}.webp`,
    `/static/worlds/${legacy}.png`,
    `/static/worlds/${legacy}.jpg`,
  ];
}
```

README 记录每个资产的主题、比例、像素、ImageGen 提示和“无 UI/无节点”约束。

- [x] **Step 5: Verify and visually inspect**

Run: `cd app && npm test && python -m pytest tests/test_app.py -q`

Expected: 全绿。逐张 `view_image`，确认 20 张比例、主题、走廊和材质一致；任何一张包含文字/节点/人物必须重生成。

- [x] **Step 6: Commit**

```bash
git add app/static/worlds-v2 app/static/world-assets.mjs app/tests-js/world-assets.test.mjs app/tests/test_app.py
git commit -m "feat: add responsive modern toy chapter worlds"
```

---

### Task 2: Add the pure Stage, progress, chapter and current-lesson model

**Files:**
- Create: `app/static/adventure-navigation.mjs`
- Test: `app/tests-js/adventure-navigation.test.mjs`

**Interfaces:**
- Produces: `STAGES`，固定三个 `{id,label,theme,available}` 记录，只有 `04` 可用。
- Produces: `summarizeAdventure(library: Chapter[]) -> {completed,total,current,chapters}`。
- `current` 为带 chapter context 的 level 或 `null`；`chapters` 元素为 `{name,title,completed,total,levels}`。
- Produces: `globalLessonNumber(library, chapterName, levelName) -> number | null`，只用于显示，不参与路径。

- [x] **Step 1: Write the model tests first**

覆盖空库、跨章计数、completed/current 分离、全完成 current 为 null、真实顺序全局编号和输入不被修改：

```js
test("summarizes completion and preserves a distinct current lesson", () => {
  const result = summarizeAdventure(fixture);
  assert.deepEqual({ completed: result.completed, total: result.total }, { completed: 1, total: 3 });
  assert.equal(result.current.level, "02-current");
  assert.equal(result.chapters[0].completed, 1);
  assert.equal(fixture[0].levels[1].chapter, undefined);
});
```

- [x] **Step 2: Confirm red**

Run: `cd app && node --test tests-js/adventure-navigation.test.mjs`

Expected: FAIL，因为模块不存在。

- [x] **Step 3: Implement the pure model**

使用 `map`/`reduce` 返回新对象，不修改 scanner 输出；`current` 只取 library 中第一个 `current === true && !has_performance` 的课。Stage 记录精确为：

```js
export const STAGES = Object.freeze([
  { id: "04", label: "Stage 1", theme: "I can take part", available: true },
  { id: "05", label: "Stage 2", theme: "I can keep it going", available: false },
  { id: "06", label: "Stage 3", theme: "I can explain and adapt", available: false },
]);
```

- [x] **Step 4: Verify and commit**

Run: `cd app && npm test`

Expected: 全部 Node tests 通过。

```bash
git add app/static/adventure-navigation.mjs app/tests-js/adventure-navigation.test.mjs
git commit -m "feat: model stage navigation and progress"
```

---

### Task 3: Build the stable shell and accessible course drawer

**Files:**
- Modify: `app/templates/map.html`
- Create: `app/static/adventure-shell.mjs`
- Modify: `app/static/app.js`
- Modify: `app/static/titlebar.js`
- Modify: `app/static/style.css`
- Test: `app/tests/test_detail_layout.py`
- Test: `app/tests/test_app.py`
- Create: `app/tests-js/adventure-shell.test.mjs`

**Interfaces:**
- Consumes: `summarizeAdventure`、`STAGES` 与 `openDetail(level)` 回调。
- Produces: `createAdventureShell({root, onOpenLesson, onCurrentLesson, onProfile}) -> {render(summary), open(), close(), destroy()}`。
- `render` 只更新真实进度、Stage 与课程行；`open/close` 管理 focus trap、Escape、遮罩、滚动锁和焦点恢复。
- Produces stable `[data-window-controls]` mounts；`titlebar.js` 一次性为每个 mount 注入，不再用 MutationObserver 重复探测业务标题。

- [x] **Step 1: Add failing HTML and pure helper tests**

HTML 测试要求 `#adventure-menu-button[aria-controls="course-drawer"]`、`#course-drawer`、遮罩、`#current-lesson-button`、地图/详情两个 `data-window-controls` mount。纯测试从 `adventure-shell.mjs` 导出的 `getFocusableElements(root)` 验证 disabled/hidden Stage 不进入结果。

- [x] **Step 2: Confirm red**

Run: `cd app && python -m pytest tests/test_detail_layout.py tests/test_app.py -q && node --test tests-js/adventure-shell.test.mjs`

Expected: 因新挂载点和模块缺失而失败。

- [x] **Step 3: Add semantic shell and drawer markup**

地图 topbar 改成独立浮动组，保留现有用户菜单 DOM/ID；增加：

```html
<button id="adventure-menu-button" aria-expanded="false" aria-controls="course-drawer">…</button>
<button id="current-lesson-button" type="button">Current lesson</button>
<div id="drawer-backdrop" hidden></div>
<aside id="course-drawer" aria-modal="true" aria-labelledby="course-drawer-title" hidden>…</aside>
<div data-window-controls></div>
```

抽屉内部 Stage、章、课列表由 shell 模块渲染；Stage 2/3 用真实 `disabled` button 和 `Planned` 文本。

- [x] **Step 4: Implement shell lifecycle and titlebar mounts**

`open()` 保存来源元素、设置 `aria-expanded`、移除 `hidden`、锁定 `#map-view`、聚焦关闭按钮；Tab/Shift+Tab 在 drawer 内循环。`close()` 完全逆转状态并恢复来源焦点。`destroy()` 移除监听器。

`titlebar.js` 对每个 `[data-window-controls]` 调 `injectInto`；登录/管理页继续 overlay。删除 MutationObserver 和延时重复注入，保留 `window.__injectTitlebar` 兼容入口但让其幂等。

- [x] **Step 5: Wire actual data and actions**

`renderMap(library)` 计算 `summary` 后调用 `shell.render(summary)`；课程点击调用现有 `openDetail`。本任务先让 current 按钮在 `summary.current` 存在时显示，但以 disabled 状态呈现；Task 4 完成滚动动作后才启用并绑定回调。详情打开/关闭只切换 shell 可见区域，不重新创建 shell。用户菜单和 profile 使用现有接口。

- [x] **Step 6: Style against the drawer reference**

实现 340px 桌面抽屉、手机大部分宽度、暖白实体表面、20px 外圆角、44px 行、完成/当前分离。地图 topbar 无全宽白底；Electron/Web controls 不留假占位。使用设计 token，不给每一行叠加厚卡片或强阴影。

- [x] **Step 7: Verify and commit**

Run: `cd app && node --check static/app.js && node --check static/adventure-shell.mjs && npm test && python -m pytest tests/test_detail_layout.py tests/test_app.py -q`

Expected: 全绿，`git diff --check` 无输出。

```bash
git add app/templates/map.html app/static/adventure-shell.mjs app/static/app.js app/static/titlebar.js app/static/style.css app/tests/test_detail_layout.py app/tests/test_app.py app/tests-js/adventure-shell.test.mjs
git commit -m "feat: add stage shell and lesson drawer"
```

---

### Task 4: Rebuild the map presentation, responsive backgrounds and current jump

**Files:**
- Modify: `app/static/map-model.mjs`
- Modify: `app/static/app.js`
- Modify: `app/static/style.css`
- Modify: `app/static/map-path.mjs`
- Test: `app/tests-js/map-model.test.mjs`
- Test: `app/tests-js/map-path.test.mjs`
- Create: `app/tests-js/map-presentation.test.mjs`

**Interfaces:**
- Consumes: `getWorldAssetUrls(world,mobile)` 与 Task 3 shell 的 `onCurrentLesson`。
- Produces: `resolveMapPresentation(level,index) -> {state,number,showCover,marker}`，状态仍来自 `has_performance/current`。
- Produces: `scrollToCurrentLesson({behavior})` DOM action；reduced-motion 时强制 `behavior: "auto"`。
- Keeps: `buildSmoothPath(points)` 不修改输入；增加 `splitPathPoints(points, firstLockedIndex)` 纯 helper，避免 DOM 层重复切分。

- [x] **Step 1: Write failing presentation/path tests**

覆盖 completed 用勾、current 用定位针、locked 用锁；无 performance 不得出现完成标记；全局编号 1–30；路径切分在当前节点连接且不丢点；背景在 `<768` 选择 mobile URL。

- [x] **Step 2: Confirm red**

Run: `cd app && node --test tests-js/map-presentation.test.mjs tests-js/map-path.test.mjs`

Expected: 新接口缺失导致失败。

- [x] **Step 3: Replace background probing with responsive candidates**

`buildBgLayer` 为每章创建 slide，使用候选 URL 顺序探测；`matchMedia("(max-width: 767px)")` 改变时只重新选择背景，不重建地图或节点。每次异步探测带 generation token，旧尺寸响应不能覆盖新尺寸；全部失败保留主题色材质回退，不再循环错误章节图片。

- [x] **Step 4: Render the toy path and node states**

沿真实 `.level-node` 中心绘制三层 SVG path；completed 段只用低饱和 teal 内线。移除旋转金星、强金色光晕和多重缩放；节点尺寸仍足够显示真实 `/thumb` 封面。三个状态用图标＋形态区分，locked 仍可点击。

- [x] **Step 5: Add the current-lesson action**

给 current node 稳定 `data-current-lesson` 和可聚焦按钮。点击 topbar action 时调用 `scrollIntoView({block:"center"})`，完成后 focus 节点；仅用户点击触发。全完成/加载失败隐藏 action；返回地图不自动跳转。

- [x] **Step 6: Verify and commit**

Run: `cd app && node --check static/app.js && npm test`

Expected: Node 全绿；手工 resize 后路径仍通过节点中心且背景切换正确。

```bash
git add app/static/map-model.mjs app/static/map-path.mjs app/static/app.js app/static/style.css app/tests-js/map-model.test.mjs app/tests-js/map-path.test.mjs app/tests-js/map-presentation.test.mjs
git commit -m "feat: restyle the adventure map and current lesson jump"
```

---

### Task 5: Apply the accepted detail and responsive visual system

**Files:**
- Modify: `app/static/style.css`
- Modify: `app/templates/map.html`
- Modify: `app/static/app.js`
- Modify: `app/static/profile.css`
- Test: `app/tests/test_detail_layout.py`
- Test: `app/tests-js/detail-media.test.mjs`

**Interfaces:**
- Consumes: stable shell mounts from Task 3 and the existing `resolveMediaView` API.
- Keeps: all existing detail IDs, media upload/recording functions, prompt Copy behavior and `renderDetailDemo(level)` panel-only refresh.
- Produces: shared CSS tokens on `:root` used by map, detail, drawer and profile.

- [x] **Step 1: Strengthen failing structure/style contracts**

HTML 测试钉住详情 56px shell mount、Your Show 在 Watch & Learn 前、A/B/C→Replay→Grown-up 顺序、两个独立 closed details。静态 CSS 测试检查统一 token 名：`--toy-ivory`、`--toy-cocoa`、`--toy-teal`、`--toy-apricot`、`--toy-line`。

- [x] **Step 2: Confirm red for the new token contract**

Run: `cd app && python -m pytest tests/test_detail_layout.py -q`

Expected: 新 token 断言失败。

- [x] **Step 3: Extract tokens and match the detail reference**

详情使用暖白开放阅读面、薄边框、克制阴影；左 340px、右弹性，正文不套大外卡。录制空状态可用当前 world 的低对比静态裁切，但必须覆盖明确麦克风图标和 `Record your roleplay`，且不能看似已有视频。保持现有 `Start recording`、`Add demo`、Replay 与 disclosures。

- [x] **Step 4: Finish mobile and compact-window behavior**

小于 768px 使用媒体页签＋单列阅读；768–1023px 不挤压气泡；800×600 允许页面滚动但无横向溢出。真实视频保持 16:9，空状态可以更矮。隐藏媒体暂停；resize 不替换正在录制的 video DOM。

- [x] **Step 5: Align profile/login/admin tokens without structural redesign**

只替换颜色、字体、边框、按钮和 focus ring；保留现有字段、文案、权限与布局。登录/管理页的 Electron controls 仍可达。

- [x] **Step 6: Verify and commit**

Run: `cd app && node --check static/app.js && npm test && python -m pytest tests/test_detail_layout.py -q`

Expected: 全绿；demo delayed upload 两个场景仍保留 performance ownership。

```bash
git add app/static/style.css app/static/profile.css app/templates/map.html app/static/app.js app/tests/test_detail_layout.py app/tests-js/detail-media.test.mjs
git commit -m "feat: unify lesson and profile styling with toy theatre"
```

---

### Task 6: Perform isolated browser/Electron acceptance and update documentation

**Files:**
- Create: `app/tests-browser/modern-toy-ui.cjs`
- Modify: `app/README.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/README.md`
- Modify: `docs/plans/2026-09-05-modern-toy-theatre-ui-implementation.md`

**Interfaces:**
- Consumes all production interfaces from Tasks 1–5.
- Produces a self-contained optional browser regression that starts an ephemeral Flask fixture, uses temporary users/media, intercepts uploads and terminates its own browser/server/temp directory.

- [x] **Step 1: Write the isolated acceptance harness**

`modern-toy-ui.cjs` 必须断言：10 章/30 节点、真实 0/30 和部分完成数、current button focus、drawer focus/Escape/lesson navigation、Stage 2/3 disabled、desktop/mobile asset URL、no horizontal overflow、detail order、mobile tab、late demo upload preserving recording。使用 Edge fake camera，与 `detail-upload.cjs` 相同的临时 Flask 隔离模式；不调用 `app.py` 主入口。

- [x] **Step 2: Run browser acceptance at required sizes**

Run from `app/` with existing Playwright runtime:

```powershell
$env:NODE_PATH='C:/Users/q00679663/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node tests-browser/modern-toy-ui.cjs
```

Expected: 1440×960、800×600、390×844 与手机横屏检查全通过，page errors 为空。缺 Playwright 时记录为环境限制，但仍用可用的浏览器工具完成同等人工验收。

- [x] **Step 3: Validate real Electron shell**

用真实 `app/node_modules/electron/dist/electron.exe`、真实 `electron/preload.cjs` 和独立临时 userData 启动隐藏 BrowserWindow；验证最小化、最大化、关闭 IPC、拖动区不覆盖按钮、800×600 无横向溢出。不得关闭用户已经打开的窗口。

- [x] **Step 4: Perform visual fidelity review**

分别 `view_image` 四张批准参考和同尺寸最终截图；记录至少五项：场景裁切、节点比例、topbar 密度、drawer 层级、detail 字号/留白、mobile 密度。任何明显色值、字号、阴影、外框或构图偏差先修复再继续。

- [x] **Step 5: Run full verification**

Run:

```powershell
cd app
npm test
python -m pytest -q
node --check static/app.js
node --check static/adventure-shell.mjs
```

Expected: 所有测试通过、语法检查 exit 0、`git diff --check` 无输出。

- [x] **Step 6: Update project documentation and status**

README 解释新地图、目录、current action 和响应式资产；AGENTS 更新模块职责、20 张资产路径、运行时数据流、测试与故障排查。把本计划全部 checkbox 更新为 `[x]`，记录测试数量、浏览器/Electron尺寸、fidelity ledger、未验证的真实设备限制。规格状态改为 `Implemented`。

- [x] **Step 7: Commit**

```bash
git add app/tests-browser/modern-toy-ui.cjs app/README.md README.md AGENTS.md docs/README.md docs/specs/2026-09-05-modern-toy-theatre-ui-design.md docs/plans/2026-09-05-modern-toy-theatre-ui-implementation.md
git commit -m "docs: record modern toy theatre UI verification"
```

---

## Acceptance record — 2026-09-05

Tasks 1–5 were implemented and individually reviewed through `7589fe2`; Task 6 adds the committed, optional `app/tests-browser/modern-toy-ui.cjs` and updates operational documentation. No curriculum, prompt, family-media, profile, user or real-config file was changed during acceptance.

### Environment and reproducible checks

- Windows; existing Playwright runtime and Microsoft Edge. **Browser plugin not available**, so the frontend-testing-debugging fallback uses Playwright/Edge. No new browser/application dependency was installed.
- Python available here is `py -3.10` (`app/.venv` is absent). `npm test`: **36 passed**; `py -3.10 -m pytest -q`: **159 passed**. `node --check static/app.js`, `node --check static/adventure-shell.mjs`, `node --check tests-browser/modern-toy-ui.cjs` and `git diff --check`: exit 0.
- Browser acceptance: **1440×960, 800×600, 390×844 and 844×390**. Ten chapters/30 nodes, three per chapter, every chapter's responsive background and scroll activation, SVG passing through node centers after resize, no horizontal overflow in map/drawer/detail, current scroll/focus, drawer focus wrap/Escape/close/backdrop, disabled Stage 2/3, real lesson navigation and restored map scroll.
- Real temporary scanner progress **0/30 → 2/30 → 30/30**: completed marks, third-lesson current and chapter 2/3 count, then no current node/action and completion message. All background candidates deliberately returning 404 leave usable material fallback nodes and detail navigation.
- Detail: Your Show before Watch & Learn; complete A/B/C, two Replay Cards and independent closed disclosures; mobile tab switching and Previous/Next; delayed demo upload during both capture and unsaved playback preserves the same performance video/source through desktop→mobile resize. Fake camera is used; all uploads are intercepted.
- Native Electron: installed `app/node_modules/electron/dist/electron.exe`, real `electron/preload.cjs`, independent temporary userData, hidden 800×600 BrowserWindow. Native minimized/maximized/restored/destroyed states and all corresponding renderer→preload→IPC calls asserted; map/detail buttons have `no-drag`, headers retain `drag`, map/detail have no horizontal overflow. The harness main process reproduces window handlers and never executes the production startup/media scan or port-5000 cleanup. No user's window was reused or closed.
- Browser page errors: **0**; relevant console errors: **0**. The final expanded run has 42 explained HTTP 404 messages: 40 deliberately blocked background candidates and two absent optional thumbnail requests. No JavaScript errors are filtered.

Run from `app/` using the existing runtime:

```powershell
$env:NODE_PATH='C:/Users/q00679663/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:TOY_QA_PYTHON='C:/Users/q00679663/AppData/Local/Programs/Python/Python310/python.exe'
$env:TOY_QA_ELECTRON='1'
node tests-browser/modern-toy-ui.cjs
```

Set `TOY_QA_OUTPUT` to a separate QA directory to keep screenshots. Temporary fixtures and the script's own browser/server are always cleaned up; retained screenshots are intentionally outside committed source.

### Visual fidelity ledger

All four approved `design/reference/modern-toy-theatre-*.png` files and final captures were opened with `view_image` in this QA pass. Desktop map/drawer/detail comparisons use the reference-native **1536×1024**; mobile comparison uses the reference-native **1683×935** presentation canvas containing actual 575×910 map and 562×910 detail captures. Required 390×844 and landscape screenshots are additionally reviewed, not inferred from that presentation. Local evidence is retained under the ignored `.superpowers/sdd/2026-09-05-modern-toy-theatre-ui-implementation/task-6-screenshots/` directory.

| Comparison point | Approved reference → actual implementation | Decision |
| --- | --- | --- |
| Scene and crop | Orchard, wood windmill and picnic material identity remain; independent desktop/mobile scenes move props to the edges and leave central grass. No baked path or characters. | Intentional per §3.1: usable responsive art supports real code-drawn routes. |
| Nodes and path | 2026-09-06 perspective correction: empty discs are 112×88px and current is 178×142px on desktop; mobile uses 94×78px and 144×120px. Cover discs expand separately. The route has six distinct layers: ground shadow, contact shadow, warm sidewall, cream surface, highlight and transverse seams. | Sign off after direct reference/final-image inspection; elliptical top planes and lower-right sidewalls now establish one consistent inclined camera. |
| Topbar density | 2026-09-06 perspective correction: circular cream menu, teal Stage capsule, cream progress capsule with its avatar overlapping the right edge, and Current action share highlight, lower edge and cast shadow. Electron controls stay right; browser leaves no window-control gap. | Sign off; placement and elevation now follow the approved reference composition while progress remains real data. |
| Drawer hierarchy | Warm ivory, teal current selection, disabled Planned stages, chapter divisions and readable lesson states remain. Actual width is 340px, with ten chapters and one scrolling region. | Sign off; narrower than the pictorial reference as explicitly specified; textual lesson markers replace decorative sample thumbnails. |
| Detail type and spacing | Fredoka headings, Nunito dialogue, warm white adult/apricot child bubbles, 56px header and 340px media rail retained. A/B/C and both full Replay Cards remain in order. | Sign off; plain microphone empty state, thinner borders and no thick wood frame are intentional §2/§6 simplifications. Content scrolls to navigation; no copy removed to fit one screenshot. |
| Mobile density | Media tabs, full-width recording action and uninterrupted reading flow remain. 390px wraps long dialogue naturally; no horizontal overflow. Map retains tappable real nodes and sticky current action. | Sign off; neutral toolbar replaces the reference's teal banner, following shared ivory tokens. Sticky action may pass over map content while scrolling, but nodes remain reachable by scrolling. |
| Colors, shadows and frames | Shared colors remain #fffaf2, #402b20, #267f7b, #ffddb0 and #ded2c3. Map chrome, route and discs now use layered 3D shadows; reading surfaces remain restrained and have no enclosing heavy frame. | Sign off; depth is concentrated on the game map rather than spread across lesson content. |

**Above-fold copy diff:** map `12/30` becomes the actual `0/30` (then 2/30 or 30/30), concept-only lesson numbers become 1–30 and real chapter/lesson titles are added. `Stage 1 · I can take part` and `Current lesson` remain. Drawer `Choose a lesson` becomes `Course menu`, `12 of 30 complete` becomes `Stage 1 · 0 / 30 completed`, and `Your account` becomes `My Profile`. Detail retains `The Apple, Please`, `Your Show`, `Record your roleplay`, `Start recording`, `Watch & Learn`, `No demo yet`, `Add demo`, `Read Together`, Part A/B/C, `Replay Together` and `VideoGen · A/B/C prompts`; Replay situation text comes from canonical lessons rather than image placeholders. `Grown-up Notes` is a heading with a separate `Tips for supporting your child` disclosure. No authored dialogue or Replay field was removed.

**Agency-sign-off judgment:** yes, for this scoped responsive implementation against the approved written design and the intentional differences above. This is an engineering visual review, not a claim of outside agency approval or exact pixel duplication of generative concept art. No blocking mismatch in color, typography, shadow, frame, hierarchy or usable composition remained in reviewed captures.

### Perspective correction verification — 2026-09-06

- Accepted concept and final renders were opened with `view_image` in the same QA pass. Native reference comparison used 1536×1024; additional final captures covered 1440×960, real Electron 800×600, 390×844, and 844×390.
- Above-fold copy remains `Stage 1 · I can take part`, real `n / 30`, chapter title/count, real lesson titles, and `Current lesson`. The map-only word `completed` was removed from the progress capsule to match the reference; the course drawer retains its explanatory completion copy.
- Material comparison: route shadow/sidewall/top/highlight are visibly separated; ordinary, current, locked, and completed discs use the same inclined top plane and lower-right light direction; current retains teal double rings and locator; completed retains one binary star.
- Composition comparison: menu/Stage remain left, progress is centered, avatar overlaps the progress edge, Electron controls remain right, and Current lesson occupies its independent reference position on full desktop. Responsive 800px and phone layouts compact without overlap.
- Intentional differences remain those required by live product data: the route and nodes are code-rendered rather than baked into the scene; chapter and lesson labels are visible; uploaded family thumbnails replace concept-only sample children.
- Fresh checks: `npm test` **44 passed**; `.venv/Scripts/python -m pytest -q` **376 passed**; full Playwright/Edge acceptance passed at all four viewports with zero page/console errors; real Electron preload/IPC passed at 800×600. Expected 404s were isolated missing-thumbnail/background fallback probes.

### Limits and follow-ups

Physical camera/microphone behavior, Safari/iOS, touch hardware, notch safe areas, arbitrary OS zoom levels and dragging a visible native window were not physically validated. Native checks exercise real window state APIs and computed drag exclusion in an isolated hidden window; they do not launch the ordinary desktop launcher or inspect a user's open session. Filesystem presence markers prove scanner progress, not decoding of family media. Camera tests exercise a synthetic Edge stream and unsaved playback; production transcoding is covered by the existing Python suite rather than acceptance uploads.

The deferred minor about `map-presentation.test.mjs` extracting textual function boundaries remains a maintainability follow-up. This acceptance now also verifies its key behaviors against the rendered app, so no production-module refactor was added to a documentation/acceptance task. Recording countdown and playback-speed controls remain outside this plan.
