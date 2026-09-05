# AGENTS.md

> 本文件面向后续接手的 AI agent（以及人类协作者）。读完它，你应该能在不动错地方的前提下开始改这个项目。
> 产品背景与设计取舍见根目录 [`README.md`](README.md)；本文是「操作手册」，README 是「产品文档」。每个顶层目录还有各自的 `README.md` 作为索引。

---

## 1. 这个项目是什么

**My English Adventure** —— 一个**本地运行**的小网站，把父子线下英语 role-play 的录像排成一条「章 → 关」的向上闯关地图（参考 Two Dots）。每过一关，地图上那个点就亮起来，变成**孩子自己录像里的画面**。

### 必须先理解的三个产品认知（违反这些会做错方向）

1. **网站不是教学引擎，是「奖杯陈列柜」。** 真正的英语教学发生在线下父子 role-play。网站只做两件事：把完成的 role-play 可视化成进度；让孩子反复回看自己的表演录像。
2. **给孩子多巴胺的是回头看自己的表演。** 完成勾只是入口，「我的表演回放」才是主舞台。所以点亮的关卡，圆点显示 demo 动画的画面，点击进入详情页看表演录像。
3. **句式高级度不由网站量化。** 那是线下目标。网站只做二元判定：有没有 `performance` 视频（`.mp4` 或 `.webm`）。

### 明确排除的事（别去实现）

- ❌ 教学引擎 / AI 对话搭档
- ❌ 1/2/3 星分级（仅一个完成勾，二元）
- ❌ 用星星追踪「句式高级度」
- ❌ 构建工具 / 打包器 / 数据库（前端始终原生 ES Modules，无打包）
- ❌ 第三方云托管 / SaaS。默认本地跑；支持部署到**自己的**服务器（见 `DEPLOY.md`），但不依赖任何外部服务

---

## 2. 仓库布局

```
D:/TaviusProject/                      # 仓库根（git: main 分支）
├── README.md                          # 产品文档
├── PROJECT.md                         # 面向使用者的项目说明
├── AGENTS.md                          # 本文件
├── DEPLOY.md                          # 自部署服务器指南（多用户场景）
├── run.bat                            # 浏览器版启动（保留日志窗口）
├── launch.vbs                         # 桌面版启动（Electron：拉起 Flask + 无边框窗口）
├── install-shortcut.vbs               # 装桌面/任务栏快捷方式（一次性）
├── .gitignore / .gitattributes        # LF 强制；视频与密钥本地 only
│
├── app/                               # Flask 网站（后端 + 前端 + 测试）—— 代码核心
│   ├── README.md                      # 如何运行/测试
│   ├── package.json                   # "test" 脚本 + electron devDependency（桌面壳）
│   ├── app.py                         # Flask 路由 + Stage 课程/媒体根 + 登录/用户管理 + 上传 + 视频处理
│   ├── scanner.py                     # 纯逻辑：投影 curriculum/ + 算三态；保留 v1 扫描兼容
│   ├── requirements.txt               # flask>=3.0, pytest, imageio-ffmpeg
│   ├── config.example.json            # 配置模板；config.json（真实密码/secret）本地生成不入库
│   ├── users.json                     # 用户密码哈希（gitignored，运行时生成）
│   ├── templates/                     # map.html（地图+详情）、login.html、admin.html
│   ├── static/
│   │   ├── app.js                     # 主逻辑：渲染、详情导航、PC 摄像头录制、上传
│   │   ├── titlebar.js                # Electron 环境注入自定义标题栏；浏览器里 no-op
│   │   ├── map-model.mjs              # 纯：10 章主题(world+accent)、视觉状态、旋转、帧暗检测
│   │   ├── map-path.mjs               # 纯：Catmull-Rom 平滑路径
│   │   ├── lesson-view.mjs            # 纯：A/B/C 分段、Replay Cards、章节上下文
│   │   ├── adventure-navigation.mjs   # 纯：Stage 展示、真实计数与 current 目标
│   │   ├── adventure-shell.mjs        # DOM：浮动外壳、课程目录、焦点与滚动锁
│   │   ├── world-assets.mjs           # 纯：响应式 v2 图与同章旧图候选
│   │   ├── style.css                  # 现代玩具剧场共享 token、地图/目录/详情 + 自托管字体
│   │   ├── fonts/                     # 自托管 woff2（Fredoka/Nunito，离线可用）
│   │   ├── worlds/                    # 同章旧图回退
│   │   └── worlds-v2/                 # 20 张 <world>-desktop/mobile.webp，8:5 / 9:16
│   ├── tests/                         # pytest：scanner、app、curriculum loader/validator
│   ├── tests-js/                      # node --test：map-model/path .test.mjs
│   └── .venv/                         # 本地虚拟环境（gitignored）
│
├── electron/                          # Electron 桌面壳
│   ├── main.cjs                       # 主进程：spawn Flask → 等就绪 → 加载 localhost:5000；自动授权摄像头/麦克风；退出杀 Flask
│   └── preload.cjs                    # contextBridge 暴露 window.electronAPI（窗口最小化/最大化/关闭）
│
├── curriculum/                        # 新版课程唯一创作源（分年龄、结构化、可校验）
│   ├── README.md                      # schema、迁移状态、校验入口
│   └── 04/                            # 4 岁 Stage：10 章 × 3 课，已通过语言/逻辑审查
│       ├── stage.json                 # Stage 策略、状态、5 岁桥接 Moves
│       ├── FINAL-REVIEW.md            # 30 课最终内容审查
│       └── <章>/<课>/lesson.json      # 对话、Replay Cards、review gates
│
├── content/                           # v1 文案归档（仅历史对照和兼容测试）
│   ├── README.md                      # 章/关/meta.json 约定
│   └── 01-wants-requests/             # 章（10 个，零填充前缀）
│       ├── dialogues.md               # 本章对话源（scaffold_levels.py 的输入）
│       ├── 01-can-i-have/meta.json    # 关（每章 3 个）
│       └── 02-i-need/ … 03-can-we/
│       … 02-refusing-bargaining/ … 10-planning-predicting/
│
├── demo/                              # AI 演示视频 —— gitignored，可再生
│   ├── README.md                      # demo 生产流程
│   ├── PROGRESS.md                    # demo 生产进度表（14/30，手维护）
│   ├── 04/<章>/<课>/demo.mp4 + thumb.jpg …  # 新版 Stage 媒体
│   └── 01-wants-requests/…            # v1 历史视频，原样保留
│
├── recordings/                        # 孩子表演录像 —— gitignored，珍贵不可再生
│   ├── README.md                      # 「放文件即点亮」工作流 + 备份提醒
│   └── <用户名>/04/<章>/<课>/performance.mp4 …
│
├── prompts/                           # Sora demo 提示词，入库
│   ├── README.md                      # 角色设定 + 节奏说明 + 索引
│   ├── 04/<章>/<课>/{a,b,c}.txt       # 新版约定（按需制作）
│   └── 01-wants-requests/D1a.txt …    # v1 历史提示词
│
├── tools/                             # 脚本
│   ├── README.md
│   ├── scaffold_levels.py             # 从 v1 dialogues.md 生成 meta.json
│   └── validate_curriculum.py         # 校验新版 Stage 结构、输出负担与复现覆盖
│
├── design/                            # 设计工作区
│   ├── memo.md + plans/               # 详情页重设计的需求备忘与实施计划（已落地）
│   ├── reference/                     # 视觉风格参考页（卡片布局的样式来源）
│   └── icon.png / mobile-bg.png       # 应用图标与移动端背景素材
│
└── docs/                              # 设计文档
    ├── README.md                      # 文档索引
    ├── specs/                         # 设计规格
    ├── plans/                         # 实施计划
    ├── archive/                       # 冻结的历史基线（原 .vibe/）
    └── twodots-reference.jpeg         # Two Dots 风格参考图
```

> **视频不入库**：所有 `demo/**/*.mp4`、`recordings/**/*.mp4`（及 webm/mov/avi）被 `.gitignore` 忽略（体积 + 隐私）；服务端生成的 `demo/**/thumb.jpg` 同样忽略（可由后端再生）。仓库跟踪 `curriculum/` 的结构化课程；`content/` 和根级旧 prompts 仅作 v1 参考。克隆后本地没有新版视频，地图显示空状态——这是预期的。

---

## 3. 技术栈

| 层 | 技术 | 关键约束 |
| --- | --- | --- |
| 后端 | Python / Flask（单文件 `app/app.py`） | 无数据库、无构建；有登录/用户管理、页面内上传（流式写盘）、服务端 ffmpeg 处理（压缩+缩略图） |
| 桌面壳 | Electron 31（`electron/` + `app/node_modules/electron`） | 仅 Windows 本地用；spawn Flask → 加载 `localhost:5000`；自动授权摄像头/麦克风 |
| 数据 | 文件系统（三棵树 = 数据库） | 文件夹名零填充前缀，字符串排序即预期顺序；三棵树的 `<章>/<关>` 同名；performance 按用户名多一层 |
| 前端 | 原生 HTML/CSS/JS（ES Modules） | **无构建步骤、无打包器、无前端 npm 依赖**。`.mjs` 直接由浏览器加载 |
| 字体 | 自托管 woff2（`app/static/fonts/`） | 离线可用，不走 Google CDN |
| 测试 | pytest（Python）+ `node:test`（JS） | 见下文「测试」一节 |
| Python | 3.11（`.venv`） | `requirements.txt`：`flask>=3.0, pytest, imageio-ffmpeg`（后者提供 ffmpeg 兜底） |
| Node | v22+（`node --test`） | `package.json` 只挂 `npm test` 脚本 + electron devDependency |

**没有 npm/pip 之外的工具链。** 改前端不需要装任何东西；改后端只需一个 venv；要用桌面壳才需要 `npm install`（装 electron）。

---

## 4. 如何运行

### 首次初始化（一次性）

```bash
cd app
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# macOS/Linux:  .venv/bin/python -m pip install -r requirements.txt
```

### 启动方式（三选一）

1. **桌面版**（日常给孩子的入口）：仓库根双击 `launch.vbs` —— Electron 拉起 Flask（venv 内 `app.py`）→ 等就绪 → 无边框窗口加载 `localhost:5000`，退出时杀掉 Flask。跑一次 `install-shortcut.vbs` 可装桌面快捷方式。前提：`cd app && npm install`（装 electron）。
2. **浏览器版**：仓库根双击 `run.bat`（保留一个能看 Flask 日志的黑窗口）。
3. **开发服务器**：

```bash
cd app
.venv/Scripts/python app.py          # 然后开 http://127.0.0.1:5000
```

默认不开 debug；开发时可设置 `FLASK_DEBUG=1` 开启自动重载。Electron 用 `localhost` 而不是 `127.0.0.1`（secure context，摄像头需要），两者都指向同一服务。

### 登录与配置

- 所有页面/接口要登录（session cookie）。管理员账号 `admin`，部署密码在 `app/config.json`（从 `config.example.json` 复制并替换占位值）。缺失配置时仅本地开发回退 `admin123`，同时为当前进程随机生成 session secret；损坏、占位或弱配置会拒绝启动。
- 登录后右上角用户菜单可切换/登出；admin 有用户管理（`/admin` 页面 + `/api/admin/users`），普通用户密码哈希存 `app/users.json`（gitignored）。
- 用户名即 `recordings/<用户名>/` 的路径成分：只允许字母数字、`-`、`_`（`_valid_username`），登录和建路径时双重校验。

### 课程与媒体根（环境变量，默认相对仓库根）

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `CURRICULUM_ROOT` | `<repo>/curriculum` | 分年龄结构化课程 |
| `CURRICULUM_STAGE` | `04` | 当前展示的 Stage |
| `DEMO_ROOT` | `<repo>/demo` | AI 演示视频 |
| `RECORDINGS_ROOT` | `<repo>/recordings` | 孩子表演录像 |
| `PROMPTS_ROOT` | `<repo>/prompts` | Sora 提示词（VideoGen 面板用） |

可分别覆盖（测试或挂载别的内容库时用）。

### 调试单接口

```bash
curl -s http://127.0.0.1:5000/api/library | head    # 未登录会 302 到 /login
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/login
```

---

## 5. 如何测试

**两套独立测试，都要跑。** 改了对应层的代码后，务必跑对应测试。

### Python 测试（后端逻辑 + 路由 + HTML 外壳）

```bash
cd app
.venv/Scripts/python -m pytest        # 全量（2026-09-05：159 个）
.venv/Scripts/python -m pytest -v
.venv/Scripts/python -m pytest tests/test_scanner.py -v   # 单文件
```

测试用 `tmp_path` 临时目录构造 canonical curriculum、demo、recordings 和 prompts，`monkeypatch` 替换各根路径与 Stage，不碰真实内容。`scan_library` 的单测继续覆盖 v1 兼容层。

### JS 测试（前端纯模块逻辑）

```bash
cd app
npm test                              # ✅ 等价于下面那条
node --test tests-js/*.test.mjs       # ✅ 正确：必须用 glob
node --test tests-js/map-path.test.mjs # 单文件
```

> ⚠️ **坑**：`node --test tests-js/`（传目录）会失败。**必须用 glob `tests-js/*.test.mjs` 或显式列文件**（或直接 `npm test`）。这是 Node test runner 对无 `package.json` 项目的目录发现限制——现已用 `package.json` 的 `test` 脚本封装。

### 当前测试覆盖什么

- 2026-09-05 基线：Python 159、Node 36；包含20张资产HTTP验证、导航计数/不可变输入、drawer焦点、Electron挂载幂等、current跳转、同章背景回退、上传所有权与详情结构。
- 可选 `tests-browser/modern-toy-ui.cjs`：已有 Playwright/Edge/Python 环境下运行；具体环境变量见 `app/README.md`。使用临时课程副本、账号、配置、资料与媒体根，拦截上传且不执行启动扫描。`TOY_QA_ELECTRON=1` 启用真实 Electron/preload、独立 userData、隐藏800×600窗口。不要为测试启动 `electron/main.cjs`（它拉起生产服务并会清理5000端口），不要复用用户窗口。

- `test_scanner.py`：扫描排序、`meta.json` 回退、`has_demo`/`has_performance` 跨树检测、**webm 格式检测**、三态机、跨章状态传递、全完成无 current、**按用户名隔离 performance 路径**。
- `test_app.py`：登录（admin/普通用户/错误密码）、用户管理 API、地图/详情 GET 路由、缩略图路由（`/thumb`）、视频 404 边界（缺文件 / 非法 kind / 路径越界）、上传路由（写盘 / 路径越界 / 非法 kind / 无文件 / 建目录）、**webm 上传存正确扩展名 + serve 正确 mimetype + 重录换格式删旧文件**、HTML 外壳含所有关键 `id`、可重试加载逻辑、静态模块可 serve、字体自托管。
- `tests-js/*.test.mjs`：10 章 10 个不同 world + hex accent、视觉状态、旋转稳定有界、暗帧检测、平滑路径。

### 改代码时的自检顺序

1. `node --check static/<file>.mjs`（或 `app.js`）—— 快速语法检查。
2. `npm test` —— 改了前端纯模块就跑。
3. `.venv/Scripts/python -m pytest -q` —— 改了后端就跑。
4. 手动 `app.py` 起服务，浏览器看一眼地图 + 详情。

---

## 6. 后端架构

### `app/app.py`（路由 + Stage 课程/媒体根 + 认证 + 视频处理）

```python
_PROJECT = Path(__file__).resolve().parent.parent
CURRICULUM_ROOT = Path(os.environ.get("CURRICULUM_ROOT", _PROJECT / "curriculum"))
CURRICULUM_STAGE = os.environ.get("CURRICULUM_STAGE", "04")
DEMO_ROOT       = Path(os.environ.get("DEMO_ROOT",       _PROJECT / "demo"))
RECORDINGS_ROOT = Path(os.environ.get("RECORDINGS_ROOT", _PROJECT / "recordings"))
PROMPTS_ROOT    = Path(os.environ.get("PROMPTS_ROOT",    _PROJECT / "prompts"))
```

路由全景：

| 路由 | 作用 |
| --- | --- |
| `GET/POST /login`、`GET /logout` | session 登录/登出。admin 密码来自 `config.json`（回退示例值），普通用户来自 `users.json`（werkzeug scrypt 哈希） |
| `GET /api/me` | 当前用户名 + 是否 admin（前端用户菜单用） |
| `GET/POST /admin`、`GET/POST /api/admin/users` | admin 用户管理（HTML 页 + JSON API，加/删用户） |
| `GET /` | 渲染 `map.html`（需登录） |
| `GET /api/library` | `annotate_states(scan_curriculum_library(CURRICULUM_ROOT, CURRICULUM_STAGE, ...))` → JSON。performance 按登录用户隔离 |
| `GET /thumb/<chapter>/<level>` | 返回 `DEMO_ROOT/<stage>/<ch>/<lv>/thumb.jpg`，缺失 404 → 前端回退主题色。同一路径越界守卫 |
| `GET /video/<chapter>/<level>/<kind>` | demo 查 `DEMO_ROOT/<stage>/<ch>/<lv>/demo.{mp4\|webm}`；performance 查 `RECORDINGS_ROOT/<用户名>/<stage>/<ch>/<lv>/performance.{mp4\|webm}`。按实际扩展名返回 mimetype，并执行路径越界守卫 |
| `POST /upload/<chapter>/<level>/<kind>` | 流式上传到上述 Stage 路径。`mimeType` 决定 `.mp4`/`.webm`；换格式重录会删旧文件；>5MB 自动压缩，demo 自动生成缩略图 |
| `GET /api/prompts/<chapter>/<level>` | 校验 canonical Lesson 后读取 `PROMPTS_ROOT/<stage>/<章>/<课>/{a,b,c}.txt`；缺少某一段允许为空，未知 Lesson 返回 404 |

URL 路由不变 → **app.js 和路由测试不用改**（只改背后文件落点）。

### 服务端视频处理（ffmpeg，无外部服务）

- **`_ffmpeg_path()`**：先找 PATH 里的 `ffmpeg`，找不到用 `imageio-ffmpeg` 包自带的二进制（pip 依赖，requirements 已声明），最后裸回退 `"ffmpeg"`。
- **`_generate_thumb(video)`**：抽第 2 秒一帧存 `thumb.jpg`（480px 宽）到视频旁边。失败静默跳过——`/thumb` 404、前端回退主题色。
- **`_needs_compress` / `_compress_video`**：>5MB 的视频重编码（libx264 / crf 28 / 1.5Mbps / 960px），只有结果更小时才覆盖原文件；临时文件 `*_tmp.mp4`，压缩失败自动清掉。
- **`_scan_and_optimize()`**：启动时扫 `demo/` + `recordings/` 全库，逐个压缩 + 补缺失缩略图（`app.py` 末尾调用）。

### 认证要点

- admin 是硬编码用户名 `ADMIN_USERNAME = "admin"`，密码从 `config.json` 读；普通用户 scrypt 哈希存 `app/users.json`（gitignored）。`config.json` 和 `users.json` 都**绝不能入库**。
- 用户名合法正则 `^[A-Za-z0-9_-]+$`（它要成为 `recordings/` 下的路径成分），登录与每次建路径双重校验。

### `app/scanner.py`（纯逻辑，无 Flask 依赖）

主要函数均为**纯逻辑、可单测**（`annotate_states` 就地修改并返回输入）：

- **`scan_curriculum_library(...)`**：读取 `curriculum/<stage>/stage.json → chapter.json → lesson.json`，把 canonical Lesson 投影为地图需要的章/关 JSON，并检测 Stage 前缀下的 demo/performance。
- **`scan_library(...)`**：只为 v1 兼容与回归测试保留，不再被 Flask 运行时调用。
- **`annotate_states(chapters) -> list[dict]`**：扁平化后按全局顺序算状态：

  > **三态规则（三句话）**：关卡顺序 = 文件夹名前缀排序；关卡解锁 = 上一关存在 `performance` 视频；关卡点亮 = 当前关存在 `performance` 视频。

  - 第一关永远 `unlocked`。`has_performance` → `completed`。否则上一关 `completed` → `unlocked`，否则 `locked`。第一个 `unlocked` 且未完成的关标 `current=True`。全完成则无 current。

  这是整个产品的核心规则，改它前想清楚含义。

### 内容校验与 v1 脚手架

- `python tools/validate_curriculum.py --stage 04 --complete`：校验新版完整 Stage 的结构、字数、角色、复现与审查门。
- `tools/scaffold_levels.py`：仅用于重建 v1 `content/` 归档；不是新版课程工作流的一部分。

---

## 7. 前端架构

**无框架、无构建。** `map.html` 用 `<script type="module" src="/static/app.js">` 加载，app.js 再 import 纯 `.mjs` 模块。

### 模块职责

| 文件 | 角色 | 依赖 |
| --- | --- | --- |
| `map-model.mjs` | **纯数据/纯函数**：`CHAPTER_THEMES`（10 章：world + accent）、`getChapterTheme`、`getLevelVisualState`、`getStableRotation`、`isFrameDark` | 无 |
| `map-path.mjs` | **纯函数**：`buildSmoothPath(points)`，绝不修改输入数组 | 无 |
| `lesson-view.mjs` | **纯函数**：A/B/C 对话分组、Replay Card、prompt 分段、章节上下文 | 无 |
| `world-assets.mjs` | **纯函数**：v2 desktop/mobile 与同章旧图 URL 候选 | 无 |
| `adventure-navigation.mjs` | **纯函数**：Stage 1/2/3 展示、章/全局真实完成数、current 目标 | 无 |
| `adventure-shell.mjs` | **DOM 编排**：浮动外壳、课程目录、焦点陷阱、inert 和滚动恢复 | navigation、lesson-view |
| `app.js` | **编排层**：拉 `/api/library`、连接 shell、渲染地图和课程详情、导航、摄像头录制、demo/表演上传 | map-model/path、lesson-view、detail-media、navigation、shell |
| `titlebar.js`（普通 script，非 module） | Electron 环境检测 + 注入自定义标题栏/窗口控制按钮（`window.electronAPI`）；浏览器里是 no-op | 无 |

### 两层视图

1. **地图视图**（`#map-view`）：10章×3课，真实编号1–30。completed 为 demo 封面或材质节点＋青绿勾，current 为青绿环＋定位针，locked 为封面或编号＋锁；都可点详情。浮动 shell 显示真实完成数、目录和账号。**Current lesson** 仅用户点击后滚动并聚焦当前节点；不打开详情，不改变进度；全完成时隐藏并显示完成提示。
2. **详情视图**（`#detail-view`）：56px标题栏；桌面左340px媒体栏（Your Show在上、Watch & Learn在下）、右侧完整A/B/C→完整Replay→默认独立折叠家长说明/VideoGen；底部Prev/Next。小于768px使用媒体页签＋单列正文，只页面整体滚动。未录时点 **Start recording**，示范为空点 **Add demo**。Can-Do、Trigger和句式放在家长说明内，不挤标题。

运行时：`/api/library` → `summarizeAdventure` → 地图与 shell 同一份真实计数；目录选择只打开 Lesson，不写入课程状态。Stage 1 是 `curriculum/04` 的展示名，Stage 2/3 为禁用 Planned。目录打开时背景 inert、地图锁滚动、焦点进入并圈定抽屉；Escape/关闭/遮罩恢复菜单焦点，选课释放锁后打开详情。

### 关键实现细节（改时注意）

- **响应式背景**：固定 `#bg-layer`，每章一张 slide，滚动交叉淡入淡出。`/static/worlds-v2/<world>-desktop.webp`（1920×1200）和 `-mobile.webp`（1080×1920）共20张，完整清单见 `app/static/worlds-v2/README.md`。`<768`切手机图；失败按本章旧WebP/PNG/JPG尝试，全部失败保留主题材质，不循环别章。resize仅重选背景，generation token阻止旧响应覆盖新尺寸；详情为暖白阅读面。
- **封面** `extractSafeCover()`：改为加载服务端缩略图 `/thumb/<ch>/<lv>`（替代原 canvas 抽帧——大视频 seek 慢且暗帧多）。加载失败 → null → 主题色渐变 fallback。有 frameCache，地图/详情共用。缩略图由后端在上传和启动扫描时用 ffmpeg 生成（见 §6）。
- **路径绘制** `drawMapPath()`：测所有 `.level-node` 中心，用 `buildSmoothPath` 画阴影/暖灰边/象牙白三层路径，走过段增加低饱和青绿内线。`splitPathPoints` 在当前节点连接两段，不丢点；之字形偏移在 CSS。没有金星旋转或强金光。
- **录制** `startRecordingSession()`：`getUserMedia` 开摄像头+麦克风 → 镜像预览 → 一钮两态（红圆开始/方块停止）+ 闪红计时 + 5 分钟硬上限自动停 → `MediaRecorder` 产 webm → 现场回放 + Redo/Save。Save 时 `uploadRecording()` 把 blob + mimeType POST 到 `/upload`，后端按 mimeType 存 `.webm`/`.mp4`。`pickRecorderMime()` 探测浏览器支持的最佳格式（Chrome→webm，Safari→mp4），console 打印实际 mimeType。摄像头被拒/缺失时回退到文件上传。
- **详情导航**：`openDetail` 底部渲染 Prev/Next（跨全宽），从 `flatLevels` 找相邻关卡。上传后 `reopenDetail` 重新打开当前关。
- **demo 封面**：有 demo 时节点尝试显示缩略图，缺图使用材质与编号回退；locked 关仍显示锁，可点击预习，不再单独叠加播放徽标。
- **demo 上传**：`pickVideoFile` 用 File System Access API（Chrome），文件夹记忆存 IndexedDB。回退 `<input type="file">`。使用 **Add demo / Replace**；取消选择不会触发刷新或显示成功。
- **背景图刷新**：`closeDetail` 返回地图时强制重置 `activeChapter` 并调 `updateBgOnScroll(bgSlides)`，修了从详情页返回时背景图不显示的 bug（`#map-view` 被 `display:none` 期间 scroll listener 检测不到章节）。
- **VideoGen**：`GET /api/prompts/<chapter>/<level>` 返回可选的 a/b/c 文本。Part A/B/C 是可折叠 `<details>`，summary 里有 Copy 按钮。
- **可重试加载**：`loadLibrary()` 三态切换，`fetch("/api/library", { cache: "no-store" })`。
- **字体离线**：`@font-face` 引 `/static/fonts/*.woff2`。
- **动效约束**：current 关发光呼吸；`prefers-reduced-motion: reduce` 关闭。

### 布局尺寸（2026-09-05）

- 桌面（≥768px）：中央节点列最大680px，之字形偏移104–150px；节点220px、current244px。
- 手机（<768px）：节点列最大340px，之字形偏移30–46px；节点140px、current152px。
- 旧18/64/18、12/76/12三列网格已由此布局替代；背景、详情页签统一用768px断点。800×600允许整体纵向滚动，禁止横向溢出。

---

## 8. 内容工作流（备课 vs 使用）

> **课程设计约束（2026-09-04）：** `curriculum/` 是唯一创作源和运行时来源；`content/` 是 v1 归档。新增或重写课程前，必须先读 [`docs/specs/2026-09-04-curriculum-architecture-design.md`](docs/specs/2026-09-04-curriculum-architecture-design.md) 和 [`curriculum/04/FINAL-REVIEW.md`](curriculum/04/FINAL-REVIEW.md)。不要继续按旧模板批量增加孤立句式。

### 新版课程创作流程

1. 编辑 `curriculum/<stage>/<章>/<课>/lesson.json`。每课一个主要 Conversation Move、A/B/C 三段对话、两张 Replay Card、八项 reviews。
2. 增量创作运行 `python tools/validate_curriculum.py --stage 04`。
3. 整个 Stage 发布前运行 `python tools/validate_curriculum.py --stage 04 --complete`。
4. 提示词草稿可在 `language_reviewed` 后准备；正式 demo 制作仍需 `video_ready`。内容修改时递增 `content_revision`，审查并同步逐课 `production.json` 的版本，再重新导出提示词；已生成视频应标记为过期。

### 新版视频流程（按课恢复）

1. `prompts/04` 已有 30课 / 90份 A/B/C 制作草稿。台词从 `curriculum` 导出，镜头只写在逐课 `production.json`；运行 `python tools/build_video_prompts.py --stage 04 --check` 检查，`--write` 明确重生成。禁止直接维护导出文件内的第二份台词。
2. 逐课完成分镜/节奏确认并达到 `video_ready` 后，分别生成三段并拼接为 `demo.mp4`，放到 `demo/04/<章>/<课>/`；也可从详情页上传。每段约10秒，台词拥挤时允许12–15秒，不能删词或加速。提示词齐全不等于视频已生成。
3. 更新新版进度记录；服务会自动压缩并生成 `thumb.jpg`。

### demo.mp4 拼接命令

```bash
printf "file 'a.mp4'\nfile 'b.mp4'\nfile 'c.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
```

### 角色设定（每份视频提示逐字一致）

- 爸爸 = 卡通狗（温棕色、大垂耳、橄榄绿 T 恤）
- 妈妈 = 卡通猪；老师 = 卡通兔子；同龄伙伴 = 固定儿童角色
- 孩子 = 卡通小老虎（4 岁、橙底黑条纹、黄 T 恤）
- 风格：Pixar 式 3D 卡通 / 暖光 / 粉彩 / 萌系家庭向；锁机中景双人、16:9。

### 使用流程（家庭一起，别自动化）

看 demo → 线下练 → 详情页点 **Start recording** 用摄像头录 → 回放确认 → Save → 关卡点亮 → 孩子点封面回看表演。也可手动放入 `recordings/<用户名>/04/<章>/<课>/` 再刷新。

> 录像应是游戏自然高潮，不是小考。4 岁孩子一旦感到被测会躲避。

### `lesson.json` 结构

见 [`curriculum/README.md`](curriculum/README.md)。运行时角色支持 `Dad`、`Mom`、`Teacher`、`Peer` 与 `Child`；前端显示对应真实对话对象。

---

## 9. Stage 4 十个章节主题（别改顺序）

| # | 文件夹 | world 名 | 主题 |
| --- | --- | --- | --- |
| 1 | `01-choosing-requests` | morning-picnic | 选择与请求 |
| 2 | `02-refusal-negotiation` | color-market | 拒绝与协商 |
| 3 | `03-help-clarification` | block-workshop | 求助与澄清 |
| 4 | `04-body-needs` | finding-forest | 身体与需要 |
| 5 | `05-routines-transitions` | question-observatory | 日常步骤与转换 |
| 6 | `06-finding-belonging` | feeling-garden | 寻找与归属 |
| 7 | `07-joining-cooperation` | reasoning-valley | 加入与合作 |
| 8 | `08-feelings-repair` | memory-town | 感受、边界与修复 |
| 9 | `09-outings-safety` | messenger-post | 外出、商店与安全 |
| 10 | `10-recounting-planning` | planning-camp | 讲述与计划 |

主题视觉定义在 `app/static/map-model.mjs`；每个 `chapter.json` 的 `background_asset` 把 canonical 章映射到现有插画文件。测试要求 10 个 world 名互不相同、每个 accent 是 hex 色。

---

## 10. Git 约定

### 分支

- `main` —— 当前工作分支（日常提交直接落在这里）。`master` —— 历史分支，已不再更新。

### Commit 信息风格（conventional commits，英文）

前缀：`feat:` / `fix:` / `content:`（内容增改）/ `chore:` / `docs:` / `test:` / `refactor:`。正文可带中文说明。例：

```
feat: animate chapter worlds with large hero scenes
content: expand all roleplay dialogues to complete sentences
refactor: split content, demo, and recordings into separate trees
```

### .gitignore 要点

- `__pycache__/`、`*.pyc`、`.venv/`、`node_modules/`
- `demo/**/*.mp4`、`recordings/**/*.mp4` —— **所有视频本地 only**；`demo/**/thumb.jpg` 是生成物，同样忽略
- `app/config.json`、`app/users.json` —— **密码与密钥，绝不能入库**
- `.claude/`、`.superpowers/`、`.zcode/`、`.env`、`.electron-tmp/`

> 别 `git add` 任何视频（被忽略）；也别把 `.claude/`、`.superpowers/`、`.zcode/`、`config.json`、`users.json` 纳入版本。新版文案以 `curriculum/**/*.json` 为准。

### 提交前检查清单

- [ ] 改了前端纯模块 → `npm test` 绿。
- [ ] 改了后端 → `.venv/Scripts/python -m pytest -q` 绿。
- [ ] 没误加 `.mp4` / `.venv` / `.claude` / `.superpowers` / `.zcode` / `config.json` / `users.json` / `thumb.jpg`。
- [ ] 若改了 `CHAPTER_THEMES` 或布局比例，确认测试里钉死的断言仍成立。

---

## 11. 当前状态与进行中的工作

### 内容进度（截至 2026-09-04）

- 新版 4 岁课程 `curriculum/04`：**30 / 30**，10 章全部完成语言与逻辑审查；详见 `FINAL-REVIEW.md`。
- 网站运行时：已直接读取 `curriculum/04`，显示 A/B/C、Replay Cards 与 Parent Support。
- v1 `content/`：30 关归档，只作历史对照和兼容测试。
- v1 Sora demo 提示词：**60 份**，不再继续生产。
- 新版 A/B/C 提示词草稿：**90 / 90**，逐课分镜 **30 / 30**；说明与索引见 `prompts/README.md`、`prompts/04/README.md`。课程仍为 `language_reviewed`。
- AI 演示 `demo.mp4`：**14 / 30**（第 1–4 章全齐，第 5 章 2/3；见 `demo/PROGRESS.md`）。
- 孩子表演 `performance.mp4`/`.webm`：admin 用户 2 / 30。
- 新版响应式场景：10 / 10章、20 / 20张独立desktop/mobile WebP；旧8张图仅本章回退。

**当前重点**：在不急于恢复视频生产的前提下，继续做真实家庭试用记录；使用已补齐的三段提示词，逐课确认时长与镜头，达到 `video_ready` 后再制作正式 demo。

### 代码状态

- 地图骨架 + 动态章节世界（大型动画主景 + 平滑路线 + 响应式节点）：完成。
- PC 摄像头实时录制（`getUserMedia` + `MediaRecorder`，一钮两态 + 5 分钟上限 + 回放 + Redo/Save）：完成。
- 现代玩具剧场：三层象牙白路径＋青绿进度内线、完成勾/current定位针/锁、浮动外壳、真实计数和课程目录；完整验收记录见 `docs/plans/2026-09-05-modern-toy-theatre-ui-implementation.md`。
- webm/mp4 双格式支持（scanner + 路由 + 上传）：完成。
- **多用户认证**（登录/session、admin 用户管理、performance 按用户隔离到 `recordings/<用户名>/`）：完成。
- **Electron 桌面壳**（launch.vbs 一键启动、自定义标题栏、自动授权摄像头/麦克风、退出杀 Flask）：完成。
- **服务端视频处理**（上传/启动时 ffmpeg 压缩 >5MB 视频 + 生成缩略图，`/thumb` 路由替代 canvas 抽帧封面）：完成。
- **详情页重设计**（卡片布局，design/memo.md + design/plans/ 的产出）：完成。
- 字体自托管、三棵树分离、视频路由越界守卫：完成。
- **Stage 4 运行时迁移**（canonical loader、Stage 媒体路径、A/B/C、Replay Cards、Parent Support）：完成。
- 旧版下一组 demo 原为 `05-why-how-come/03-how-do-you`；课程重构期间暂停排产，待新版 Lesson 达到 `video_ready` 后再恢复（见 `demo/PROGRESS.md`）。

---

## 12. 常见陷阱速查

| 现象 | 原因 / 对策 |
| --- | --- |
| `node --test tests-js/` 失败 | 用 `npm test` 或 glob `node --test tests-js/*.test.mjs` |
| 克隆后地图很多关卡空着 | 视频被 gitignore，本地没有是正常的；放回 `demo/`、`recordings/` 即恢复 |
| 关卡顺序乱了 | 文件夹名没零填充前缀（`01-`、`02-`…），排序靠它 |
| 关卡不解锁 | 上一关没有 `performance` 视频；新版路径是 `recordings/<用户名>/04/<章>/<课>/` |
| 改了 `app.py` 不生效 | debug 模式应自动重载；没重载就重启 `app.py`（Electron 版要关窗重开，它会自己拉起 Flask） |
| 封面显示不出来 | `/thumb/<章>/<关>` 404（缺 `thumb.jpg`）会回退主题色；重启服务触发 `_scan_and_optimize` 补生成，或检查 ffmpeg 是否可用 |
| 从详情页返回背景图消失 | 已修复：`closeDetail` 强制重置 `activeChapter` 并刷新 `updateBgOnScroll` |
| 录制后关卡没亮 | 检查 console 打印的 mimeType；确认 `/upload` 返回 `ext`；scanner 认 `.mp4`+`.webm` |
| 改 `CHAPTER_THEMES` 后 JS 测试红 | 测试钉死了 10 个唯一 world + hex accent；同步改测试或符合约束 |
| 手机仍用桌面图 | 切图断点为768px；检查 v2 mobile 请求与同章候选，不改课程 background_asset |
| 目录关不了或页面不能滚 | 检查 shell.close 的 inert/overflow 恢复、Escape和焦点；不要另建第二个焦点锁 |
| demo上传完成丢失录像草稿 | 只能调用demo面板刷新，不能重开详情；跑两个delayed-upload场景 |
| 隔离Electron打不开 | 本机需已有Electron；环境中的 ELECTRON_RUN_AS_NODE 必须删除，不能设为空字符串 |
| `scaffold_levels.py` 没更新新课 | 该脚本只服务 v1 归档；新版直接编辑 `curriculum/<stage>/.../lesson.json` 并运行 validator |
| venv 失效 | `app/` 被重命名后 venv 绝对路径失效；删 `app/.venv` 重建（见 `app/README.md`） |
| 登录进不去 | admin 密码在 `app/config.json`（没这文件时仅本地开发回退 `admin123`）；若显式配置无效，启动日志会直接指出错误。普通用户由 admin 在用户菜单里增删 |
| Electron 窗口白屏 | Flask 没起来：看 `launch-debug.log` 和 Electron 控制台的 `[flask]` 输出；确认 `app/.venv` 存在 |

---

## 13. 给后续 agent 的速记

### 个人资料增补（2026-09-04）

- 头像＋昵称已接入右上角 My Profile，见 `docs/specs/2026-09-04-personal-profile-design.md`。B「现代玩具剧场」地图、目录、详情与响应式UI已交付，验收见 `docs/plans/2026-09-05-modern-toy-theatre-ui-implementation.md`；压缩审计所列修复仍未交付，勿混淆状态。
- `app/profile_store.py` 管图片/昵称校验、256px JPEG 转换、剥离元数据、原子写入和跨进程文件锁；新增 Pillow 依赖。`profile.mjs` / `profile-model.mjs` / `profile.css` 独立负责资料 UI，不继续向主文件堆放逻辑。
- `PROFILES_ROOT` 默认根目录 `profiles/`，整树忽略入库。内部目录为 `u-` 加用户名 ASCII 十六进制，防止 Windows 大小写账号/保留名称冲突；不是裸用户名，且不修改既有录像路径。
- `/api/profile` GET/POST、`/api/profile/avatar` 只允许当前用户。POST 验 CSRF，整请求 6 MiB、图片 5 MiB/1600 万像素上限；支持静态 JPEG/PNG/WebP。不支持 GIF/HEIC/SVG/动画。
- `/api/me` 增加 displayName/avatarUrl；会话在登录时绑定账号 HMAC 指纹，账号重建或凭据变化会拒绝旧资料会话。升级前会话需重新登录一次。删除用户只清理资料，不清理表演录像。
- `app/tests/conftest.py` 自动隔离所有测试的资料根；新增 `test_profiles.py` 与 JS nickname 测试。真机 Electron/iOS 未验证，Edge 桌面与手机视口已验证。

### 通用速记

- **先跑两套测试**（`npm test` + `pytest -q`）确认基线绿，再动手。
- **纯逻辑放模块，按生命周期归属DOM**：`map-model`/`map-path`/`adventure-navigation`/`world-assets` 是纯模块；目录交给 `adventure-shell`，资料交给 `profile`，地图/详情/录制由 `app.js` 编排。
- **改状态机（`annotate_states`）= 改产品规则**，三思，并更新 `test_scanner.py`。
- **Stage 路径同名**：`curriculum/04/<章>/<课>`、`demo/04/<章>/<课>`、`recordings/<用户名>/04/<章>/<课>` 必须一致。
- **别引入构建工具/打包器/数据库/第三方云服务**——设计上明确排除。（页面内上传是本地功能；自部署见 `DEPLOY.md`。）
- **视频、密码文件（`config.json`/`users.json`）、`.claude`/`.superpowers`/`.zcode` 不入库**。
- **产品语言**：文档可中英混排（README 中文为主），代码与 commit 用英文；面向孩子的 UI 文案要简单温暖。
- **设计文档在 `docs/`**（specs/plans/archive），**详情页重设计的备忘在 `design/`**——拿不准方向时回去读。
