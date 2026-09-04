# demo/ — AI 演示视频

> **当前状态：** 根目录下现有章文件夹对应 v1 台词，只作历史保留。新版 `curriculum/04` 已上线；新版视频按 Stage 放在 `demo/04/<章>/<课>/`。在 Lesson 逐课达到 `video_ready` 前继续暂停生产，避免提前固化仍可能微调的镜头。

每关的 `demo.mp4`（AI 生成的动画演示，给孩子「看样板」）。**本地 only，不入库**（体积 + 可再生）。

## 怎么做

1. 准备 `../prompts/04/<章>/<课>/a.txt`、`b.txt`、`c.txt`，分别生成约 10 秒的一段。
2. ffmpeg 流拷贝拼接成 `demo.mp4`：

   ```bash
   printf "file 'a.mp4'\nfile 'b.mp4'\n" > list.txt
   ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
   ```

3. 放进 `demo/04/<章>/<课>/demo.mp4`。

详见 `../prompts/README.md`（角色设定、节奏说明）。

2026-09-04：新版 [30 课 / 90 份提示词](../prompts/04/README.md) 已补齐，可逐段复制试用。补齐的是制作草稿，不是视频；课程状态仍为 `language_reviewed`，实际试读与生成画面的审查仍需逐课完成。

## 进度

见 [`./PROGRESS.md`](./PROGRESS.md)。表内 14/30 是 v1 历史制作记录，不代表新版 Stage 4 视频完成度。
