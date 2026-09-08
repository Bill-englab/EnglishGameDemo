# app/ — TigerTales 网站

产品介绍与截图见[根 README](../README.md)；首次安装、架构概览和内容维护入口见[开发指南 / Development guide](../DEVELOPMENT.md)。本文保留应用接口和验收细节。

## Chrome 78 兼容验收

共享脚本保持 Chrome 78 可解析，不使用可选链、空值合并、`replaceChildren`、`Array.at` 或 `Object.hasOwn`。`static/compat.css` 为缺少新版 CSS 功能的浏览器补充封面尺寸、关卡间距和背景定位；新版浏览器继续使用原样式。未增加打包步骤或运行时依赖。

先按本文的隔离预览方式启动 `tools/preview_stone_map.py`，再运行：

```powershell
$env:CHROMIUM78_EXECUTABLE='旧版 Chromium 测试副本的 chrome.exe 完整路径'
$env:STONE_QA_URL='http://127.0.0.1:42173/'
node app/tests-browser/chromium78.cjs
```

测试要求 Node 22+，使用独立浏览器资料目录和临时截图目录，不使用生产账号。`STONE_QA_WIDTH` / `STONE_QA_HEIGHT` 可覆盖默认 390×844。原生 Chromium 78 与现代 Playwright 的协议不完全兼容，所以该测试直接使用 CDP。问题复现、测试结果与限制见 [Chrome 78 验收记录](../docs/plans/2026-09-08-chrome78-compatibility.md)。

应用显示名为 **TigerTales**，npm包名为 `tigertales`。Electron在设置新名称前保留现有 `userData` / `sessionData` 路径，避免因品牌改名切换登录和缓存目录。桌面入口由根目录 `install-shortcut.vbs` 创建 `TigerTales.lnk`。GitHub仓库为 [Bill-englab/TigerTales](https://github.com/Bill-englab/TigerTales)；已有本地目录无需改名。

本地 Flask 应用：把家庭与同伴英语 role-play 录像排成「阶段 → 章 → 课」向上闯关地图。每章一幅整幅背景插画，路和关卡节点叠在上面。通过页面录制，或放一个 `performance.mp4` 到 `recordings/<用户名>/<阶段>/<章>/<课>/`，即可点亮该课、解锁下一课。

新版 4 岁 30 课已按 [`docs/specs/2026-09-04-curriculum-architecture-design.md`](../docs/specs/2026-09-04-curriculum-architecture-design.md) 写入 `curriculum/04` 并通过审查。应用直接读取该结构，当前采用完整连续对话、完整 Replay Card、家长提示和内容版本；三段拆分只用于视频制作。旧 `content/` 仅保留为 v1 参考。

## Setup（一次性）

```bash
cd app
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# macOS/Linux:  .venv/bin/python -m pip install -r requirements.txt
```

## 运行

```bash
cd app
.venv/Scripts/python app.py      # 开 http://127.0.0.1:18050
```

或从仓库根双击 `run.bat`（Windows，自动开浏览器）。

本地缺少 `config.json` 时使用开发账号 `admin` / `admin123`，session secret 每次进程启动随机生成。自部署必须从 `config.example.json` 复制并替换两个 `CHANGE_ME` 占位值；固定默认密码、过短 secret 和损坏 JSON 会直接阻止启动。详见 [`DEPLOY.md`](../DEPLOY.md)。

## 课程与三棵媒体树（默认相对仓库根）

| 环境变量 | 默认 | 作用 |
| --- | --- | --- |
| `CURRICULUM_ROOT` | `../curriculum` | 新版分年龄课程文案 |
| `CURRICULUM_STAGE` | `04` | 当前网站展示的年龄 Stage |
| `DEMO_ROOT` | `../demo` | AI 演示视频 |
| `RECORDINGS_ROOT` | `../recordings` | 孩子表演录像 |
| `PROMPTS_ROOT` | `../prompts` | 可选的 A/B/C 视频提示词 |
| `PROFILES_ROOT` | `../profiles` | 私有头像与昵称（不入 Git） |

可分别用环境变量覆盖（测试或挂载别的内容库时用）。

## 路由

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/` | 地图页 |
| GET | `/api/library` | 带状态标注的章/关树（JSON） |
| GET | `/video/<chapter>/<level>/<kind>` | `demo` 或 `performance` 视频（非法 kind / 路径越界 / 文件不存在均 404） |
| POST | `/upload/<chapter>/<level>/<kind>` | 上传视频到对应树（流式写盘，500MB 上限，同样有路径越界守卫） |
| GET | `/api/prompts/<chapter>/<level>` | 返回当前 Stage 该课的 Sora prompt 文本（Part A + B + C，JSON） |

上传后前端自动刷新 library，关卡状态实时更新。

## 课程详情

桌面采用 56px 单行标题栏、左 340px 媒体栏/右对话；小于768px切换为视频页签＋单列阅读。**Your Show → Start recording** 进入摄像头，**Watch & Learn → Add demo** 添加示范。完整连续对话、完整复练顺序展示，只让页面滚动。家长说明与 **VideoGen · 3 clips** 默认独立折叠；[30课90份提示词](../prompts/04/README.md)以 Clip 1/2/3 展示，均可复制。暖白、可可、青绿与杏色 token 与地图、目录和资料页共用。

详情重排不改变地图、课程、进度或文件存储。返回地图/换课会释放摄像头和预览资源；没有新增未保存确认或录像历史。设计与验证见[实施记录](../docs/plans/2026-09-04-detail-reading-redesign.md)。

可选浏览器回归 `node tests-browser/detail-upload.cjs` 检查演示上传完成时保留正在录制/尚未保存的表演。它需要已有的 Playwright、Microsoft Edge 和可运行 Flask 的 Python，不属于默认两套测试。脚本自启临时端口与临时账号/媒体目录，拦截上传，不读取家庭录像、不启动媒体扫描，退出时清理自有测试服务与临时目录。无需为应用本身增加浏览器测试依赖。

## 个人资料

右上角账号菜单 → **My Profile**：选择照片、预览并保存，修改昵称，或恢复默认头像。取消不会保存草稿；登录用户名与录像路径不变。首次升级后旧会话需要重新登录一次。

支持 JPEG、PNG、静态 WebP（最多 5 MiB / 1600 万像素），HEIC 请先导出 JPEG。后端使用 Pillow 校正方向、居中裁切为 256×256 JPEG 并移除照片元数据，不保留原图。部署时重新安装 `requirements.txt` 中的依赖。

资料独立存于 `profiles/u-<用户名的 ASCII 十六进制>/`，例如 alice 为 `u-616c696365`；这种编码避免 Windows 大小写账号碰撞。目录包含 `profile.json`、随机命名头像与持久 `.lock`；不要手动删除运行中的锁文件。删除账号会清理资料，不删除表演录像。头像通过登录接口返回，不放进公开静态目录。

`GET/POST /api/profile` 读取/保存当前用户资料；POST 需要 GET 返回的 csrfToken（请求头 X-CSRF-Token）。`GET /api/profile/avatar` 仅返回自己的头像；`/api/me` 增加 displayName/avatarUrl。新接口限制整请求 6 MiB，不改变视频 500 MiB 上限。

设计与边界见[个人资料规范](../docs/specs/2026-09-04-personal-profile-design.md)。

## 地图、目录与响应式背景

`/api/library` 经 `adventure-navigation.mjs` 投影真实完成数、章节计数与 current；`adventure-shell.mjs` 管理浮动外壳和目录焦点。顶部菜单、Stage、窄进度条和独立头像紧凑排列在左侧；桌面高度64px、平板60px、手机56px。账户弹层在可用高度内独立纵向滚动。**Current lesson** 只滚动并聚焦当前节点。完成为一颗金色星章（只表示已有 performance，不是评分）、current 为定位针、locked 为锁；所有节点都可查看。新完成的 performance 在本次页面会话仅触发一次非阻断星章/章节庆祝，刷新或重录不重复。只有当前用户的 performance 文件改变进度。Stage 1 对应 `curriculum/04`，Stage 2/3 为禁用的 Planned 占位。

十章使用 [worlds-map 的细节场景](static/worlds-map/README.md)：桌面选择原生1536×1024横图，手机选择1024×1536竖图，完整覆盖地图宽度，没有左右草地拼接。纵向按图像比例分条重叠，避免一张图拉伸覆盖整章。场景接近视口800px时才加载，和路径等速滚动。石台与踏石均有贴地阴影和右下投影。桌面图缺失先尝试本章竖图，再回退到本章 [v2桌面/手机图](static/worlds-v2/README.md)、旧WebP/PNG/JPG、材质底色；不循环其他章的图。768px断点重选横竖图，不重建节点或录制DOM。

## Web 弱网加载与缓存

地图实际加载 `static/map-assets/` 中带内容哈希的 WebP，原PNG只保留为素材源。24张派生图合计17.07MB（原图86.17MB）；背景不降低分辨率。图片可长期缓存，脚本和样式重新验证。封面和录像使用稳定URL及私有重新验证，上传替换后仍能取得新内容。

会话与课程请求15秒超时后显示重试；模块加载失败也会显示错误，模块迟迟不返回时30秒结束等待。服务端明确返回 `.mjs` 的JavaScript类型。部署必须同时更新后端、全部静态文件与两个素材清单，并重启服务。如果反向代理自行托管静态资源，应保留上述缓存与MIME策略。

移动登录验收：从仓库根运行 `app/.venv/Scripts/python tools/preview_stone_map.py --port 42172 --login`，使用临时账号 `preview` / `preview-only`。保持预览运行，设置 `STONE_QA_URL=http://127.0.0.1:42172/`，运行 `node app/tests-browser/loading-cache.cjs`。该脚本依赖已有Playwright/Edge，验证真实登录、2Mbps网络、刷新缓存、接口/模块挂起与重试。完整结果见[验收记录](../docs/plans/2026-09-08-web-loading-acceptance.md)。

## 测试

测试数量以当前命令输出为准。旧版地图的修正记录见[2026-09-05 UI 验收记录](../docs/plans/2026-09-05-adventure-feedback-ui-acceptance.md)，当前石头地图验收入口见下文。

```bash
cd app
.venv/Scripts/python -m pytest            # Python：后端逻辑 + 路由 + 上传
npm test                                   # JS：前端纯模块（零依赖，仅 node --test）
# 或直接： node --test tests-js/*.test.mjs
```

> ⚠️ JS 测试必须用 glob `tests-js/*.test.mjs`，传目录会失败。

可选完整验收（不增加应用依赖；需要已有 Playwright、Edge 和满足 requirements 的 Python）：

```powershell
$env:NODE_PATH='<existing Playwright node_modules>'
$env:TOY_QA_PYTHON='<Python executable with app requirements>'
# 可选：本机已安装 Electron 时验证真实 preload 和原生窗口 IPC
$env:TOY_QA_ELECTRON='1'
# 可选：保存截图到你指定的独立 QA 目录
$env:TOY_QA_OUTPUT='<QA screenshot directory>'
node tests-browser/modern-toy-ui.cjs
# 本轮聚焦回归（每条独立构造临时数据）
node tests-browser/modern-toy-ui.cjs --focus=route
node tests-browser/modern-toy-ui.cjs --focus=navigation-celebration
node tests-browser/modern-toy-ui.cjs --focus=cancel-celebration
node tests-browser/modern-toy-ui.cjs --focus=accessible-state
node tests-browser/modern-toy-ui.cjs --focus=account
node tests-browser/modern-toy-ui.cjs --focus=evidence
node tests-browser/modern-toy-ui.cjs --focus=scenic-route
# 可选聚焦回归：selection / account / refresh / electron（electron 同时需要 TOY_QA_ELECTRON=1）
$env:TOY_QA_FINAL_FIX='selection'
node tests-browser/modern-toy-ui.cjs
Remove-Item Env:TOY_QA_FINAL_FIX
```

脚本自启临时端口 Flask，复制课程到临时根，隔离账号、配置、资料和媒体。演示及故障上传场景会拦截请求，成功表演回归只把生成的测试视频写入临时媒体根；不执行 `app.py` 主入口或媒体扫描。最终清理自有浏览器、服务和临时根，不复用用户窗口。默认不启动 Electron；启用后用真实二进制、真实 preload 和独立 userData 的隐藏窗口检查最小化/最大化/关闭、拖动区与800×600布局。浏览器检查1440×960、800×600、390×844、844×390、目录焦点、真实0/30→2/30与延迟demo上传时的录制保留。人工摄像头、Safari/iOS不在自动验收范围。

## 石台地图与独立预览

普通入口已使用完整 30 关石台地图：矩形缩略图、单颗完成星章、左右交替踏石；每章背景与路径同步滚动，章节标题前留出通路。顶部菜单、Stage、进度与独立头像保持左侧紧凑排列。详情、录制与课程状态沿用原有流程。

从仓库根运行 `app/.venv/Scripts/python tools/preview_stone_map.py`，打开输出的本地地址即可查看隔离预览。`?map-sample=1` 仍可只展示前三关作对照。

独立预览使用临时课程副本、独立登录 Cookie 和前三关的虚构示例画面，禁止写入，不读取家庭录像或真实账号配置。日常使用仍通过正常 Web/Electron 入口读取自己的媒体；完成关优先显示表演首帧，其他关显示 demo 缩略图，缺媒体时保留编号石台与占位画框。媒体接近屏幕时才加载。

预览同时复制 Stage 04 的全部 30 课 / 90 份提示词。详情页 Watch & Learn 下的 **VideoGen · Get prompts** 会展开并定位到 A/B/C 提示词；分别 Copy 到视频制作工具生成三段，拼接后用 Add demo / Replace 上传。网站本身不连接视频生成服务；隔离预览只允许查看和复制。预览运行期间修改课程或提示词后，需要重启预览更新临时副本。请求失败提供 **Retry prompts**，成功返回空内容才显示缺少提示词。

可选验收（先保持上述预览运行；使用已有 Playwright 和 Edge）：

```powershell
cd app
$env:NODE_PATH='<existing Playwright node_modules>'
$env:STONE_QA_URL='<printed preview URL including ?map-sample=1>'
$env:STONE_QA_OUTPUT='<QA screenshot directory>'
$env:STONE_QA_ELECTRON='1' # 可选，需本地已安装 Electron
node tests-browser/stone-map-sample.cjs
node tests-browser/stone-map-full.cjs
node tests-browser/videogen.cjs
```

覆盖 30 关编号、10 章衔接、左右交替路径、同步滚动、六种窗口尺寸、详情往返、当前关定位、资料菜单、完成反馈、全完成/空课程、背景回退，以及独立隐藏 Electron 窗口和真实 preload。保存验收只在测试浏览器拦截请求，不向预览或家庭媒体目录写入。

## 结构

```
app/
  app.py            # Flask 路由：/、/api/library、/video、/upload
  scanner.py        # 纯逻辑：投影 curriculum/ + 算关卡三态（保留 v1 扫描兼容）
  profile_store.py  # 头像解码与隐私处理、昵称校验、原子存储与文件锁
  templates/map.html
  static/
    app.js          # 主逻辑：渲染地图、完整对话详情、录制与上传 UI
    profile.mjs     # 独立的资料面板、草稿、上传与账号显示
    profile-model.mjs # 昵称纯校验（与后端语义一致）
    profile.css     # 资料面板样式，不重排地图
    lesson-view.mjs # 纯：对话分段、Replay Card、章节上下文
    detail-media.mjs # 纯：窄屏页签可见性，录制保持表演面板
    adventure-navigation.mjs # 纯：Stage 展示、真实完成计数、current 目标
    adventure-shell.mjs # DOM：浮动外壳、课程目录、焦点锁与滚动恢复
    world-assets.mjs # 纯：20 张响应式图与本章旧图候选
    map-model.mjs   # 纯：10 章主题（world + accent）、视觉状态、旋转、帧暗检测
    map-path.mjs    # 纯：保留完整邻点的 Catmull-Rom 路径，支持按端点区间绘制内线
    map-interactions.mjs # DOM：current 焦点、待庆祝队列、动效取消/视图清理与加载错误
    style.css       # 现代玩具剧场共享 token、地图/详情/目录 + 自托管字体
    stone-map.mjs   # 30 关石台地图、媒体延迟加载、章节背景尺寸与踏石布局
    stone-map.css   # 石台美术、同步滚动场景、紧凑顶部控件
    fonts/          # 自托管 woff2（Fredoka/Nunito，离线可用）
    worlds/         # 本章旧图回退
    worlds-v2/      # 10 世界 × desktop/mobile WebP
  tests/  tests-js/  tests-browser/
  package.json      # 仅挂 "test" 脚本，零依赖
```

纯逻辑在 `map-model.mjs` / `map-path.mjs` 等模块（有测试）；地图编排在 `app.js`，个人资料 DOM 生命周期在 `profile.mjs`。
