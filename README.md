# My English Adventure

把父子线下英语 role-play 的录像，排成一条「章 → 关」的闯关地图。每过一关，地图上那个点就亮起来，变成孩子自己录像里的画面。

这是一个本地运行的小网站——不是在线教学平台，是孩子的「表演回放柜」。

## 工作原理

- **10 章 × 3 关 = 30 关**，每章对应一个英语语言主题（wants-requests、refusing-bargaining、asking-help 等）。
- 每关两段视频：`demo.mp4`（AI 生成的演示动画，给孩子看样板）+ `performance.mp4`（孩子照着练后录的表演）。
- **放一个 `performance.mp4` 进去，这关就点亮，下一关解锁。** 点亮的关卡圆点变成孩子录像的画面，点击回放。
- 地图上每章一幅背景插画，关卡节点沿蜿蜒路排列，背景随滚动交叉淡入淡出。

## Quick Start

```bash
cd app
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # Windows
# macOS/Linux:  .venv/bin/python -m pip install -r requirements.txt

.venv/Scripts/python app.py
```

打开 http://127.0.0.1:5000 。Windows 也可双击根目录 `run.bat`。

## 内容结构

文案和视频分开放：

```
content/        课程文案（meta.json + dialogues.md，入库）
demo/           AI 演示视频（本地，gitignored）
recordings/     孩子表演录像（本地，gitignored）
prompts/        Sora 视频生成提示词（入库）
app/            Flask 网站
tools/          脚本
docs/           设计文档
```

三棵内容树的 `<章>/<关>` 目录名必须一致。文件夹名零填充前缀（`01-`…`10-`），排序即闯关顺序。

**上传视频**：在详情页点「Add demo / Add performance」按钮选文件即可，文件自动写到对应目录。也可手动拖文件到 `demo/` 或 `recordings/` 再刷新。Chrome 下会记住上次打开的文件夹。

## meta.json

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

编辑 `content/<章>/dialogues.md` 后跑 `python tools/scaffold_levels.py` 生成 meta.json（已有 demo 的关不会被覆盖）。

## 技术栈

Flask 单文件后端，文件系统即数据库。前端原生 ES Modules，无构建步骤、无 npm 依赖。字体自托管，离线可用。

| 路由 | 作用 |
| --- | --- |
| `GET /` | 地图页 |
| `GET /api/library` | 章/关树（带状态标注，JSON） |
| `GET /video/<chapter>/<level>/<kind>` | 视频流（demo 或 performance，支持 Range） |
| `POST /upload/<chapter>/<level>/<kind>` | 上传视频到对应目录（流式写盘，500MB 上限） |

### 测试

```bash
cd app
.venv/Scripts/python -m pytest     # Python
npm test                            # JS（零依赖，仅 node --test）
```

## 进度

- 关卡文案：30/30
- 背景插画：8/10
- demo 视频：7/30（见 `demo/PROGRESS.md`）
- Sora 提示词：60 份

## 设计原则

- 不做教学引擎——教学在线下发生
- 不做星级评分——二元判定（有/没有 performance.mp4）
- 不部署公网——仅本地
- 不引入构建工具/数据库

## License

个人项目，未开源授权。
