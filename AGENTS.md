# AGENTS.md

> 本文件面向后续接手的 AI agent（以及人类协作者）。读完它，你应该能在不动错地方的前提下开始改这个项目。
> 项目的完整背景与设计取舍见根目录 [`README.md`](README.md)；本文是「操作手册」，README 是「产品文档」。

---

## 1. 这个项目是什么

**My English Adventure** —— 一个**本地运行**的小网站，把父子线下英语 role-play 的录像排成一条「章 → 关」的向上闯关地图（参考 Two Dots）。每过一关，地图上那个点就亮起来，变成**孩子自己录像里的画面**。

### 必须先理解的三个产品认知（违反这些会做错方向）

1. **网站不是教学引擎，是「奖杯陈列柜」。** 真正的英语教学发生在线下父子 role-play。网站只做两件事：把完成的 role-play 可视化成进度；让孩子反复回看自己的表演录像。
2. **给孩子多巴胺的不是星星，是回头看自己的表演。** 星星只是入口，「我的表演回放」才是主舞台。所以点亮的关卡，圆点直接变成那段表演视频的画面。
3. **句式高级度不由网站量化。** 那是线下目标。网站只做二元判定：有没有 `performance.mp4`。

### 明确排除的事（别去实现）

- ❌ 教学引擎 / AI 对话搭档
- ❌ 上传页 / 后端上传接口（「上传」= 手动把 `performance.mp4` 拖进文件夹）
- ❌ 1/2/3 星分级（一颗星，二元）
- ❌ 公网部署（仅本地跑）
- ❌ 用星星追踪「句式高级度」

---

## 2. 仓库布局

```
D:/TaviusProject/                      # 仓库根（git: master 分支）
├── roleplay-website/                  # Flask 网站（后端 + 前端 + 测试）—— 代码核心
│   ├── app.py                         # Flask 路由：/、/api/library、/video/<...>
│   ├── scanner.py                     # 纯逻辑：扫目录树 + 算关卡状态
│   ├── requirements.txt               # flask>=3.0, pytest
│   ├── templates/map.html             # 地图页外壳（地图视图 + 详情视图）
│   ├── static/
│   │   ├── app.js                     # 主逻辑：拉数据、渲染地图与详情、播放视频（入口模块）
│   │   ├── map-model.mjs              # 纯模型：10 章主题、视觉状态、布局、帧暗检测
│   │   ├── map-scenes.mjs             # 确定性场景：seeded PRNG 生成场景规格 + 内联 SVG 工厂
│   │   ├── map-path.mjs               # 纯函数：Catmull-Rom → 三次贝塞尔平滑路径
│   │   └── style.css                  # 绘本风样式（童趣大节点、动态主景动画）
│   ├── tests/                         # Python 测试（pytest）：test_scanner.py, test_app.py
│   ├── tests-js/                      # JS 测试（node --test）：map-model/path/scenes .test.mjs
│   ├── .venv/                         # 本地虚拟环境（已 gitignore）
│   └── README.md                      # 网站自身说明（setup/run/test）
├── roleplay-dialogues/                # 内容库 —— 文件系统即数据库
│   ├── 01-wants-requests/             # 章（10 个，零填充前缀）
│   │   ├── dialogues.md               # 本章对话源（scaffold_levels.py 的输入）
│   │   ├── 01-can-i-have/             # 关（每章 3 个）
│   │   │   ├── meta.json              # 关卡文案（标题、场景、句式、对话、变体）
│   │   │   ├── demo.mp4               # AI 演示视频（备课放）—— 已 gitignore
│   │   │   └── performance.mp4        # 孩子表演；存在=通关点亮 —— 已 gitignore
│   │   ├── 02-i-need/ …
│   │   └── 03-can-we/ …
│   ├── 02-refusing-bargaining/ … 10-planning-predicting/
│   └── PROGRESS.md                    # 视频素材进度表（demo 6/30，手维护）
├── video-prompt/                      # 每关的 Sora demo 提示词（两段式 a/b）
│   ├── README.md                      # 角色设定 + 节奏说明 + 全 30 关索引
│   └── 01-wants-requests/D1a.txt, D1b.txt …
├── scaffold_levels.py                 # 从 dialogues.md 生成 meta.json（不覆盖已激活的关）
├── docs/superpowers/                  # 设计文档与实现计划（specs/ 和 plans/）
├── .vibe/                             # 设计备忘与首轮计划（冻结的设计基线，只读参考）
├── .superpowers/                      # superpowers 工作流产物（worktree、sdd 计划）—— 已 gitignore
├── .claude/                           # Claude Code 权限配置 —— 已 gitignore
├── run.bat                            # Windows 一键启动脚本
├── TwoDots参考.jpeg                   # Two Dots 风格参考图
└── README.md                          # 产品文档（背景、机制、结构、状态）
```

> **视频不入库**：所有 `roleplay-dialogues/**/*.mp4` 被 `.gitignore` 忽略（体积 + 隐私）。仓库只跟踪 `meta.json`、`dialogues.md`、提示词等文案。克隆后本地是没有视频的，地图上对应关卡会显示空状态——这是预期的。

---

## 3. 技术栈

| 层 | 技术 | 关键约束 |
| --- | --- | --- |
| 后端 | Python / Flask（单文件 `app.py`） | 无数据库、无上传接口、无构建 |
| 数据 | 文件系统（目录树 = 数据库） | 文件夹名零填充前缀，字符串排序即预期顺序 |
| 前端 | 原生 HTML/CSS/JS（ES Modules） | **无构建步骤、无打包器、无 npm 依赖**。`.mjs` 模块直接由浏览器加载 |
| 测试 | pytest（Python）+ `node:test`（JS） | 见下文「测试」一节 |
| Python 版本 | 由本地 `.venv` 决定（Windows 用 `.venv/Scripts/python`） | `requirements.txt` 仅 `flask>=3.0, pytest` |
| Node 版本 | v22+（用 `node --test`） | 无 `package.json`，无 node_modules |

**没有 npm/pip 之外的工具链。** 改前端不需要装任何东西；改后端只需一个 venv。

---

## 4. 如何运行

### 首次初始化（一次性）

```bash
cd roleplay-website
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# macOS/Linux:  .venv/bin/python -m pip install -r requirements.txt
```

### 启动开发服务器

```bash
cd roleplay-website
.venv/Scripts/python app.py          # 然后开 http://127.0.0.1:5000
```

或双击根目录 `run.bat`（Windows，自动开浏览器）。

- `app.run(debug=True, port=5000)` —— 开了 debug，改 Python 文件会自动重载。
- 内容根目录默认是 `../roleplay-dialogues`（相对 `app.py`）。可用环境变量 `LIBRARY_ROOT` 覆盖（测试或挂载别的内容库时用）。

### 调试单接口

```bash
curl -s http://127.0.0.1:5000/api/library | head        # 看带状态的章/关树
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/   # 看页面状态码
```

---

## 5. 如何测试

**两套独立测试，都要跑。** 改了对应层的代码后，务必跑对应测试。

### Python 测试（后端逻辑 + 路由 + HTML 外壳）

```bash
cd roleplay-website
.venv/Scripts/python -m pytest        # 全量（约 22 个）
.venv/Scripts/python -m pytest -v     # 带名字
.venv/Scripts/python -m pytest tests/test_scanner.py -v   # 单文件
```

测试用 `tmp_path` 临时目录构造假内容库，`monkeypatch` 替换 `app.ROOT`，不碰真实 `roleplay-dialogues/`。

### JS 测试（前端纯模块逻辑）

```bash
cd roleplay-website
node --test tests-js/*.test.mjs       # ✅ 正确：glob 全量（约 10 个）
node --test tests-js/map-path.test.mjs # 单文件
```

> ⚠️ **坑**：`node --test tests-js/`（传目录）会失败、`node --test tests-js` 也不行。**必须用 glob `tests-js/*.test.mjs` 或显式列文件**。这是 Node test runner 对无 `package.json` 项目的目录发现限制。

### 当前测试覆盖什么

- `test_scanner.py`：扫描排序、`meta.json` 回退、`has_demo`/`has_performance` 标志、三态机（locked/unlocked/completed）、跨章状态传递、全完成无 current。
- `test_app.py`：三个路由、视频 404 边界（缺文件 / 非法 kind）、HTML 外壳含所有关键 `id`、`app.js` 含可重试加载逻辑、静态模块可被 serve。
- `tests-js/*.test.mjs`：10 章 10 个不同世界、视觉状态选择、桌面/手机布局比例、旋转稳定有界、暗帧检测（含透明像素跳过）、平滑路径空/两点/连续、场景规格稳定且平衡、章世界各不相同。

### 改代码时的自检顺序

1. `node --check static/<file>.mjs`（或 `app.js`）—— 快速语法检查。
2. `node --test tests-js/*.test.mjs` —— 改了前端纯模块就跑。
3. `.venv/Scripts/python -m pytest -q` —— 改了后端就跑。
4. 手动 `app.py` 起服务，浏览器看一眼地图 + 详情。

---

## 6. 后端架构

### `app.py`（路由，约 35 行）

三个路由，仅此而已：

| 路由 | 作用 |
| --- | --- |
| `GET /` | 渲染 `map.html` |
| `GET /api/library` | 返回带状态标注的章/关树（JSON）：`scan_library(ROOT)` → `annotate_states(...)` → `jsonify` |
| `GET /video/<chapter>/<level>/<kind>` | 返回 `demo.mp4` / `performance.mp4`。`kind` 只允许 `demo`、`performance`，否则 404；文件不存在也 404 |

`ROOT` = `LIBRARY_ROOT` 环境变量 ?? `../roleplay-dialogues`。

### `scanner.py`（纯逻辑，无 Flask 依赖）

两个函数，**纯逻辑、可单测、无副作用**（除了 `annotate_states` 会就地修改并返回输入）：

- **`scan_library(root) -> list[dict]`**：遍历 `root`，按目录名排序（**依赖零填充前缀**），每关读 `meta.json`，返回章/关树。每关带 `chapter, level, title, scene, patterns, dialogue, variations, has_demo, has_performance`。`meta.json` 缺失或损坏 → 返回空 dict，title 回退为目录名。
- **`annotate_states(chapters) -> list[dict]`**：把关卡扁平化，按全局顺序算状态：

  > **三态规则（三句话）**：关卡顺序 = 文件夹名前缀排序；关卡解锁 = 上一关存在 `performance.mp4`；关卡点亮 = 当前关存在 `performance.mp4`。

  - 第一关永远 `unlocked`（前面没要求）。
  - `has_performance` → `completed`。
  - 否则若上一关 `completed` → `unlocked`，否则 `locked`。
  - 第一个 `unlocked` 且未完成的关标 `current=True`（其余 `current=False`）。全完成则无 current。

  这是整个产品的核心规则，改它前想清楚含义。

### `scaffold_levels.py`（内容脚手架，仓库根）

从每章 `dialogues.md`（课程唯一真相源）解析 D1/D2/D3 对话，写 `meta.json` 到 `NN-slug/` 文件夹。

- **不会覆盖已激活的关**：若文件夹里已有 `demo.mp4`，跳过（保留你手写的 meta）。
- 可随时重跑；只给未激活的关（重新）写 `meta.json`。
- 解析规则见脚本顶注释：`## D{n}｜标题` → 标题；`**背景：**` → scene；`` `句式` `` → patterns；`> **F:** / **C:**` → dialogue（F=Dad, C=Child）；`**换样重演：**` → variations。英文 title = 第一句 Child 台词。

---

## 7. 前端架构

**无框架、无构建。** `map.html` 用 `<script type="module" src="/static/app.js">` 加载，app.js 再 import 三个 `.mjs` 模块。

### 模块职责

| 文件 | 角色 | 依赖 |
| --- | --- | --- |
| `map-model.mjs` | **纯数据/纯函数**：`CHAPTER_THEMES`（10 章主题：world 名、渐变、accent、props、heroes）、`getChapterTheme`、`getLevelVisualState`、`getLayoutForWidth`、`getStableRotation`、`isFrameDark` | 无 |
| `map-path.mjs` | **纯函数**：`buildSmoothPath(points)` —— Catmull-Rom → 三次贝塞尔，绝不修改输入数组 | 无 |
| `map-scenes.mjs` | **确定性场景**：`buildSceneSpec(name, seed)`（mulberry32 PRNG）、`renderChapterScenery(leftEl, rightEl, spec)`、`SVG_FACTORIES`（~30 个内联 SVG）、`HERO_FACTORIES`（20 个大型主景 SVG） | map-model |
| `app.js` | **编排层**（唯一有 DOM 副作用的）：拉 `/api/library`、渲染地图、抽取封面、画路径、开关详情、可重试加载 | 上面三个全依赖 |

### 两层视图

1. **地图视图**（`#map-view`）：10 个 `.chapter-world` section 自上而下，每个是三列网格（左场景 / 主路线 / 右场景）。关卡节点 `.level-node` 按 `getLevelVisualState` 分三态渲染：
   - `completed`：圆点变成孩子表演视频抽出的封面（polaroid 风，带稳定旋转 + 金星角标）。
   - `current`：播放按钮。
   - `locked`：锁图标。
   - **每个状态都可点**（无 disabled），点击打开详情。
2. **详情视图**（`#detail-view`）：标题、句式 pills、场景、demo 视频（默认 **0.75 倍速**）、完成星、performance 视频（1.0 倍速）、对话全文、变体。

### 几个关键实现细节（改时注意）

- **封面抽取** `extractSafeCover()`：seek 到 performance 视频 20% 处，画到 canvas，用 `isFrameDark` 检测暗帧（跳过透明像素）。暗帧 / 超时 / 出错 → 返回 null，用 fallback 渐变。有 `frameCache`。`crossOrigin="anonymous"` + 本地同源，正常不污染 canvas。
- **路径绘制** `drawMapPath()`：测所有 `.level-node` 中心点（DOM 顺序 = 章 1→10、关 1→N），用 `buildSmoothPath` 画一条连续 SVG 路径。在 render 后、`document.fonts.ready` 后、封面 resolve 后、debounced resize 后都会重画。**`.level-node` 本身不带 ambient transform**（旋转只在内层），所以 hover/场景动画不会让测出的中心点漂移。
- **确定性场景**：`buildSceneSpec(chapterName, seed)` 用 mulberry32，相同输入必出相同场景。props 交替分左右；heroes 固定一左一右。未知 prop kind → 渲染中性圆球，**永不抛异常**。
- **可重试加载**：`loadLibrary()` 在 loading / error / scroll 三态间切换（`showOnly`），出错显示「map is taking a nap」+ retry 按钮。`fetch("/api/library", { cache: "no-store" })`。
- **动效约束**（见设计文档）：场景动画周期 10–20s 缓慢柔和；只动 SVG 内部零件，外框稳定；`prefers-reduced-motion: reduce` 关闭所有场景动画；场景 `pointer-events: none`，永不抢路线几何。

### 布局比例（测试钉死，别乱改）

- 桌面（>600px）：左 18 / 主 64 / 右 18；节点 220px，current 244px。
- 手机（≤600px）：左 12 / 主 76 / 右 12；节点 140px，current 152px。

---

## 8. 内容工作流（备课 vs 使用）

项目分两个阶段，**备课由父亲独立做，使用是父子一起**。

### 备课流程（改内容时按这个走）

1. **写对话源**：编辑 `roleplay-dialogues/<章>/dialogues.md`（D1/D2/D3，格式见 `01-wants-requests/dialogues.md`）。
2. **生成 meta**：`python scaffold_levels.py` → 写出各关 `meta.json`（已有 demo.mp4 的关不动）。
3. **做 demo 视频**：拿 `video-prompt/<章>/D{N}a.txt` + `D{N}b.txt` 各粘进 Sora 生成两段 → ffmpeg 流拷贝拼成 `demo.mp4` 放进对应关文件夹。
4. **更新进度表**：改 `roleplay-dialogues/PROGRESS.md` 的勾选状态 + 小计。

### demo.mp4 拼接命令

```bash
printf "file 'a.mp4'\nfile 'b.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
```

### 角色设定（每份视频提示逐字一致，保证角色稳定）

- 爸爸 = 卡通狗（温棕色、大垂耳、橄榄绿 T 恤）
- 孩子 = 卡通小老虎（4 岁、橙底黑条纹、黄 T 恤、粗短 toddler 身形）
- 风格：Pixar 式 3D 卡通 / 暖光 / 粉彩 / 萌系家庭向；锁机中景双人、轻微漂移、16:9。

### 使用流程（父子一起，别自动化）

看 demo → 线下练 → 录 performance.mp4 → 父亲拖进关文件夹 → 刷新 → 关卡点亮 → 孩子点自己的画面回看。

> 录像应是游戏自然高潮，不是小考。4 岁孩子一旦感到被测会躲避。

### `meta.json` 结构（全字段）

```json
{
  "title": "Can I have the apple one, please?",
  "title_zh": "想要某样东西",
  "scene": "零食时间，他挑要哪个、要几个。",
  "patterns": ["Can I have ___?", "I want ___"],
  "dialogue": [
    {"speaker": "Dad", "line": "..."},
    {"speaker": "Child", "line": "..."}
  ],
  "variations": "\"apple one\" 换 \"banana one\"；..."
}
```

`speaker` 只认 `Dad` / `Child`（详情视图按 Child/Dad 分气泡样式）。`title` 英文、`title_zh` 中文。除 `title` 外字段缺失都有默认（空串/空数组）。

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

主题视觉定义在 `map-model.mjs` 的 `CHAPTER_THEMES`（章号 → {world, gradient, accent, props, heroes}）。测试要求：10 个 world 名互不相同、20 个 hero 名互不相同、每章 props 3–5 个、heroes 恰好 2 个。**加新章或改 world 名会破测试。**

---

## 10. Git 约定

### 分支

- `master` —— 当前工作分支（开发在这里）。
- `main` —— 主分支（PR 一般对着它）。
- `codex/chapter-world-map` —— 存在的历史特性分支。
- `.superpowers/worktrees/chapter-world-map/` —— superpowers 工作流建的 worktree（已 gitignore 产物那部分，但 worktree 本身在磁盘上）。

### Commit 信息风格（conventional commits，英文）

从历史看，前缀用：`feat:` / `fix:` / `content:`（内容增改）/ `chore:` / `docs:` / `test:`。正文可带中文说明。例：

```
feat: connect chapter worlds with a smooth route
content: expand all roleplay dialogues to complete sentences
fix: style topbar title and drop dead slash rule
```

### .gitignore 要点

- `__pycache__/`、`*.pyc`、`.venv/`
- `roleplay-dialogues/**/*.mp4` —— **所有视频本地 only**
- `.claude/`、`.superpowers/`

> 所以：**别 `git add` 任何 `.mp4`**（会被忽略，强行 add 也没意义）；也别把 `.claude/`、`.superpowers/` 纳入版本。文案（`meta.json`、`dialogues.md`、`*.txt` 提示词、`PROGRESS.md`）才进库。

### 提交前检查清单

- [ ] 改了前端纯模块 → `node --test tests-js/*.test.mjs` 绿。
- [ ] 改了后端 → `.venv/Scripts/python -m pytest -q` 绿。
- [ ] 没误加 `.mp4` / `.venv` / `.claude` / `.superpowers`。
- [ ] 若改了 `CHAPTER_THEMES` 或布局比例，确认测试里钉死的断言仍成立。

---

## 11. 当前状态与进行中的工作

### 内容进度（截至 2026-08）

- 关卡文案 `meta.json`：**30 / 30**（全 10 章 × 3 关）。
- Sora demo 提示词：**60 份**（每关 a/b 两段）。
- AI 演示 `demo.mp4`：**6 / 30**（第 1、2 章完成；见 `PROGRESS.md`）。
- 孩子表演 `performance.mp4`：极少（第一章第一关是唯一真正贯通的）。

**瓶颈**：demo 视频备课跟不上闯关节奏，地图会随备课缓慢生长。

### 代码状态

- 地图骨架（地图 + 状态逻辑 + 详情页 + 视频播放 + 可重试加载）：完成。
- 「动态章节世界」升级（大型动画主景 + 平滑路线 + 响应式节点）：已实现，见 `docs/superpowers/specs/2026-08-12-living-chapter-worlds-design.md` 及对应 plan（tasks 全打勾）。
- 工作区有未提交改动（`map-model.mjs`、`map-scenes.mjs`、`style.css` 及对应 JS 测试被 modified）——动手前先 `git status` 看清楚，别覆盖他人在途的改动。

### 进行中 / 下一步

- 按顺序继续做 demo 视频：下一组是 `03-asking-help/01-can-you-help`（见 `PROGRESS.md` 末尾）。

---

## 12. 常见陷阱速查

| 现象 | 原因 / 对策 |
| --- | --- |
| `node --test tests-js/` 失败 | 用 glob：`node --test tests-js/*.test.mjs` |
| 克隆后地图很多关卡空着 | 视频被 gitignore，本地没有是正常的；放回 `demo.mp4`/`performance.mp4` 即恢复 |
| 关卡顺序乱了 | 文件夹名没零填充前缀（`01-`、`02-`…），排序靠它 |
| 关卡不解锁 | 上一关没有 `performance.mp4`；放进去刷新 |
| 改了 `app.py` 不生效 | debug 模式应自动重载；没重载就重启 `app.py` |
| 封面显示不出来 | `extractSafeCover` 检测到暗帧或 canvas 被污染会回退；检查视频是否同源可读 |
| 改 `CHAPTER_THEMES` 后 JS 测试红 | 测试钉死了 10 个唯一 world、20 个唯一 hero、props 3–5、heroes 2；同步改测试或符合约束 |
| `scaffold_levels.py` 没更新某关 | 那关已有 `demo.mp4`（被视作已激活，脚本故意跳过保护你的 meta） |

---

## 13. 给后续 agent 的速记

- **先跑两套测试**确认基线绿，再动手。
- **纯逻辑放模块、副作用放 app.js**：`map-model`/`map-path`/`map-scenes` 是纯的、有测试的；新增纯逻辑优先进这些模块并配测试，别塞进 `app.js`。
- **改状态机（`annotate_states`）= 改产品规则**，三思，并更新 `test_scanner.py`。
- **别引入构建工具/npm 依赖/数据库/上传接口/公网部署**——这些是设计上明确排除的。
- **视频和 `.claude`/`.superpowers` 不入库**。
- **产品语言**：文档可中英混排（README 中文为主），代码与 commit 用英文；面向孩子的 UI 文案要简单温暖。
- **设计文档在 `docs/superpowers/`，原始诉求在 `.vibe/`**——拿不准方向时回去读。
