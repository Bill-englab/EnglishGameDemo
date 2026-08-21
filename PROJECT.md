# My English Adventure — 项目说明文档

## 这是什么

一个给 4 岁孩子用的英语闯关地图网站。孩子和爸爸一起做英语 role-play，练熟一段对话后录下表演。把录像放进网站，地图上对应的关卡就亮起来。孩子可以反复点开回看自己的表演。

网站只在本地运行，不需要联网，不部署到公网。

## 为什么这样做

孩子能交流，但句式偏基础。传统的闪卡、App、小测验对 4 岁孩子不奏效——真正能坚持的是**表演**。

这个项目的核心认知：

- **网站不教英语。** 教学在线下发生——爸爸和孩子面对面 role-play。网站不评分、不纠正。
- **没有星级评分。** 一关要么完成、要么没完成——有录像就是完成，没有就是没完成。
- **真正的奖励是回看自己的表演。** 点亮的关卡显示 demo 动画的画面，点击进入详情页看表演录像。这才是孩子反复回来点开看的动力。

## 怎么运行

**Windows**：双击 `run.bat`，自动打开浏览器。

**命令行**（所有系统）：

```bash
cd app
.venv/Scripts/python app.py      # Windows
# macOS/Linux:  .venv/bin/python app.py
```

打开 http://127.0.0.1:5000。

视频存在你自己的电脑上，不传到任何服务器。字体已内置，断网也能用。

## 关键特性

### 闯关地图

- **10 章 × 3 关 = 30 关**，从下往上排成一条蜿蜒的路。
- 每章一幅背景插画（Pixar 风绘本），滚动时背景交叉淡入淡出。
- 关卡三种状态：锁住（🔒）、当前要练的（▶️）、已完成（🌟）。
- 锁住的关如果有 demo，可以点进去预习。

### 每关两个视频

- **Watch & Learn**：AI 生成的 demo 动画（0.75 倍速，更慢更清楚），给孩子看这段对话怎么演。
- **Your Turn**：孩子的表演录像。没上传时显示 `+` 空白封面，点击直接选文件上传。
- 上传后页面自动刷新，关卡点亮，下一关解锁。

### 详情页

- 两个视频并排占顶部，等大显示。
- 下方是完整对话（Dad + Child 聊天气泡）和变体提示。
- 底部有 Prev / Next 按钮，不用回地图就能切换关卡。
- 右下角 VideoGen 面板显示生成 demo 用的 Sora 提示词（Part A / Part B），各带一个 Copy 按钮。

### 课程内容

30 关覆盖 10 个英语语言主题，按难度递进：

| 章 | 主题 | 学什么 |
| --- | --- | --- |
| 1 | wants-requests | Can I have ___? / I want ___ |
| 2 | refusing-bargaining | I don't want to ___ / What if ___? |
| 3 | asking-help | Can you help me ___? / It's stuck |
| 4 | where-locating | Where's ___? / Is ___ in/on ___? |
| 5 | why-how-come | Why do I ___? / How come ___? |
| 6 | feelings-preferences | I'm ___ / I don't like ___ |
| 7 | reasoning | because ___ / That's why ___ |
| 8 | recounting-day | I went ___ / and then ___ |
| 9 | reporting-others | He said ___ / She told me ___ |
| 10 | planning-predicting | We're going to ___ / First ___, then ___ |

每关包含完整对话、目标句式、换样重演提示。demo 动画由 AI（Sora）生成，角色固定：爸爸 = 卡通狗，孩子 = 卡通小老虎。

### 视频上传

- 在详情页点视频区域的 `+` 或 Replace 按钮，直接弹出文件选择器选 mp4。
- 文件自动存到对应目录，页面自动刷新。
- Chrome 下会记住上次打开的文件夹，下次默认停在那。
- 也可以手动把文件拖进 `demo/` 或 `recordings/` 文件夹再刷新，效果一样。

## 当前进度

| 项 | 进度 |
| --- | --- |
| 课程文案 | 30/30 ✅ |
| 背景插画 | 8/10 |
| demo 动画 | 7/30 |
| Sora 提示词 | 60/60 ✅ |

## License

MIT
