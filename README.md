# My English Adventure

<p>
  <strong>英语 Role-play 闯关地图</strong>
  &nbsp;·&nbsp;
  <a href="https://github.com/Bill-englab/EnglishGameDemo/releases/tag/v0.1.0"><img alt="version" src="https://img.shields.io/badge/version-v0.1.0-blue"></a>
  &nbsp;
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green">
  &nbsp;
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey">
  &nbsp;
  <img alt="status" src="https://img.shields.io/badge/status-WIP%20(7%2F30%20demo)-orange">
</p>

---

## 这是什么

一个给 **4 岁孩子**用的英语闯关地图网站。

孩子和爸爸一起做英语 role-play，练熟一段对话后录下表演。把录像放进网站，地图上对应的关卡就亮起来——亮的不是星星，是**孩子自己录像里的画面**。孩子可以反复点开回看自己的表演。

> 真正的奖励不是星星，是回头看自己的表演。

### 为什么这样做

- 孩子能交流，但句式偏基础。想通过反复 role-play 练习来丰富句式。
- 4 岁孩子对抽象的星星没感觉，认的是**自己的画面**。
- 网站不教英语——教学在线下发生。网站只做两件事：**把进度变成游戏般的地图**，**让孩子反复回看自己的表演**。

---

## 怎么用

整个流程是一个父子一起的循环，每关重复一次：

```
  ┌─────────────────────────────────────────────────────┐
  │                                                     │
  │   ①  孩子点开当前关                                  │
  │       播放 demo 动画，看这段对话怎么演                 │
  │              │                                      │
  │              ▼                                      │
  │   ②  父子一起线下 role-play                          │
  │       照着 demo 反复练                               │
  │              │                                      │
  │              ▼                                      │
  │   ③  录下孩子的表演                                  │
  │       存成 performance.mp4                           │
  │              │                                      │
  │              ▼                                      │
  │   ④  在详情页点「Add performance」上传               │
  │       （或手动拖进 recordings/ 文件夹）               │
  │              │                                      │
  │              ▼                                      │
  │   ⑤  页面自动刷新，关卡点亮 ✨                        │
  │       圆点变成孩子录像的画面                          │
  │       下一关解锁                                     │
  │              │                                      │
  │              ▼                                      │
  │   ⑥  孩子点自己的画面，回看表演                       │
  │       想看多少次都行                                 │
  │              │                                      │
  │              ▼                                      │
  │      回到 ①，进入下一关                               │
  │                                                     │
  └─────────────────────────────────────────────────────┘
```

### 启动网站

**Windows**：双击 `run.bat`，自动打开浏览器。

**命令行**（所有系统）：

```bash
cd app
.venv/Scripts/python app.py      # Windows
# macOS/Linux:  .venv/bin/python app.py
```

然后打开 http://127.0.0.1:5000 。

> 网站只在本地运行，不需要联网（字体已内置）。上传的视频直接存在你电脑上，不传到任何服务器。

---

## 地图长什么样

- **10 章 × 3 关 = 30 关**，从下往上排成一条蜿蜒的路。
- 每章一幅背景插画（Pixar 风绘本），滚动时背景交叉淡入淡出。
- 关卡三种状态：

  | 状态 | 长什么样 | 含义 |
  | --- | --- | --- |
  | 🔒 锁住 | 灰色锁图标 | 上一关还没完成，但如果有 demo 可以点进去预习 |
  | ▶️ 当前 | 白色发光按钮 | 该练这关了 |
  | 🌟 已完成 | 孩子录像的画面 + 金星 | 通关了，随时可以回看 |

---

## 课程内容

30 关覆盖 10 个英语语言主题，按难度递进：

| 章 | 主题 | 学什么 |
| --- | --- | --- |
| 1 | wants-requests | Can I have ___? / I want ___ |
| 2 | refusing-bargaining | I don't want to ___ / What if ___ |
| 3 | asking-help | Can you help me ___? / It's stuck |
| 4 | where-locating | Where's ___? / Is ___ in/on ___? |
| 5 | why-how-come | Why do I ___? / How come ___? |
| 6 | feelings-preferences | I'm ___ / I don't like ___ |
| 7 | reasoning | because ___ / That's why ___ |
| 8 | recounting-day | I went ___ / and then ___ |
| 9 | reporting-others | He said ___ / She told me ___ |
| 10 | planning-predicting | We're going to ___ / First ___, then ___ |

每关都有一段完整对话（Dad + Child 轮流说）、目标句式、换样重演提示。demo 动画由 AI（Sora）生成，角色固定：爸爸 = 卡通狗，孩子 = 卡通小老虎。

---

## 当前进度

| 项 | 进度 |
| --- | --- |
| 课程文案 | 30/30 ✅ |
| 背景插画 | 8/10 |
| demo 动画 | 7/30 |
| Sora 提示词 | 60/60 ✅ |

详细进度见 [`demo/PROGRESS.md`](demo/PROGRESS.md)。

---

## 给开发者

如果你要改代码或贡献内容，详见 [`AGENTS.md`](AGENTS.md)（完整的开发约定、目录结构、测试方法）。

技术栈：Flask + 原生 ES Modules，无构建步骤，无数据库。Python 和 JS 测试各一套。

---

## License

[MIT](LICENSE)
