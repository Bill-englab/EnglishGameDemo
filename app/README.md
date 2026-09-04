# app/ — My English Adventure 网站

本地 Flask 应用：把家庭与同伴英语 role-play 录像排成「阶段 → 章 → 课」向上闯关地图。每章一幅整幅背景插画，路和关卡节点叠在上面。通过页面录制，或放一个 `performance.mp4` 到 `recordings/<用户名>/<阶段>/<章>/<课>/`，即可点亮该课、解锁下一课。

新版 4 岁 30 课已按 [`docs/specs/2026-09-04-curriculum-architecture-design.md`](../docs/specs/2026-09-04-curriculum-architecture-design.md) 写入 `curriculum/04` 并通过审查。应用直接读取该结构，支持年龄阶段、A/B/C 对话、完整 Replay Card、家长提示和内容版本；旧 `content/` 仅保留为 v1 参考。

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

桌面采用紧凑单行标题栏、左视频/右对话；小于900px切换为视频页签＋单列阅读。**Your Show → Start recording** 进入摄像头，**Watch & Learn → Add demo** 添加示范。完整A/B/C、完整复练顺序展示，只让页面滚动。家长说明与 **VideoGen · A/B/C prompts** 默认折叠；[30课90份提示词](../prompts/04/README.md)均可复制。

详情重排不改变地图、课程、进度或文件存储。返回地图/换课会释放摄像头和预览资源；没有新增未保存确认或录像历史。设计与验证见[实施记录](../docs/plans/2026-09-04-detail-reading-redesign.md)。

可选浏览器回归 `node tests-browser/detail-upload.cjs` 检查演示上传完成时保留正在录制/尚未保存的表演。它需要已有的 Playwright、Microsoft Edge 和可运行 Flask 的 Python，不属于默认两套测试。脚本自启临时端口与临时账号/媒体目录，拦截上传，不读取家庭录像、不启动媒体扫描，退出时清理自有测试服务与临时目录。无需为应用本身增加浏览器测试依赖。

## 个人资料

右上角账号菜单 → **My Profile**：选择照片、预览并保存，修改昵称，或恢复默认头像。取消不会保存草稿；登录用户名与录像路径不变。首次升级后旧会话需要重新登录一次。

支持 JPEG、PNG、静态 WebP（最多 5 MiB / 1600 万像素），HEIC 请先导出 JPEG。后端使用 Pillow 校正方向、居中裁切为 256×256 JPEG 并移除照片元数据，不保留原图。部署时重新安装 `requirements.txt` 中的依赖。

资料独立存于 `profiles/u-<用户名的 ASCII 十六进制>/`，例如 alice 为 `u-616c696365`；这种编码避免 Windows 大小写账号碰撞。目录包含 `profile.json`、随机命名头像与持久 `.lock`；不要手动删除运行中的锁文件。删除账号会清理资料，不删除表演录像。头像通过登录接口返回，不放进公开静态目录。

`GET/POST /api/profile` 读取/保存当前用户资料；POST 需要 GET 返回的 csrfToken（请求头 X-CSRF-Token）。`GET /api/profile/avatar` 仅返回自己的头像；`/api/me` 增加 displayName/avatarUrl。新接口限制整请求 6 MiB，不改变视频 500 MiB 上限。

设计与边界见[个人资料规范](../docs/specs/2026-09-04-personal-profile-design.md)。

## 背景插画

每章背景图放 `static/worlds/<章节名>.jpg`（如 `01-wants-requests.jpg`）。图缺失时用 `accent` 色做纯色兜底，不报错。竖版 9:16 构图，元素在两侧、中间留路带。

## 测试

```bash
cd app
.venv/Scripts/python -m pytest            # Python：后端逻辑 + 路由 + 上传
npm test                                   # JS：前端纯模块（零依赖，仅 node --test）
# 或直接： node --test tests-js/*.test.mjs
```

> ⚠️ JS 测试必须用 glob `tests-js/*.test.mjs`，传目录会失败。

## 结构

```
app/
  app.py            # Flask 路由：/、/api/library、/video、/upload
  scanner.py        # 纯逻辑：投影 curriculum/ + 算关卡三态（保留 v1 扫描兼容）
  profile_store.py  # 头像解码与隐私处理、昵称校验、原子存储与文件锁
  templates/map.html
  static/
    app.js          # 主逻辑：渲染地图、A/B/C 详情、录制与上传 UI
    profile.mjs     # 独立的资料面板、草稿、上传与账号显示
    profile-model.mjs # 昵称纯校验（与后端语义一致）
    profile.css     # 资料面板样式，不重排地图
    lesson-view.mjs # 纯：对话分段、Replay Card、章节上下文
    detail-media.mjs # 纯：窄屏页签可见性，录制保持表演面板
    map-model.mjs   # 纯：10 章主题（world + accent）、视觉状态、旋转、帧暗检测
    map-path.mjs    # 纯：Catmull-Rom 平滑路径
    style.css       # 绘本风样式 + 自托管 @font-face
    fonts/          # 自托管 woff2（Fredoka/Nunito，离线可用）
    worlds/         # 每章背景插画（.jpg）
  tests/  tests-js/
  package.json      # 仅挂 "test" 脚本，零依赖
```

纯逻辑在 `map-model.mjs` / `map-path.mjs` 等模块（有测试）；地图编排在 `app.js`，个人资料 DOM 生命周期在 `profile.mjs`。
