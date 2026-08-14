# recordings/ — 孩子表演录像

每关的 `performance.mp4`（父子照 demo 排练后录下的**孩子表演**）。**本地 only，不入库**（体积 + 隐私）。

> 这是整个项目的核心奖励：孩子回头看自己的表演。珍贵、不可再生。

## 放文件即点亮

把 `performance.mp4` 放进 `recordings/<章>/<关>/`，刷新页面 → 这关点亮（节点变成这段录像的画面）+ 解锁下一关。

例：`recordings/01-wants-requests/01-can-i-have/performance.mp4`

> 章关目录名与 `../content/` 一致（零填充前缀）。目录不存在就新建。

## ⚠️ 备份

这些录像不可再生，请单独备份本目录。git 不跟踪 `.mp4`（见 `.gitignore`），丢失无法从仓库恢复。
