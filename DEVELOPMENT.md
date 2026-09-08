# TigerTales 开发指南 · Development guide

本指南集中说明安装、运行、开发和内容维护。产品介绍与界面截图见 [README](README.md)；接口和测试环境细节见 [app/README.md](app/README.md)，协作约定见 [AGENTS.md](AGENTS.md)。

This guide covers setup, development, and content maintenance. See the [README](README.md) for the product tour, [app/README.md](app/README.md) for API and test-environment details, and [AGENTS.md](AGENTS.md) for contributor conventions.

<a id="setup"></a>

## 1. 安装与启动 · Setup and launch

需要 Python 3.11+；JS 测试需要 Node.js 22+，Windows 桌面版还需要安装 Electron。Web 前端使用原生 ES Modules，没有前端构建步骤。

Use Python 3.11+. JavaScript tests require Node.js 22+, and the Windows desktop shell also requires Electron. The Web frontend uses native ES Modules with no frontend build step.

```bash
git clone https://github.com/Bill-englab/TigerTales.git
cd TigerTales
```

已有仓库可继续使用原来的本地目录名。 / An existing checkout can keep its current local directory name.

**Windows / PowerShell**

```powershell
cd app
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

**macOS / Linux**

```bash
cd app
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py
```

浏览器打开 <http://127.0.0.1:18050>。开发重载可设置 `FLASK_DEBUG=1`，默认关闭。Windows 后续可从仓库根运行 `run.bat`。

Open <http://127.0.0.1:18050>. Set `FLASK_DEBUG=1` for development reloads; it is off by default. On Windows, use the root `run.bat` for subsequent browser launches.

### Windows 桌面版 · Windows desktop

完成 Python 配置后，先停止正在运行的浏览器版服务，在 `app/` 安装桌面依赖：

After setting up Python, stop any running browser-version server and install the desktop dependencies in `app/`:

```powershell
npm install
```

从仓库根双击 `launch.vbs`。运行一次 `install-shortcut.vbs` 可创建 TigerTales 快捷方式。Electron 启动本地 Flask 服务并加载共享页面，关闭窗口时结束其服务。

Open `launch.vbs` from the repository root. Run `install-shortcut.vbs` once to create a TigerTales shortcut. Electron starts the local Flask service, loads the shared page, and stops its service when the window closes.

### 登录与配置 · Login and configuration

没有 `app/config.json` 时，本地开发使用 `admin` / `admin123` 和临时会话密钥。持久配置从 `app/config.example.json` 复制并替换密码与密钥；损坏或不安全的配置会拒绝启动。自部署前按 [DEPLOY.md](DEPLOY.md) 配置认证与 HTTPS。

Without `app/config.json`, local development uses `admin` / `admin123` and an ephemeral session secret. For a persistent configuration, copy `app/config.example.json` and replace the password and secret. Invalid or insecure configurations prevent startup. Follow [DEPLOY.md](DEPLOY.md) for authentication and HTTPS before self-hosting.

真实配置、`app/users.json`、用户资料和录像不入库。管理员通过 `/admin` 管理用户；录制需要摄像头和麦克风权限。

Keep real configuration, `app/users.json`, user profiles, and recordings out of Git. Administrators manage users at `/admin`; recording requires camera and microphone permission.

## 2. 架构与目录 · Architecture and layout

| 位置 / Location | 职责 / Responsibility |
| --- | --- |
| `app/app.py` | Flask 路由、认证、上传、提示词接口与视频处理 / Routes, authentication, uploads, prompt API, and video processing. |
| `app/scanner.py` | 将课程和媒体投影为地图状态 / Projects curriculum and media into map states. |
| `app/templates/`、`app/static/` | Web 与 Electron 共用的 HTML、CSS 和原生 JS / Shared HTML, CSS, and native JavaScript. |
| `electron/` | Windows 窗口、preload 与本地服务生命周期 / Windows shell, preload, and server lifecycle. |
| `curriculum/04/` | 当前 Stage 1 的唯一课程创作源 / Canonical source for the current Stage 1. |
| `prompts/04/` | 从课程与分镜导出的三段制作提示词 / Three clip prompts exported from lessons and staging. |
| `demo/` | 本地示范视频与缩略图 / Local demos and thumbnails. |
| `recordings/`、`profiles/` | 用户表演与个人资料 / User performances and profiles. |
| `tools/`、`app/tests*` | 内容校验、隔离预览及测试 / Content validation, isolated preview, and tests. |

文件系统承担存储，没有数据库。前端没有框架、打包器或 npm 运行时依赖；`app/package.json` 提供测试入口与 Electron 开发依赖。字体和场景素材本地提供。

Storage is filesystem-based, with no database. The frontend has no framework, bundler, or npm runtime dependencies; `app/package.json` provides test scripts and the Electron development dependency. Fonts and scenery are local assets.

### 共享前端 · Shared frontend

- `app.js`：数据加载、地图与详情编排、录制和上传。 / Data loading, map/detail orchestration, recording, and uploads.
- `stone-map.mjs` / `stone-map.css`：画框、石台、单颗完成星和左右交替踏石。 / Frames, pedestals, one completion star, and alternating stepping stones.
- `stone-worlds.mjs`：全宽背景与路径同层滚动，响应式选择横竖素材。 / Full-width scenery scrolling with the route, with responsive landscape/portrait assets.
- `adventure-navigation.mjs` / `adventure-shell.mjs`：真实进度、目录、焦点和滚动管理。 / Progress, course menu, focus, and scroll management.
- `lesson-view.mjs` / `detail-media.mjs`：课程呈现辅助与媒体页签状态。 / Lesson presentation helpers and media tab state.
- `titlebar.js`：仅在 Electron 注入窗口控件。 / Injects window controls only in Electron.

顶部菜单、Stage、窄进度条和独立头像固定在左侧。桌面详情将媒体与阅读区分列；手机使用媒体页签和单列正文。完成封面优先取表演首帧，其他状态使用示范缩略图或占位画框。

The menu, Stage, narrow progress bar, and separate avatar stay at the top left. Desktop details use media and reading columns; phones use media tabs and one reading column. Completed covers prefer the performance's first frame; other states use a demo thumbnail or placeholder.

### 存储与状态 · Storage and state

默认路径相对仓库根。以下环境变量可用于测试或自有服务器挂载：

Defaults are relative to the repository root. Override these for tests or self-hosted mounts:

| 环境变量 / Variable | 默认 / Default |
| --- | --- |
| `CURRICULUM_ROOT` | `curriculum/` |
| `CURRICULUM_STAGE` | `04`（界面显示 Stage 1 / displayed as Stage 1） |
| `DEMO_ROOT` | `demo/` |
| `RECORDINGS_ROOT` | `recordings/` |
| `PROMPTS_ROOT` | `prompts/` |
| `PROFILES_ROOT` | `profiles/` |

示范路径为 `demo/04/<chapter>/<lesson>/demo.mp4`；表演路径为 `recordings/<username>/04/<chapter>/<lesson>/performance.mp4`，也支持 `.webm`。只有当前用户的表演决定完成状态：第一关可开始，前一关完成后解锁下一关，第一节未完成且已解锁的课为 current。Locked 仍可预览。

Demos live at `demo/04/<chapter>/<lesson>/demo.mp4`; performances at `recordings/<username>/04/<chapter>/<lesson>/performance.mp4`. Both also support `.webm`. Completion depends only on the current user's performance: the first lesson is unlocked, completing one unlocks the next, and the first unlocked incomplete lesson is current. Locked lessons remain previewable.

上传流式写盘，后端用 ffmpeg 压缩较大的视频并补示范缩略图；找不到系统 ffmpeg 时使用 `imageio-ffmpeg`。常规 `app.py` 启动会扫描并优化媒体，因此视觉测试使用下文的隔离预览。

Uploads stream to disk. The backend uses ffmpeg to compress larger videos and generate demo thumbnails, with `imageio-ffmpeg` as a fallback. Normal `app.py` startup scans and optimizes media, so use the isolated preview below for visual checks.

头像会缩放并去除嵌入元数据，昵称和头像变更不影响用户名与录像路径。接口、限制与存储细节见[个人资料规范](docs/specs/2026-09-04-personal-profile-design.md)。

Avatars are resized and stripped of embedded metadata. Profile changes do not alter usernames or recording paths. See the [profile specification](docs/specs/2026-09-04-personal-profile-design.md) for API, limits, and storage details.

## 3. 测试与隔离预览 · Tests and isolated preview

在 `app/` 运行对应层的测试。纯文档修改检查链接与截图即可；涉及行为时运行对应测试并验收页面。

Run the relevant layer's tests from `app/`. For documentation-only edits, verify links and screenshots; for behavior changes, run the applicable tests and inspect the UI.

```powershell
# Windows, from app/
.\.venv\Scripts\python.exe -m pytest -q
npm test
```

```bash
# macOS / Linux, from app/
.venv/bin/python -m pytest -q
npm test
```

直接调用 JS 测试时使用 `node --test tests-js/*.test.mjs`，不要传目录。前端语法可用 `node --check static/app.js` 或具体 `.mjs` 文件检查。

For direct JS test invocation, use `node --test tests-js/*.test.mjs`, not a directory argument. Check frontend syntax with `node --check static/app.js` or the specific `.mjs` file.

**隔离地图预览 / Isolated map preview**（从仓库根运行 / run from the repository root）：

```powershell
.\app\.venv\Scripts\python.exe tools/preview_stone_map.py --port 42170
```

打开输出的 `PREVIEW_URL`；`?map-sample=1` 仅展示前三关。工具复制课程与提示词到临时目录，使用虚构媒体、临时账号和只读接口，不扫描家庭录像。退出时清理临时数据。README 截图来自此环境。

Open the printed `PREVIEW_URL`; `?map-sample=1` shows only the first three lessons. The tool copies curriculum and prompts into temporary storage, uses fictional media and a temporary account, and exposes read-only routes without scanning family recordings. Temporary data is removed on exit. README screenshots use this environment.

已有 Playwright 和 Edge 时，保持预览运行，可执行完整地图与 VideoGen 验收：

With Playwright and Edge already available, keep the preview running and execute the map and VideoGen checks:

```powershell
$env:STONE_QA_URL='http://127.0.0.1:42170/'
node app/tests-browser/stone-map-full.cjs
node app/tests-browser/videogen.cjs
```

依赖位置与 Electron 验收设置见 [app/README.md](app/README.md)。旧 `modern-toy-ui.cjs` 全量视觉断言属于旧地图；当前使用 `stone-map-full.cjs`。不要为 QA 运行 `electron/main.cjs`，它会操作生产服务和 18050 端口；使用测试脚本的独立 Electron 环境。

See [app/README.md](app/README.md) for dependency paths and Electron checks. Full visual assertions in `modern-toy-ui.cjs` belong to the older map; use `stone-map-full.cjs` for the current one. Do not run `electron/main.cjs` for QA: it manages the production service and port 18050. Use the harness's isolated Electron environment.

## 4. 课程与示范维护 · Curriculum and demo maintenance

`curriculum/` 是唯一课程创作源。当前 30 课采用 `continuous-dialogue-v1`：`lesson.json` 中 `dialogue.turns` 保存完整对话；三段约 10 秒的拆分只用于视频制作，保存在逐课 `production.json`，不作为学习分段。旧 `content/` 和根级旧提示词仅供历史参考。

`curriculum/` is the canonical authoring source. The current 30 lessons use `continuous-dialogue-v1`: `lesson.json` stores one complete conversation in `dialogue.turns`. Three roughly 10-second clips are a production-only split in each lesson's `production.json`, not learning sections. The old `content/` and root-level legacy prompts are historical references.

修改前先读[课程架构](docs/specs/2026-09-04-curriculum-architecture-design.md)、[连续对话规范](docs/specs/2026-09-06-continuous-dialogue-content-design.md)和[台词风格指南](docs/specs/2026-09-06-dialogue-authoring-style.md)。修改后递增内容版本、重新审查并同步制作版本，再导出提示词。

Before editing, read the [curriculum architecture](docs/specs/2026-09-04-curriculum-architecture-design.md), [continuous-dialogue specification](docs/specs/2026-09-06-continuous-dialogue-content-design.md), and [dialogue style guide](docs/specs/2026-09-06-dialogue-authoring-style.md). Increment the content revision after changes, review it, synchronize production revisions, and export prompts.

```powershell
# From the repository root
.\app\.venv\Scripts\python.exe tools/validate_curriculum.py --stage 04 --complete
.\app\.venv\Scripts\python.exe tools/build_video_prompts.py --stage 04 --check
# Regenerate only after reviewing source changes:
.\app\.venv\Scripts\python.exe tools/build_video_prompts.py --stage 04 --write
```

提示词台词逐字来自课程，不直接维护导出文件内的第二份台词。原始导出保留来源与版本元数据以供核对；VideoGen 接口在展示和复制前去掉内部元数据头。30 课的 90 份提示词不等于完成的视频，也不等于 `video_ready` 审批。

Prompt dialogue is exported verbatim; do not maintain a second copy in generated files. Raw exports retain source and revision metadata; the VideoGen API removes that internal header before display and copying. Ninety prompts across 30 lessons do not imply finished videos or `video_ready` approval.

角色外形、克制表演、分镜审查与合成流程见[示范制作指南](prompts/README.md)，课程审查见 [FINAL-REVIEW.md](curriculum/04/FINAL-REVIEW.md)。生成并检查后，将视频放入对应 Stage 目录或通过 **Add demo** 上传，更新[制作进度](demo/PROGRESS.md)。表演录像不可再生，应另行备份，见 [recordings/README.md](recordings/README.md)。

See the [production guide](prompts/README.md) for cast, restrained acting, staging review, and assembly, and [FINAL-REVIEW.md](curriculum/04/FINAL-REVIEW.md) for curriculum review. Place reviewed demos in their Stage directories or upload with **Add demo**, then update the [production record](demo/PROGRESS.md). Performances cannot be regenerated; back them up as described in [recordings/README.md](recordings/README.md).

## 5. 品牌与进一步参考 · Branding and references

产品名为 **TigerTales**，npm 包名为 `tigertales`。`electron/branding.cjs` 设置显示名时保留已有 `userData` / `sessionData` 路径，避免改名丢失登录与浏览器资料。GitHub 仓库为 [Bill-englab/TigerTales](https://github.com/Bill-englab/TigerTales)，本地文件夹无须改名。

The product name is **TigerTales**, and the npm package name is `tigertales`. `electron/branding.cjs` preserves existing `userData` / `sessionData` paths when setting the display name, retaining sessions and browser data across the rename. The repository is [Bill-englab/TigerTales](https://github.com/Bill-englab/TigerTales); the local folder need not be renamed.

- [应用接口与运行细节 / App APIs and runtime details](app/README.md)
- [自有服务器部署 / Self-hosting](DEPLOY.md)
- [协作约定 / Contributor conventions](AGENTS.md)
- [设计文档索引 / Design documentation index](docs/README.md)
- [石头地图实施记录 / Stone-map implementation](docs/superpowers/plans/2026-09-07-stone-map-rollout.md)
