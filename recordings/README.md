# recordings/ — 孩子表演录像

每课的 `performance.mp4` / `performance.webm`（家庭照 demo 排练后录下的**孩子表演**）。**本地 only，不入库**（体积 + 隐私）。

> 这是整个项目的核心奖励：孩子回头看自己的表演。珍贵、不可再生。

## 放文件即点亮

多用户模式下，把视频放进 `recordings/<用户名>/<阶段>/<章>/<课>/`，刷新页面 → 本课点亮并解锁下一课。

例：`recordings/admin/04/01-choosing-requests/01-request-an-item/performance.mp4`

> 阶段、章、课目录名必须与 `../curriculum/` 一致（零填充前缀）。最稳妥的方式是直接用页面录制或上传，让应用自动创建目录。

## ⚠️ 备份

这些录像不可再生，请单独备份本目录。git 不跟踪 `.mp4`（见 `.gitignore`），丢失无法从仓库恢复。
