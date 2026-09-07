# docs/ — 设计文档

产品介绍与截图见 [English README](../README.md) / [中文 README](../README.zh-CN.md)，开发资料见 [DEVELOPMENT.md](../DEVELOPMENT.md)。

| 路径 | 内容 |
| --- | --- |
| `specs/` | 设计规格（课程体系、chapter-world-map、living-chapter-worlds） |
| `plans/` | 实施计划（对应 specs） |
| `archive/` | 冻结的历史基线（原始诉求、设计提案、首轮计划） |
| `twodots-reference.jpeg` | Two Dots 风格参考图 |
| [screenshots/](screenshots/README.md) | README 产品截图与演示素材说明 / Product screenshots and sample-media notes |

历史地图设计：[`specs/2026-08-12-living-chapter-worlds-design.md`](specs/2026-08-12-living-chapter-worlds-design.md)（动态章节世界；视觉已由现代玩具剧场规格接替）。

UI 改造主线：[`specs/2026-09-05-modern-toy-theatre-ui-design.md`](specs/2026-09-05-modern-toy-theatre-ui-design.md)（用户批准的 B「现代玩具剧场」统一视觉：地图、目录、详情、手机与 10 章双比例 3D 场景）。它继承并收敛早期的 [`specs/2026-09-04-immersive-ui-redesign.md`](specs/2026-09-04-immersive-ui-redesign.md)。实施、隔离验收与视觉差异记录见 [`plans/2026-09-05-modern-toy-theatre-ui-implementation.md`](plans/2026-09-05-modern-toy-theatre-ui-implementation.md)。录制倒计时与播放速度仍为后续独立行为任务。

本轮界面修正：[`specs/2026-09-05-adventure-feedback-ui-correction.md`](specs/2026-09-05-adventure-feedback-ui-correction.md)（顶部统一轨道、二元金星成就反馈与响应式验收标准）。
对应实施计划：[`plans/2026-09-05-adventure-feedback-ui-correction.md`](plans/2026-09-05-adventure-feedback-ui-correction.md)。
当前验收结果、回归命令与验证限制：[`plans/2026-09-05-adventure-feedback-ui-acceptance.md`](plans/2026-09-05-adventure-feedback-ui-acceptance.md)。

个人资料增补：[`specs/2026-09-04-personal-profile-design.md`](specs/2026-09-04-personal-profile-design.md)（头像＋昵称已实现；图片隐私、用户隔离与交互规范）。实施与验收见 [`plans/2026-09-04-personal-profile-implementation.md`](plans/2026-09-04-personal-profile-implementation.md)。本轮仅统一视觉 token。

视频检查记录：[`specs/2026-09-04-video-compression-audit.md`](specs/2026-09-04-video-compression-audit.md)（当前环境与格式处理问题，含验证限制；不代表已经修复）。

新版三段提示词：[`../prompts/04/README.md`](../prompts/04/README.md)（30课 / 90份完整草稿）；生成、版本与分镜检查规则见 [`../prompts/README.md`](../prompts/README.md)。[`plans/2026-09-04-three-part-prompts.md`](plans/2026-09-04-three-part-prompts.md) 仅保留最初 renderer/路由的历史实施记录，其时长与内容规则已由下方 Stage 1 重审方案取代。不自动推进 `video_ready` 或生成视频。

课程设计主线：[`specs/2026-09-04-curriculum-architecture-design.md`](specs/2026-09-04-curriculum-architecture-design.md)（4–6 岁成长框架、4 岁 30 课大纲、真实性与内容生产标准）。4 岁课程的逐课验收记录见 [`../curriculum/04/FINAL-REVIEW.md`](../curriculum/04/FINAL-REVIEW.md)，应用接入记录见 [`plans/2026-09-04-curriculum-runtime-migration.md`](plans/2026-09-04-curriculum-runtime-migration.md)。后续关卡设计必须遵循课程设计与最终审查文档。

连续对话规范：[`specs/2026-09-06-continuous-dialogue-content-design.md`](specs/2026-09-06-continuous-dialogue-content-design.md)（依据孩子无提示自然对话重新校准难度；canonical 台词是一段完整对话，三个约10秒视频只属于生产切分）。配套的写作执行手册：[`specs/2026-09-06-dialogue-authoring-style.md`](specs/2026-09-06-dialogue-authoring-style.md)（五条硬规则、成人短钩子、三阶段句式指纹与推导公式）。2026-09-06 起全部 30 课已按此迁移到 `continuous-dialogue-v1`。

Stage 1 旧 contract 实施记录：[`specs/2026-09-05-stage-1-dialogue-expansion.md`](specs/2026-09-05-stage-1-dialogue-expansion.md)（当前30课 `three-by-ten-v2` 与90份提示词的历史设计和验收依据；其固定分段内容规则已被上述连续对话规范取代，保留用于理解现状）。
对应实施计划：[`plans/2026-09-05-stage-1-dialogue-expansion.md`](plans/2026-09-05-stage-1-dialogue-expansion.md)。

当前地图实现：[`superpowers/plans/2026-09-07-stone-map-rollout.md`](superpowers/plans/2026-09-07-stone-map-rollout.md)（矩形缩略图石台、单星章、全30关左右交替踏石、分章背景同步滚动与紧凑顶部）。对应隔离预览及验收入口见 `app/README.md`。

后续细化：[`superpowers/plans/2026-09-07-stone-map-detail-pass.md`](superpowers/plans/2026-09-07-stone-map-detail-pass.md)（清晰密集背景、石头阴影、VideoGen入口与提示词恢复）。
