# My English Adventure — 英语 Role-play 闯关网站

> 一个**本地运行**的小网站,把父子线下英语 role-play 的录像,排成一条「章 → 关」的闯关地图。每过一关,地图上那个点就亮起来,变成**孩子自己录像里的画面**。
>
> 它是孩子的「奖杯陈列柜」,不是老师。

---

## 1. 背景与目的

### 背景

- **服务对象**:一个 4 岁、已具备基础英语交流能力的孩子。
- **教学者**:父亲(英语流利),长期与孩子用英文 role-play,按主题积累了大量对话素材,已整理成 10 个主题目录(`roleplay-dialogues/`)。
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

| 视频 | 来源 | 作用 |
| --- | --- | --- |
| `demo.mp4` | 备课阶段 AI 生成的动画 | 给孩子「看样板」——演示这段对话怎么演 |
| `performance.mp4` | 父子照 demo 排练后,录下孩子的表演 | 给孩子「看自己」——这才是真正的奖励 |

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
4. 父亲把视频拖进这关文件夹。
5. 刷新页面 → 网站检测到文件 → 这关点亮 → 孩子点自己的画面,回看那段表演。

> ⚠️ **录像应是游戏的自然高潮,不是另加的小考。** 4 岁孩子一旦感到被测,会开始躲避。留意他是否开始找借口躲。

### 本地运行

```bash
cd roleplay-website
.venv/Scripts/python app.py
```

浏览器打开 **http://127.0.0.1:5000**。

- 内容根目录默认是 `../roleplay-dialogues`(相对 `app.py`),可用环境变量 `LIBRARY_ROOT` 覆盖(用于测试或挂载别的内容库)。
- 仅本地运行,**不部署公网**。

### 两个阶段

| 阶段 | 谁做 | 做什么 |
| --- | --- | --- |
| **备课** | 父亲独立完成 | 搭网站、写每关文案、用 AI 生成 `demo.mp4` |
| **使用** | 父子一起 | 看 demo、练、录表演、拖文件、关卡点亮 |

> **瀑布式提醒**:不要「备完整套课再上」。先**贯通第一关**(一站 + 一关 + 能录能放能点亮),本周就和孩子试一次,用真实反应验证,再扩展到其余主题。

---

## 4. 内容结构

### 文件夹约定(章 → 关 两层)

```
roleplay-dialogues/
  01-wants-requests/              ← 章(主题)
    01-can-i-have/                ← 关(场景)
      meta.json                   ← 关卡文案(备课写)
      demo.mp4                    ← AI 演示(备课放)
      performance.mp4             ← 孩子表演;此文件存在 = 通关点亮
    02-i-need/
      meta.json
      demo.mp4
  02-refusing-bargaining/         ← 下一章
    ...
```

- 文件夹名必须**零填充前缀**(`01-`、`02-` … `10-`),这样字符串排序就是预期顺序。
- 每关:`meta.json` 必填;`demo.mp4` 备课时放;`performance.mp4` 由父亲手动放入(存在即点亮)。

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

### `demo.mp4` 生成流水线(`video-prompt/`)

为每关提供两段开箱即用的 Sora 提示词(**两段式**,治「一段式说太快」):

- 每个对话拆成 `D{N}a.txt`(前半台词)+ `D{N}b.txt`(后半台词),分别粘进 Sora 各生成一段,自带「慢速 + 句间停顿」指令。
- 两段按 **a → b** 用 ffmpeg 流拷贝拼成 `demo.mp4`:

  ```bash
  printf "file 'a.mp4'\nfile 'b.mp4'\n" > list.txt
  ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
  ```

- **角色设定**(每份提示逐字一致,保证角色稳定):爸爸 = 卡通狗(温棕色、大垂耳、橄榄绿 T 恤);孩子 = 卡通小老虎(4 岁、橙底黑条纹、黄 T 恤)。风格统一 Pixar 式 3D 卡通 / 暖光 / 粉彩 / 萌系家庭向。

详见 [`video-prompt/README.md`](video-prompt/README.md)。

---

## 5. 技术架构

**单文件 Python/Flask 后端,文件系统即数据库**:无数据库、无上传接口。「上传」= 父亲手动把 `performance.mp4` 拖进对应文件夹。前端是原生 HTML/CSS/JS,无构建步骤。

| 文件 | 职责 |
| --- | --- |
| `roleplay-website/app.py` | Flask 路由:`/` 地图页、`/api/library` 数据、`/video/<chapter>/<level>/<kind>` 视频流 |
| `roleplay-website/scanner.py` | 纯逻辑:扫目录树 + 算关卡状态(locked/unlocked/completed/current) |
| `roleplay-website/templates/map.html` | 地图页外壳(地图视图 + 关卡详情视图) |
| `roleplay-website/static/app.js` | 拉取数据、渲染地图与详情、播放视频 |
| `roleplay-website/static/style.css` | 童趣大节点样式(绘本风地图) |
| `scaffold_levels.py` | 关卡脚手架脚本 |

**接口**:
- `GET /` → 渲染地图页
- `GET /api/library` → 返回带状态标注的章/关树(JSON)
- `GET /video/<chapter>/<level>/<kind>` → 返回对应 `demo.mp4` / `performance.mp4`(kind 只允许 `demo`、`performance`,否则 404)

**前端两层视图**:地图视图(点亮的关用孩子表演视频的画面当封面,点击回放)与关卡详情视图(标题、场景、目标句式、demo 视频、对话全文、变体)。demo 默认 0.75 倍速播放,更慢更清楚。

---

## 6. 当前状态

| 项 | 进度 |
| --- | --- |
| 网站骨架(地图 + 状态逻辑 + 详情页 + 视频播放) | ✅ 完成 |
| 关卡文案 `meta.json` | ✅ 30 / 30(全 10 章 × 3 关) |
| AI 演示视频 `demo.mp4` | ⚠️ 4 / 30(仅第一章及少量) |
| 孩子表演 `performance.mp4` | 1 / 30(仅 `01-wants-requests/01-can-i-have`,即唯一真正贯通的关) |
| Sora demo 提示词 | ✅ 60 份(每关 a/b 两段) |

**当前瓶颈**:demo 视频备课(4/30);真正「贯通」的只有第一章第一关。地图会随备课进度缓慢生长,需留意「备课节奏跟不上闯关节奏」导致地图断更。

---

## 7. 设计原则(明确排除的事)

- ❌ **教学引擎 / AI 对话搭档**——教学在线下发生。
- ❌ **上传页 / 后端上传接口**——手动放文件,保持极简。
- ❌ **1/2/3 星分级**——一颗星,二元(分级需要一个尚未定义的评判轴,且与「练到熟练才记录」自相矛盾)。
- ❌ **公网部署**——本地跑。
- ❌ **用星星追踪「句式高级度」**——那是线下目标,不量化显示。

---

## 8. 目录结构

```
D:/TaviusProject/
  roleplay-dialogues/        # 内容库(文件系统即数据库);视频被 gitignore
  video-prompt/              # 每关的 Sora demo 提示词(两段式)
  roleplay-website/          # Flask 网站(后端 + 前端 + 测试)
  scaffold_levels.py         # 关卡脚手架
  TwoDots参考.jpeg            # Two Dots 风格参考图
  .vibe/                     # 设计备忘与实现计划(冻结的设计基线)
    memos/memo-original-request.md
    design-proposal.md
    plan/first_round_plan.md
```

> `performance.mp4` 是孩子的影像,出于体积与隐私,**所有 roleplay-dialogues 下的视频均不入库**(见 `.gitignore`),只跟踪 `meta.json` 等文案。
