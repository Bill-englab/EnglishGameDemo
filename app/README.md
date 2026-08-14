# app/ — My English Adventure 网站

本地 Flask 应用：把父子线下英语 role-play 录像排成「章 → 关」向上闯关地图。放一个 `performance.mp4` 到 `recordings/<章>/<关>/` 即点亮该关、解锁下一关。

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
.venv/Scripts/python app.py      # 开 http://127.0.0.1:5000
```

或从仓库根双击 `run.bat`（Windows，自动开浏览器）。

## 三棵内容树（默认相对仓库根）

| 环境变量 | 默认 | 作用 |
| --- | --- | --- |
| `CONTENT_ROOT` | `../content` | 课程文案（meta.json） |
| `DEMO_ROOT` | `../demo` | AI 演示视频 |
| `RECORDINGS_ROOT` | `../recordings` | 孩子表演录像 |

可分别用环境变量覆盖（测试或挂载别的内容库时用）。

## 路由

- `GET /` → 地图页
- `GET /api/library` → 带状态标注的章/关树（JSON）
- `GET /video/<chapter>/<level>/<kind>` → `demo` 或 `performance` 视频（非法 kind / 路径越界 / 文件不存在均 404）

## 测试

```bash
cd app
.venv/Scripts/python -m pytest            # Python：后端逻辑 + 路由
npm test                                   # JS：前端纯模块（零依赖，仅 node --test）
# 或直接： node --test tests-js/*.test.mjs
```

> ⚠️ JS 测试必须用 glob `tests-js/*.test.mjs`，传目录会失败。

## 结构

```
app/
  app.py            # Flask 路由：/、/api/library、/video/<...>
  scanner.py        # 纯逻辑：扫 content/ + 算关卡三态（locked/unlocked/completed）
  templates/map.html
  static/           # app.js + 三个纯 .mjs 模块 + style.css + fonts/（自托管，离线可用）
  tests/  tests-js/
  package.json      # 仅挂 "test" 脚本，零依赖
```

纯逻辑在 `map-model.mjs` / `map-path.mjs` / `map-scenes.mjs`（有测试）；副作用集中在 `app.js`。
