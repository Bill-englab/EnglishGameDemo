# AGENTS.md

> 本文件面向后续接手的 AI agent（以及人类协作者）。读完它，你应该能在不动错地方的前提下开始改这个项目。
> 产品背景与设计取舍见根目录 [`README.md`](README.md)；本文是「操作手册」，README 是「产品文档」。每个顶层目录还有各自的 `README.md` 作为索引。

---

## 1. 这个项目是什么

**My English Adventure** —— 一个**本地运行**的小网站，把父子线下英语 role-play 的录像排成一条「章 → 关」的向上闯关地图（参考 Two Dots）。每过一关，地图上那个点就亮起来，变成**孩子自己录像里的画面**。

### 必须先理解的三个产品认知（违反这些会做错方向）

1. **网站不是教学引擎，是「奖杯陈列柜」。** 真正的英语教学发生在线下父子 role-play。网站只做两件事：把完成的 role-play 可视化成进度；让孩子反复回看自己的表演录像。
2. **给孩子多巴胺的不是星星，是回头看自己的表演。** 星星只是入口，「我的表演回放」才是主舞台。所以点亮的关卡，圆点变成 demo 动画的画面，点击进入详情页看表演录像。
3. **句式高级度不由网站量化。** 那是线下目标。网站只做二元判定：有没有 `performance` 视频（`.mp4` 或 `.webm`）。

### 明确排除的事（别去实现）

- ❌ 教学引擎 / AI 对话搭档
- ❌ 1/2/3 星分级（一颗星，二元）
- ❌ 公网部署（仅本地跑）
- ❌ 用星星追踪「句式高级度」
- ❌ 构建工具 / npm 依赖 / 数据库（原生 ES Modules，无打包）

---

## 2. 仓库布局

```
D:/TaviusProject/                      # 仓库根（git: master 分支）
├── README.md                          # 产品文档
├── AGENTS.md                          # 本文件
├── run.bat                            # Windows 一键启动（cd app/）
├── .gitignore / .gitattributes        # LF 强制；视频本地 only
│
├── app/                               # Flask 网站（后端 + 前端 + 测试）—— 代码核心
│   ├── README.md                      # 如何运行/测试
│   ├── package.json                   # 零依赖，仅挂 "test" 脚本（npm test）
│   ├── app.py                         # Flask 路由 + 三棵内容根 + 上传
│   ├── scanner.py                     # 纯逻辑：扫 content/ + 算关卡三态
│   ├── requirements.txt               # flask>=3.0, pytest
│   ├── templates/map.html             # 地图页外壳 + 详情导航
│   ├── static/
│   │   ├── app.js                     # 主逻辑：渲染、详情导航、PC 摄像头录制、封面抽取
│   │   ├── map-model.mjs              # 纯：10 章主题(world+accent)、视觉状态、旋转、帧暗检测
│   │   ├── map-path.mjs               # 纯：Catmull-Rom 平滑路径
│   │   ├── style.css                  # 绘本风样式（背景插画+节点+详情）+ 自托管 @font-face
│   │   ├── fonts/                     # 自托管 woff2（Fredoka/Nunito，离线可用）
│   │   └── worlds/                    # 每章背景插画（<章节名>.jpg，竖版 9:16）
│   ├── tests/                         # pytest：test_scanner.py, test_app.py（含上传）
│   ├── tests-js/                      # node --test：map-model/path .test.mjs
│   └── .venv/                         # 本地虚拟环境（gitignored）
│
├── content/                           # 课程文案 —— 文件系统即数据库，入库
│   ├── README.md                      # 章/关/meta.json 约定
│   └── 01-wants-requests/             # 章（10 个，零填充前缀）
│       ├── dialogues.md               # 本章对话源（scaffold_levels.py 的输入）
│       ├── 01-can-i-have/meta.json    # 关（每章 3 个）
│       └── 02-i-need/ … 03-can-we/
│       … 02-refusing-bargaining/ … 10-planning-predicting/
│
├── demo/                              # AI 演示视频 —— gitignored，可再生
│   ├── README.md                      # demo 生产流程
│   ├── PROGRESS.md                    # demo 生产进度表（7/30，手维护）
│   └── 01-wants-requests/01-can-i-have/demo.mp4 …
│
├── recordings/                        # 孩子表演录像 —— gitignored，珍贵不可再生
│   ├── README.md                      # 「放文件即点亮」工作流 + 备份提醒
│   └── 01-wants-requests/01-can-i-have/performance.mp4 …
│
├── prompts/                           # 每关的 Sora demo 提示词（两段式 a/b），入库
│   ├── README.md                      # 角色设定 + 节奏说明 + 索引
│   └── 01-wants-requests/D1a.txt, D1b.txt …
│
├── tools/                             # 脚本
│   ├── README.md
│   └── scaffold_levels.py             # 从 dialogues.md 生成 meta.json
│
└── docs/                              # 设计文档
    ├── README.md                      # 文档索引
    ├── specs/                         # 设计规格
    ├── plans/                         # 实施计划
    ├── archive/                       # 冻结的历史基线（原 .vibe/）
    └── twodots-reference.jpeg         # Two Dots 风格参考图
```

> **视频不入库**：所有 `demo/**/*.mp4`、`recordings/**/*.mp4` 被 `.gitignore` 忽略（体积 + 隐私）。仓库只跟踪 `content/` 的 `meta.json`/`dialogues.md`、`prompts/` 的提示词等文案。克隆后本地没有视频，地图上对应关卡显示空状态——这是预期的。

---

## 3. 技术栈

| 层 | 技术 | 关键约束 |
| --- | --- | --- |
| 后端 | Python / Flask（单文件 `app/app.py`） | 无数据库、无构建；有页面内上传（流式写盘） |
| 数据 | 文件系统（三棵树 = 数据库） | 文件夹名零填充前缀，字符串排序即预期顺序；三棵树的 `<章>/<关>` 同名 |
| 前端 | 原生 HTML/CSS/JS（ES Modules） | **无构建步骤、无打包器、无 npm 依赖**。`.mjs` 直接由浏览器加载 |
| 字体 | 自托管 woff2（`app/static/fonts/`） | 离线可用，不走 Google CDN |
| 测试 | pytest（Python）+ `node:test`（JS） | 见下文「测试」一节 |
| Python | 3.11（`.venv`） | `requirements.txt` 仅 `flask>=3.0, pytest` |
| Node | v22+（`node --test`） | `package.json` 零依赖，只挂 `npm test` 脚本 |

**没有 npm/pip 之外的工具链。** 改前端不需要装任何东西；改后端只需一个 venv。

---

## 4. 如何运行

### 首次初始化（一次性）

```bash
cd app
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# macOS/Linux:  .venv/bin/python -m pip install -r requirements.txt
```

### 启动开发服务器

```bash
cd app
.venv/Scripts/python app.py          # 然后开 http://127.0.0.1:5000
```

或从仓库根双击 `run.bat`（Windows，自动开浏览器）。`app.run(debug=True, port=5000)`——改 Python 文件会自动重载。

### 三棵内容根（环境变量，默认相对仓库根）

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `CONTENT_ROOT` | `<repo>/content` | 课程文案（meta.json、dialogues.md） |
| `DEMO_ROOT` | `<repo>/demo` | AI 演示视频 |
| `RECORDINGS_ROOT` | `<repo>/recordings` | 孩子表演录像 |

可分别覆盖（测试或挂载别的内容库时用）。

### 调试单接口

```bash
curl -s http://127.0.0.1:5000/api/library | head
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/
```

---

## 5. 如何测试

**两套独立测试，都要跑。** 改了对应层的代码后，务必跑对应测试。

### Python 测试（后端逻辑 + 路由 + HTML 外壳）

```bash
cd app
.venv/Scripts/python -m pytest        # 全量（约 25 个）
.venv/Scripts/python -m pytest -v
.venv/Scripts/python -m pytest tests/test_scanner.py -v   # 单文件
```

测试用 `tmp_path` 临时目录构造假内容库（content + demo + recordings 三棵），`monkeypatch` 替换 `CONTENT_ROOT/DEMO_ROOT/RECORDINGS_ROOT`，不碰真实内容。

### JS 测试（前端纯模块逻辑）

```bash
cd app
npm test                              # ✅ 等价于下面那条
node --test tests-js/*.test.mjs       # ✅ 正确：必须用 glob
node --test tests-js/map-path.test.mjs # 单文件
```

> ⚠️ **坑**：`node --test tests-js/`（传目录）会失败。**必须用 glob `tests-js/*.test.mjs` 或显式列文件**（或直接 `npm test`）。这是 Node test runner 对无 `package.json` 项目的目录发现限制——现已用 `package.json` 的 `test` 脚本封装。

### 当前测试覆盖什么

- `test_scanner.py`：扫描排序、`meta.json` 回退、`has_demo`/`has_performance` 跨树检测、**webm 格式检测**、三态机、跨章状态传递、全完成无 current。
- `test_app.py`：三个 GET 路由、视频 404 边界（缺文件 / 非法 kind / 路径越界）、上传路由（写盘 / 路径越界 / 非法 kind / 无文件 / 建目录）、**webm 上传存正确扩展名 + serve 正确 mimetype + 重录换格式删旧文件**、HTML 外壳含所有关键 `id`、可重试加载逻辑、静态模块可 serve、字体自托管。
- `tests-js/*.test.mjs`：10 章 10 个不同 world + hex accent、视觉状态、旋转稳定有界、暗帧检测、平滑路径。

### 改代码时的自检顺序

1. `node --check static/<file>.mjs`（或 `app.js`）—— 快速语法检查。
2. `npm test` —— 改了前端纯模块就跑。
3. `.venv/Scripts/python -m pytest -q` —— 改了后端就跑。
4. 手动 `app.py` 起服务，浏览器看一眼地图 + 详情。

---

## 6. 后端架构

### `app/app.py`（路由 + 三棵根）

```python
_PROJECT = Path(__file__).resolve().parent.parent
CONTENT_ROOT    = Path(os.environ.get("CONTENT_ROOT",    _PROJECT / "content"))
DEMO_ROOT       = Path(os.environ.get("DEMO_ROOT",       _PROJECT / "demo"))
RECORDINGS_ROOT = Path(os.environ.get("RECORDINGS_ROOT", _PROJECT / "recordings"))
```

三个路由：

| 路由 | 作用 |
| --- | --- |
| `GET /` | 渲染 `map.html` |
| `GET /api/library` | `annotate_states(scan_library(CONTENT_ROOT, DEMO_ROOT, RECORDINGS_ROOT))` → JSON |
| `GET /video/<chapter>/<level>/<kind>` | `kind=="demo"` 查 `DEMO_ROOT/<ch>/<lv>/demo.{mp4\|webm}`；`kind=="performance"` 查 `RECORDINGS_ROOT/<ch>/<lv>/performance.{mp4\|webm}`。按实际文件扩展名返回对应 mimetype（`video/mp4` 或 `video/webm`）。**路径越界守卫**：resolve 后 `is_relative_to(对应根)`，否则 404。非法 kind / 文件不存在也 404 |
| `POST /upload/<chapter>/<level>/<kind>` | 接收视频文件，流式写盘到对应树（同路径守卫）。`mimeType` form 字段决定存 `.mp4` 还是 `.webm`（浏览器录制传 `video/webm`，旧文件传 `video/mp4`）。重录换格式时自动删旧文件。`MAX_CONTENT_LENGTH=500MB`。无文件→400，非法 kind/越界→404 |

URL 路由不变 → **app.js 和路由测试不用改**（只改背后文件落点）。

### `app/scanner.py`（纯逻辑，无 Flask 依赖）

两个函数，**纯逻辑、可单测**（`annotate_states` 就地修改并返回输入）：

- **`scan_library(content_root, demo_root, recordings_root) -> list[dict]`**：遍历 `content_root` 的章/关读 `meta.json`；`has_demo` 查 `demo_root/<ch>/<lv>/demo.{mp4|webm}`（`_has_video` helper 检查两种扩展名）；`has_performance` 查 `recordings_root/<ch>/<lv>/performance.{mp4|webm}`。`meta.json` 缺失/损坏 → 空 dict，title 回退为目录名。
- **`annotate_states(chapters) -> list[dict]`**：扁平化后按全局顺序算状态：

  > **三态规则（三句话）**：关卡顺序 = 文件夹名前缀排序；关卡解锁 = 上一关存在 `performance` 视频；关卡点亮 = 当前关存在 `performance` 视频。

  - 第一关永远 `unlocked`。`has_performance` → `completed`。否则上一关 `completed` → `unlocked`，否则 `locked`。第一个 `unlocked` 且未完成的关标 `current=True`。全完成则无 current。

  这是整个产品的核心规则，改它前想清楚含义。

### `tools/scaffold_levels.py`（内容脚手架）

从 `content/<章>/dialogues.md`（课程唯一真相源）解析 D1/D2/D3，写 `meta.json` 到 `content/<章>/<关>/`。

- **不会覆盖已激活的关**：检查 `demo/<章>/<关>/demo.mp4` 是否存在（视频已搬到 `demo/` 树），存在则跳过。
- 在仓库根跑 `python tools/scaffold_levels.py`。
- 可随时重跑；只给未激活的关（重新）写 `meta.json`。

---

## 7. 前端架构

**无框架、无构建。** `map.html` 用 `<script type="module" src="/static/app.js">` 加载，app.js 再 import 三个 `.mjs` 模块。

### 模块职责

| 文件 | 角色 | 依赖 |
| --- | --- | --- |
| `map-model.mjs` | **纯数据/纯函数**：`CHAPTER_THEMES`（10 章：world + accent）、`getChapterTheme`、`getLevelVisualState`、`getStableRotation`、`isFrameDark` | 无 |
| `map-path.mjs` | **纯函数**：`buildSmoothPath(points)`，绝不修改输入数组 | 无 |
| `app.js` | **编排层**（唯一有 DOM 副作用的）：拉 `/api/library`、渲染背景插画地图、抽取封面、画路径、开关详情+导航、**PC 摄像头录制**（`getUserMedia` + `MediaRecorder`）、demo 文件上传（File System Access API + IndexedDB 文件夹记忆） | 上面两个全依赖 |

### 两层视图

1. **地图视图**（`#map-view`）：10 个 `.chapter-world` section 自上而下。关卡节点按 `getLevelVisualState` 分三态：`completed`（demo 截图封面 + 金星，金星慢旋 + 闪烁 + 金色光晕呼吸）、`current`（demo 截图封面 + 双层橙色光晕呼吸 + 封面缩放呼吸 + 播放按钮）、`locked`（暗化 demo 截图 + 锁，有 demo 时带小播放标记）。每个状态都可点，点击打开详情。路径分两段：走过的路金色发光，未走的路白色。
2. **详情视图**（`#detail-view`）：三区域布局——顶部两个视频并排（Watch & Learn demo + Your Turn performance，16:9 等大），下方对话 + 变体并排，底部 Prev/Next 跨全宽。VideoGen 面板在右下角默认展开，内含 Part A/B 可折叠的 prompt 文本（带 Copy 按钮）。performance 未录时显示 `+` 空白封面，点击触发 PC 摄像头录制；"Your Turn"标签旁有 `?` 图标，悬停显示文件路径。

### 关键实现细节（改时注意）

- **背景插画**：固定背景层 `#bg-layer`（parallax，不随滚动移动），每章一个 slide，scroll 时交叉淡入淡出（1.5s）。图从 `/static/worlds/<章节名>.jpg|.png` 探测，缺失时循环用已有图。详情页有自己的灰白背景覆盖地图暖色。
- **封面抽取** `extractSafeCover()`：seek 到 **demo** 视频 20% 处（不是 performance），画 canvas，`isFrameDark` 检测暗帧。暗帧/超时/出错 → fallback 渐变。所有有 demo 的状态都用 demo 截图当封面（不只是 completed）。
- **路径绘制** `drawMapPath()`：测所有 `.level-node` 中心，`buildSmoothPath` 画平滑路径。路径在第一个锁定关处断开：走过的段（completed + current）`.trail--done` 金色发光，未走的段 `.trail--todo` 白色暗淡。之字形偏移在 CSS。
- **录制** `startRecordingSession()`：`getUserMedia` 开摄像头+麦克风 → 镜像预览 → 一钮两态（红圆开始/方块停止）+ 闪红计时 + 5 分钟硬上限自动停 → `MediaRecorder` 产 webm → 现场回放 + Redo/Save。Save 时 `uploadRecording()` 把 blob + mimeType POST 到 `/upload`，后端按 mimeType 存 `.webm`/`.mp4`。`pickRecorderMime()` 探测浏览器支持的最佳格式（Chrome→webm，Safari→mp4），console 打印实际 mimeType。摄像头被拒/缺失时回退到文件上传。
- **详情导航**：`openDetail` 底部渲染 Prev/Next（跨全宽），从 `flatLevels` 找相邻关卡。上传后 `reopenDetail` 重新打开当前关。
- **demo 标记**：locked 关如果有 demo，节点加 `.level-node__demo-badge` 小播放标记。
- **demo 上传**：`pickVideoFile` 用 File System Access API（Chrome），文件夹记忆存 IndexedDB。回退 `<input type="file">`。demo 视频区域的 `+` 空白封面点击即触发上传。
- **背景图刷新**：`closeDetail` 返回地图时强制重置 `activeChapter` 并调 `updateBgOnScroll(bgSlides)`，修了从详情页返回时背景图不显示的 bug（`#map-view` 被 `display:none` 期间 scroll listener 检测不到章节）。
- **VideoGen**：`GET /api/prompts/<chapter>/<level>` 返回 Sora prompt a/b 文本。Part A/B 是可折叠 `<details>`，summary 里有 Copy 按钮（`stopPropagation` 防止点 copy 触发折叠）。
- **可重试加载**：`loadLibrary()` 三态切换，`fetch("/api/library", { cache: "no-store" })`。
- **字体离线**：`@font-face` 引 `/static/fonts/*.woff2`。
- **动效约束**：current 关发光呼吸；`prefers-reduced-motion: reduce` 关闭。

### 布局比例（测试钉死，别乱改）

- 桌面（>600px）：左 18 / 主 64 / 右 18；节点 220px，current 244px。
- 手机（≤600px）：左 12 / 主 76 / 右 12；节点 140px，current 152px。

---

## 8. 内容工作流（备课 vs 使用）

### 备课流程（改内容时按这个走）

1. **写对话源**：编辑 `content/<章>/dialogues.md`（D1/D2/D3，格式见 `content/01-wants-requests/dialogues.md`）。
2. **生成 meta**：`python tools/scaffold_levels.py` → 写出各关 `meta.json`（`demo/` 里已有 `demo.mp4` 的关不动）。
3. **做 demo 视频**：拿 `prompts/<章>/D{N}a.txt` + `D{N}b.txt` 各粘进 Sora 生成两段 → ffmpeg 流拷贝拼成 `demo.mp4` 放进 `demo/<章>/<关>/`。
4. **更新进度表**：改 `demo/PROGRESS.md` 的勾选状态 + 小计。

### demo.mp4 拼接命令

```bash
printf "file 'a.mp4'\nfile 'b.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
```

### 角色设定（每份视频提示逐字一致）

- 爸爸 = 卡通狗（温棕色、大垂耳、橄榄绿 T 恤）
- 孩子 = 卡通小老虎（4 岁、橙底黑条纹、黄 T 恤）
- 风格：Pixar 式 3D 卡通 / 暖光 / 粉彩 / 萌系家庭向；锁机中景双人、16:9。

### 使用流程（父子一起，别自动化）

看 demo → 线下练 → 详情页点 `+` 用 PC 摄像头录 → 回放确认 → Save → 关卡点亮 → 孩子点封面回看表演。也可手动拖文件进 `recordings/<章>/<关>/` 再刷新。

> 录像应是游戏自然高潮，不是小考。4 岁孩子一旦感到被测会躲避。

### `meta.json` 结构

见 [`content/README.md`](content/README.md)。`speaker` 只认 `Dad`/`Child`。`title_zh` 仅备课参考，前端不显示（有意保留）。

---

## 9. 十个章节主题（别改顺序/别撞名）

| # | 文件夹 | world 名 | 主题 |
| --- | --- | --- | --- |
| 1 | `01-wants-requests` | morning-picnic | 想要 / 请求 |
| 2 | `02-refusing-bargaining` | color-market | 拒绝 / 讲条件 |
| 3 | `03-asking-help` | block-workshop | 请求帮忙 |
| 4 | `04-where-locating` | finding-forest | 位置 / 找东西 |
| 5 | `05-why-how-come` | question-observatory | 问原因 / 问方法 |
| 6 | `06-feelings-preferences` | feeling-garden | 情绪 / 偏好 |
| 7 | `07-reasoning` | reasoning-valley | 推理 / 解释 |
| 8 | `08-recounting-day` | memory-town | 复述一天 |
| 9 | `09-reporting-others` | messenger-post | 转述他人 |
| 10 | `10-planning-predicting` | planning-camp | 计划 / 预测 |

主题视觉定义在 `app/static/map-model.mjs` 的 `CHAPTER_THEMES`（每章只有 `world` 和 `accent`）。测试要求：10 个 world 名互不相同、每个 accent 是 hex 色。背景图 URL 从章节名派生（`/static/worlds/<章节名>.jpg`），不存进主题。**加新章或改 world 名会破测试。**

---

## 10. Git 约定

### 分支

- `master` —— 当前工作分支。`main` —— 主分支（PR 一般对着它）。

### Commit 信息风格（conventional commits，英文）

前缀：`feat:` / `fix:` / `content:`（内容增改）/ `chore:` / `docs:` / `test:` / `refactor:`。正文可带中文说明。例：

```
feat: animate chapter worlds with large hero scenes
content: expand all roleplay dialogues to complete sentences
refactor: split content, demo, and recordings into separate trees
```

### .gitignore 要点

- `__pycache__/`、`*.pyc`、`.venv/`、`node_modules/`
- `demo/**/*.mp4`、`recordings/**/*.mp4` —— **所有视频本地 only**
- `.claude/`、`.superpowers/`、`.zcode/`

> 别 `git add` 任何 `.mp4`（被忽略）；也别把 `.claude/`、`.superpowers/`、`.zcode/` 纳入版本。文案（`meta.json`、`dialogues.md`、提示词、`PROGRESS.md`）才进库。

### 提交前检查清单

- [ ] 改了前端纯模块 → `npm test` 绿。
- [ ] 改了后端 → `.venv/Scripts/python -m pytest -q` 绿。
- [ ] 没误加 `.mp4` / `.venv` / `.claude` / `.superpowers` / `.zcode`。
- [ ] 若改了 `CHAPTER_THEMES` 或布局比例，确认测试里钉死的断言仍成立。

---

## 11. 当前状态与进行中的工作

### 内容进度（截至 2026-08）

- 关卡文案 `meta.json`：**30 / 30**。
- Sora demo 提示词：**60 份**。
- AI 演示 `demo.mp4`：**7 / 30**（见 `demo/PROGRESS.md`）。
- 孩子表演 `performance.mp4`/`.webm`：0 / 30。

**瓶颈**：demo 视频备课跟不上闯关节奏。

### 代码状态

- 地图骨架 + 动态章节世界（大型动画主景 + 平滑路线 + 响应式节点）：完成。
- PC 摄像头实时录制（`getUserMedia` + `MediaRecorder`，一钮两态 + 5 分钟上限 + 回放 + Redo/Save）：完成。
- 路径进度可视化（走过的路金色，未走白色）、已完成金星旋转闪烁 + 金色光晕、当前关封面缩放呼吸 + 双层光晕：完成。
- webm/mp4 双格式支持（scanner + 路由 + 上传）：完成。
- 字体自托管、三棵树分离、视频路由越界守卫：完成。
- 下一组 demo：`03-asking-help/02-its-stuck`（见 `demo/PROGRESS.md`）。

---

## 12. 常见陷阱速查

| 现象 | 原因 / 对策 |
| --- | --- |
| `node --test tests-js/` 失败 | 用 `npm test` 或 glob `node --test tests-js/*.test.mjs` |
| 克隆后地图很多关卡空着 | 视频被 gitignore，本地没有是正常的；放回 `demo/`、`recordings/` 即恢复 |
| 关卡顺序乱了 | 文件夹名没零填充前缀（`01-`、`02-`…），排序靠它 |
| 关卡不解锁 | 上一关没有 `performance` 视频（`.mp4` 或 `.webm`，在 `recordings/<章>/<关>/`）；放进去刷新 |
| 改了 `app.py` 不生效 | debug 模式应自动重载；没重载就重启 `app.py` |
| 封面显示不出来 | `extractSafeCover` 检测到暗帧或 canvas 被污染会回退；检查视频是否同源可读 |
| 从详情页返回背景图消失 | 已修复：`closeDetail` 强制重置 `activeChapter` 并刷新 `updateBgOnScroll` |
| 录制后关卡没亮 | 检查 console 打印的 mimeType；确认 `/upload` 返回 `ext`；scanner 认 `.mp4`+`.webm` |
| 改 `CHAPTER_THEMES` 后 JS 测试红 | 测试钉死了 10 个唯一 world + hex accent；同步改测试或符合约束 |
| `scaffold_levels.py` 没更新某关 | 那关 `demo/<章>/<关>/demo.mp4` 已存在（被视作已激活，脚本故意跳过保护 meta） |
| venv 失效 | `app/` 被重命名后 venv 绝对路径失效；删 `app/.venv` 重建（见 `app/README.md`） |

---

## 13. 给后续 agent 的速记

- **先跑两套测试**（`npm test` + `pytest -q`）确认基线绿，再动手。
- **纯逻辑放模块、副作用放 app.js**：`map-model`/`map-path` 是纯的、有测试的；新增纯逻辑优先进这些模块并配测试。
- **改状态机（`annotate_states`）= 改产品规则**，三思，并更新 `test_scanner.py`。
- **三棵树同名**：`content/<章>/<关>`、`demo/<章>/<关>`、`recordings/<章>/<关>` 的章关目录名必须一致。
- **别引入构建工具/npm 依赖/数据库/公网部署**——设计上明确排除。（页面内上传是本地功能，不是在线上传平台。）
- **视频和 `.claude`/`.superpowers`/`.zcode` 不入库**。
- **产品语言**：文档可中英混排（README 中文为主），代码与 commit 用英文；面向孩子的 UI 文案要简单温暖。
- **设计文档在 `docs/`**（specs/plans/archive）——拿不准方向时回去读。
