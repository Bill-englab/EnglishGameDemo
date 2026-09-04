# docs/ — 设计文档

| 路径 | 内容 |
| --- | --- |
| `specs/` | 设计规格（课程体系、chapter-world-map、living-chapter-worlds） |
| `plans/` | 实施计划（对应 specs） |
| `archive/` | 冻结的历史基线（原始诉求、设计提案、首轮计划） |
| `twodots-reference.jpeg` | Two Dots 风格参考图 |

当前主线设计：[`specs/2026-08-12-living-chapter-worlds-design.md`](specs/2026-08-12-living-chapter-worlds-design.md)（动态章节世界）。

下一轮 UI 改造：[`specs/2026-09-04-immersive-ui-redesign.md`](specs/2026-09-04-immersive-ui-redesign.md)（已确认 B 沉浸冒险方向、无独立标题栏、课程目录与 Stage 展示规则；设计文档待书面复核，正式 UI 尚未实施）。

个人资料增补：[`specs/2026-09-04-personal-profile-design.md`](specs/2026-09-04-personal-profile-design.md)（头像＋昵称已实现；图片隐私、用户隔离与交互规范）。实施与验收见 [`plans/2026-09-04-personal-profile-implementation.md`](plans/2026-09-04-personal-profile-implementation.md)。不代表整套 B 界面已经落地。

视频检查记录：[`specs/2026-09-04-video-compression-audit.md`](specs/2026-09-04-video-compression-audit.md)（当前环境与格式处理问题，含验证限制；不代表已经修复）。

新版三段提示词：[`../prompts/04/README.md`](../prompts/04/README.md)（30课 / 90份完整草稿）；生成、版本与分镜检查规则见 [`../prompts/README.md`](../prompts/README.md)，实施记录见 [`plans/2026-09-04-three-part-prompts.md`](plans/2026-09-04-three-part-prompts.md)。不自动推进 `video_ready` 或生成视频。

课程设计主线：[`specs/2026-09-04-curriculum-architecture-design.md`](specs/2026-09-04-curriculum-architecture-design.md)（4–6 岁成长框架、4 岁 30 课大纲、真实性与内容生产标准）。4 岁课程的逐课验收记录见 [`../curriculum/04/FINAL-REVIEW.md`](../curriculum/04/FINAL-REVIEW.md)，应用接入记录见 [`plans/2026-09-04-curriculum-runtime-migration.md`](plans/2026-09-04-curriculum-runtime-migration.md)。后续关卡设计必须遵循课程设计与最终审查文档。
