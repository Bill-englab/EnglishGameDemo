# demo/ — AI 演示视频

每关的 `demo.mp4`（AI 生成的动画演示，给孩子「看样板」）。**本地 only，不入库**（体积 + 可再生）。

## 怎么做

1. 拿 `../prompts/<章>/D{N}a.txt` + `D{N}b.txt`，各粘进 Sora 生成两段。
2. ffmpeg 流拷贝拼接成 `demo.mp4`：

   ```bash
   printf "file 'a.mp4'\nfile 'b.mp4'\n" > list.txt
   ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
   ```

3. 放进 `demo/<章>/<关>/demo.mp4`。

详见 `../prompts/README.md`（角色设定、节奏说明）。

## 进度

见 [`./PROGRESS.md`](./PROGRESS.md)（demo 7/30）。
