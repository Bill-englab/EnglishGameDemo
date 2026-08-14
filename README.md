# My English Adventure — 英语 Role-play 闯关网站

> 一个**本地运行**的小网站,把父子线下英语 role-play 的录像,排成一条「章 → 关」的闯关地图。每过一关,地图上那个点就亮起来,变成**孩子自己录像里的画面**。
>
> 它是孩子的「奖杯陈列柜」,不是老师。

---

## 1. 背景与目的

### 背景

- **服务对象**:一个 4 岁、已具备基础英语交流能力的孩子。
- **教学者**:父亲(英语流利),长期与孩子用英文 role-play,按主题积累了大量对话素材,已整理成 10 个主题目录(`content/`)。
- **痛点**:孩子能交流,但**句式偏基础、不够丰富**。

### 目的

这个网站**不是教学引擎**。真正的英语教学发生在**线下**——父亲与孩子 role-play、反复练。网站的职责只有两件:

1. 把每一次完成的 role-play,**可视化成游戏般的进度与成就**(Two Dots 式向上的闯关地图);
2. 让孩子能**反复回看自己的表演录像**——这才是真正的奖励。

> **关键认知**:真正给孩子多巴胺的不是星星,是回头看自己的表演。星星只是入口,「我的表演回放」才是主舞台。
>
> 因此,原始诉求里的「句式更高级」**不由网站量化显示**;它是线下练习的目标,不是网站要追踪的指标。

---

## 2. 运作形式(核心机制)

### 地图:章 → 关

参考 **Two Dots**——一条向上的主线,由一关关节点组成:

```
Ch.10 planning-predicting   ○ ○ ○          ← 锁住,还没到
Ch.09 reporting-others      ★ ← 当前关
Ch.08 recounting-day        ★ ★
···
Ch.01 wants-requests        ★ ★ ★          ← 已通关,常回来回味
```

- 全图 = **10 章 × 每章 3 关 = 30 关**(每个章 = 一个语言主题)。
- 10 个主题:`wants-requests`、`refusing-bargaining`、`asking-help`、`where-locating`、`why-how-come`、`feelings-preferences`、`reasoning`、`recounting-day`、`reporting-others`、`planning-predicting`。

> 为什么是 30 关而不是 10 颗星:4 岁孩子需要**频繁的小奖励**,只 10 颗星太少、爬完太快。

### 每关两段视频(教学闭环)

每个关卡包含**两段视频**,各司其职,对应标准教学闭环 **样板 → 练 → 演 → 录**(I-do / We-do / You-do):

| 视频 | 来源 | 存放 | 作用 |
| --- | --- | --- | --- |
| `demo.mp4` | 备课阶段 AI 生成的动画 | `demo/<章>/<关>/` | 给孩子「看样板」——演示这段对话怎么演 |
| `performance.mp4` | 父子照 demo 排练后,录下孩子的表演 | `recordings/<章>/<关>/` | 给孩子「看自己」——这才是真正的奖励 |

### 关卡状态(三态)

| 状态 | 触发条件 | 显示 |
| --- | --- | --- |
| **锁住** locked | 上一关还没有 `performance.mp4` | 灰圈 / 锁,不可点 |
| **已解锁** unlocked | 上一关已完成,本关还没有 `performance.mp4` | 可点开看 demo,未亮 |
| **已完成** completed | 本关有 `performance.mp4` | 点亮(孩子录像的画面)+ 完成角标 |

规则三句话讲完:**关卡顺序 = 文件夹名前缀排序;关卡解锁 = 上一关存在 `performance.mp4`;关卡点亮 = 当前关存在 `performance.mp4`。**

> 4 岁孩子对抽象 ★ 无感,认的是**自己的画面**。所以点亮的关卡,圆点直接变成那段表演视频的画面,点击即回放——这才是他反复回来点开看的动力。星星降级为完成角标。

---

## 3. 使用方法

### 一次典型的「使用」流程(父子一起)

1. 孩子点开当前关(或父亲代点)→ 播 `demo.mp4`,看这段怎么演。
2. 父子照 demo,线下反复 role-play。
3. 练熟,录一段 `performance.mp4`。
4. 父亲在详情页点「Add performance」按钮选文件 → 自动上传到位 → 页面自动刷新 → 这关点亮 → 孩子点自己的画面,回看那段表演。

> 也可以手动把文件拖进 `recordings/<章>/<关>/` 再刷新,效果一样。页面内上传只是省去翻目录的麻烦,文件实际复制到同一位置。

> ⚠️ **录像应是游戏的自然高潮,不是另加的小考。** 4 岁孩子一旦感到被测,会开始躲避。留意他是否开始找借口躲。

### 本地运行

```bash
cd app
.venv/Scripts/python app.py      # Windows
# macOS/Linux:  .venv/bin/python app.py
```

浏览器打开 **http://127.0.0.1:5000**。或从仓库根双击 `run.bat`(Windows,自动开浏览器)。

- 三棵内容树默认相对仓库根:`content/`(文案)、`demo/`(演示视频)、`recordings/`(表演录像)。可用环境变量 `CONTENT_ROOT` / `DEMO_ROOT` / `RECORDINGS_ROOT` 分别覆盖(用于测试或挂载别的内容库)。
- 仅本地运行,**不部署公网**。

### 两个阶段

| 阶段 | 谁做 | 做什么 |
| --- | --- | --- |
| **备课** | 父亲独立完成 | 搭网站、写每关文案、用 AI 生成 `demo.mp4` |
| **使用** | 父子一起 | 看 demo、练、录表演、拖文件、关卡点亮 |

> **瀑布式提醒**:不要「备完整套课再上」。先**贯通第一关**(一站 + 一关 + 能录能放能点亮),本周就和孩子试一次,用真实反应验证,再扩展到其余主题。

---

## 4. 内容结构(三棵树分离)

文案、演示视频、表演录像**分开放**,各居其位:

```
content/                        # 课程文案(入库)
  01-wants-requests/
    dialogues.md                # 本章对话源(scaffold_levels.py 的输入)
    01-can-i-have/
      meta.json                 # 关卡文案(备课写)
    02-i-need/  03-can-we/

demo/                           # AI 演示视频(本地 only,可再生)
  01-wants-requests/01-can-i-have/demo.mp4

recordings/                     # 孩子表演录像(本地 only,珍贵不可再生)
  01-wants-requests/01-can-i-have/performance.mp4

prompts/                        # 每关的 Sora demo 提示词(两段式 a/b,入库)
  01-wants-requests/D1a.txt, D1b.txt …
```

- 文件夹名必须**零填充前缀**(`01-`、`02-` … `10-`),这样字符串排序就是预期顺序。
- 三棵树的 `<章>/<关>` 目录名必须一致(同一关卡在三处同名)。
- 每关:`meta.json` 在 `content/` 必填;`demo.mp4` 备课时放 `demo/`;`performance.mp4` 由父亲放 `recordings/`(存在即点亮)。

### `meta.json` 结构

```json
{
  "title": "Can I have the apple one, please?",
  "title_zh": "想要某样东西",
  "scene": "零食时间,他挑要哪个、要几个。",
  "patterns": ["Can I have ___?", "I want ___"],
  "dialogue": [
    {"speaker": "Dad",   "line": "..."},
    {"speaker": "Child", "line": "..."}
  ],
  "variations": "\"apple one\" 换 \"banana one\";..."
}
```

> `title_zh` 仅备课参考,前端不显示。`speaker` 只认 `Dad` / `Child`。

### `demo.mp4` 生成流水线(`prompts/`)

为每关提供两段开箱即用的 Sora 提示词(**两段式**,治「一段式说太快」):

- 每个对话拆成 `D{N}a.txt`(前半台词)+ `D{N}b.txt`(后半台词),分别粘进 Sora 各生成一段,自带「慢速 + 句间停顿」指令。
- 两段按 **a → b** 用 ffmpeg 流拷贝拼成 `demo.mp4`,放进 `demo/<章>/<关>/`:

  ```bash
  printf "file 'a.mp4'\nfile 'b.mp4'\n" > list.txt
  ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
  ```

- **角色设定**(每份提示逐字一致,保证角色稳定):爸爸 = 卡通狗(温棕色、大垂耳、橄榄绿 T 恤);孩子 = 卡通小老虎(4 岁、橙底黑条纹、黄 T 恤)。风格统一 Pixar 式 3D 卡通 / 暖光 / 粉彩 / 萌系家庭向。

详见 [`prompts/README.md`](prompts/README.md);demo 生产进度见 [`demo/PROGRESS.md`](demo/PROGRESS.md)。

---

## 5. 技术架构

**单文件 Python/Flask 后端,文件系统即数据库**:无数据库。前端是原生 HTML/CSS/JS,无构建步骤。每章一幅整幅背景插画(Pixar 风绘本),路和关卡节点叠加在插画上。

| 文件 | 职责 |
| --- | --- |
| `app/app.py` | Flask 路由:`/` 地图页、`/api/library` 数据、`/video/...` 视频流、`/upload/...` 上传(流式写盘) |
| `app/scanner.py` | 纯逻辑:扫 `content/` + 查 `demo/`、`recordings/` 算关卡状态(locked/unlocked/completed/current) |
| `app/templates/map.html` | 地图页外壳(地图视图 + 关卡详情视图 + 导航) |
| `app/static/app.js` | 拉数据、渲染地图与详情、播放视频、上传 UI(File System Access API) |
| `app/static/map-model.mjs` | 10 章主题(world + accent)、视觉状态、旋转、帧暗检测(纯函数) |
| `app/static/map-path.mjs` | Catmull-Rom 平滑路径(纯函数) |
| `app/static/style.css` | 绘本风样式(背景插画 + 节点三态 + 详情页) + 自托管字体 |
| `app/static/worlds/` | 每章背景插画(`<章节名>.jpg`) |
| `tools/scaffold_levels.py` | 关卡脚手架脚本 |

**接口**:
- `GET /` → 渲染地图页
- `GET /api/library` → 返回带状态标注的章/关树(JSON)
- `GET /video/<chapter>/<level>/<kind>` → `kind` 为 `demo` 查 `demo/`、`performance` 查 `recordings/`;非法 kind / 路径越界 / 文件不存在均 404
- `POST /upload/<chapter>/<level>/<kind>` → 上传视频到对应树(流式写盘,500MB 上限,路径越界守卫)

**前端两层视图**:
- **地图视图**:每章一幅背景插画,关卡节点沿之字形蜿蜒排列,一条粗白实路连接所有关卡。点亮的关用孩子表演视频的画面当封面(点击回放);锁住但有 demo 的关带小播放标记(可点进去预习 demo);当前关发光呼吸。
- **关卡详情视图**:标题、场景、目标句式、demo 视频(0.75 倍速)、完成星 + 录像路径提示、performance 视频、对话全文、变体。底部有上一关/下一关导航。demo 和 performance 区域各有一个低调的上传按钮(给父亲用,Chrome 文件夹记忆)。

---

## 6. 当前状态

| 项 | 进度 |
| --- | --- |
| 网站骨架(地图 + 状态逻辑 + 详情页 + 视频播放) | ✅ 完成 |
| 动态章节世界(大型动画主景 + 平滑路线) | ✅ 完成 |
| 关卡文案 `meta.json` | ✅ 30 / 30(全 10 章 × 3 关) |
| AI 演示视频 `demo.mp4` | ⚠️ 7 / 30(见 `demo/PROGRESS.md`) |
| 孩子表演 `performance.mp4` | 1 / 30(仅 `01-wants-requests/01-can-i-have`,即唯一真正贯通的关) |
| Sora demo 提示词 | ✅ 60 份(每关 a/b 两段) |
| 字体 | ✅ 自托管(Fredoka/Nunito woff2),离线可用 |

**当前瓶颈**:demo 视频备课(7/30);真正「贯通」的只有第一章第一关。地图会随备课进度缓慢生长,需留意「备课节奏跟不上闯关节奏」导致地图断更。

---

## 7. 设计原则(明确排除的事)

- ❌ **教学引擎 / AI 对话搭档**——教学在线下发生。
- ❌ **1/2/3 星分级**——一颗星,二元(分级需要一个尚未定义的评判轴,且与「练到熟练才记录」自相矛盾)。
- ❌ **公网部署**——本地跑。
- ❌ **用星星追踪「句式高级度」**——那是线下目标,不量化显示。
- ❌ **构建工具 / npm 依赖**——原生 ES Modules,无打包。
- ❌ **构建工具 / npm 依赖**——原生 ES Modules,无打包。

---

## 8. 目录结构

```
D:/TaviusProject/
  README.md                      # 产品文档(本文件)
  AGENTS.md                      # 给 AI agent 的操作手册
  run.bat                        # Windows 一键启动
  .gitignore / .gitattributes
  app/                           # Flask 网站(后端 + 前端 + 测试)
  content/                       # 课程文案(文件系统即数据库);入库
  demo/                          # AI 演示视频;本地 only(gitignore *.mp4)
  recordings/                    # 孩子表演录像;本地 only,珍贵
  prompts/                       # 每关的 Sora demo 提示词(两段式);入库
  tools/                         # 脚本(scaffold_levels.py)
  docs/                          # 设计文档(specs / plans / archive / 参考图)
```

每个顶层目录都有各自的 `README.md` 作为索引。详见 [`AGENTS.md`](AGENTS.md) 的完整目录树与开发约定。

> `performance.mp4` 是孩子的影像,出于体积与隐私,**所有 `demo/`、`recordings/` 下的视频均不入库**(见 `.gitignore`),只跟踪 `content/` 的 `meta.json`/`dialogues.md`、`prompts/` 的提示词等文案。克隆后本地没有视频,地图上对应关卡会显示空状态——这是预期的。
