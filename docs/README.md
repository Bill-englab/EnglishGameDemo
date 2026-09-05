# docs/ — 设计文档

| 路径 | 内容 |
| --- | --- |
| `specs/` | 设计规格（课程体系、chapter-world-map、living-chapter-worlds） |
| `plans/` | 实施计划（对应 specs） |
| `archive/` | 冻结的历史基线（原始诉求、设计提案、首轮计划） |
| `twodots-reference.jpeg` | Two Dots 风格参考图 |

历史地图设计：[`specs/2026-08-12-living-chapter-worlds-design.md`](specs/2026-08-12-living-chapter-worlds-design.md)（动态章节世界；视觉已由现代玩具剧场规格接替）。

UI 改造主线：[`specs/2026-09-05-modern-toy-theatre-ui-design.md`](specs/2026-09-05-modern-toy-theatre-ui-design.md)（用户批准的 B「现代玩具剧场」统一视觉：地图、目录、详情、手机与 10 章双比例 3D 场景）。它继承并收敛早期的 [`specs/2026-09-04-immersive-ui-redesign.md`](specs/2026-09-04-immersive-ui-redesign.md)。实施、隔离验收与视觉差异记录见 [`plans/2026-09-05-modern-toy-theatre-ui-implementation.md`](plans/2026-09-05-modern-toy-theatre-ui-implementation.md)。录制倒计时与播放速度仍为后续独立行为任务。

本轮界面修正：[`specs/2026-09-05-adventure-feedback-ui-correction.md`](specs/2026-09-05-adventure-feedback-ui-correction.md)（顶部统一轨道、二元金星成就反馈与响应式验收标准）。
对应实施计划：[`plans/2026-09-05-adventure-feedback-ui-correction.md`](plans/2026-09-05-adventure-feedback-ui-correction.md)。
当前验收结果、回归命令与验证限制：[`plans/2026-09-05-adventure-feedback-ui-acceptance.md`](plans/2026-09-05-adventure-feedback-ui-acceptance.md)。

个人资料增补：[`specs/2026-09-04-personal-profile-design.md`](specs/2026-09-04-personal-profile-design.md)（头像＋昵称已实现；图片隐私、用户隔离与交互规范）。实施与验收见 [`plans/2026-09-04-personal-profile-implementation.md`](plans/2026-09-04-personal-profile-implementation.md)。本轮仅统一视觉 token。

视频检查记录：[`specs/2026-09-04-video-compression-audit.md`](specs/2026-09-04-video-compression-audit.md)（当前环境与格式处理问题，含验证限制；不代表已经修复）。

新版三段提示词：[`../prompts/04/README.md`](../prompts/04/README.md)（30课 / 90份完整草稿）；生成、版本与分镜检查规则见 [`../prompts/README.md`](../prompts/README.md)。[`plans/2026-09-04-three-part-prompts.md`](plans/2026-09-04-three-part-prompts.md) 仅保留最初 renderer/路由的历史实施记录，其时长与内容规则已由下方 Stage 1 重审方案取代。不自动推进 `video_ready` 或生成视频。

课程设计主线：[`specs/2026-09-04-curriculum-architecture-design.md`](specs/2026-09-04-curriculum-architecture-design.md)（4–6 岁成长框架、4 岁 30 课大纲、真实性与内容生产标准）。4 岁课程的逐课验收记录见 [`../curriculum/04/FINAL-REVIEW.md`](../curriculum/04/FINAL-REVIEW.md)，应用接入记录见 [`plans/2026-09-04-curriculum-runtime-migration.md`](plans/2026-09-04-curriculum-runtime-migration.md)。后续关卡设计必须遵循课程设计与最终审查文档。

Stage 1 对话重审：[`specs/2026-09-05-stage-1-dialogue-expansion.md`](specs/2026-09-05-stage-1-dialogue-expansion.md)（全 30 课按三段严格 10 秒、9–11 轮真实对话重新审查；固定四岁男孩角色与服装/道具连续性）。
对应实施计划：[`plans/2026-09-05-stage-1-dialogue-expansion.md`](plans/2026-09-05-stage-1-dialogue-expansion.md)。
