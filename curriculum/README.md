# 课程创作源（新版）

> 当前30课仍按 `three-by-ten-v2` 运行。下一轮内容重写必须先遵循[连续对话内容与三段视频生产规范](../docs/specs/2026-09-06-continuous-dialogue-content-design.md)：Lesson 保存一段完整自然对话，三个约10秒 clip 只在 production 中切分。本文下方的 A/B/C 配额仅描述当前实现，不再是未来创作目标。

`curriculum/` 是分年龄、可审查、可持续演进的新版课程唯一创作源。当前首先建设 `04/`：目标是让已有较好英文理解力的 4 岁非母语孩子，从“听懂并作出反应”逐步走到“能用合适句式参与日常对话”。

目录层级固定为：

```text
curriculum/<stage>/stage.json
curriculum/<stage>/<chapter>/chapter.json
curriculum/<stage>/<chapter>/<lesson>/lesson.json
```

每课含一个主要 Conversation Move、三段约 10 秒的完整对话、两个可迁移的 Replay Card。Stage 1（目录仍为年龄 Stage `04`）已在 `stage.json` 和 30/30 Lesson 统一设置 `dialogue_contract: "three-by-ten-v2"`：每段 3–4 轮、12–20 个英文词；全课 9–11 轮、45–58 词，其中孩子 4–5 轮、18–28 词。词数仅统计 `parts[].turns[].line` 的结构化台词（按空白分词），不包含镜头说明。每段仍必须有孩子发言，且仅使用声明的两名角色。

新版达到 `language_reviewed`、`video_ready` 或 `video_produced` 时，原八项真实性审查之外还必须通过 `character_continuity` 和 `emotion_stability`，共十项。未知的非空 `dialogue_contract` 会被拒绝。既有语言与逻辑原则见[课程架构设计](../docs/specs/2026-09-04-curriculum-architecture-design.md)。

网站已直接读取这里的 canonical Lesson。`content/` 和根级旧 prompts 只作 v1 历史参考，不要手工同步。新版媒体使用 Stage 路径：`demo/04/<章>/<课>/`、`recordings/<用户名>/04/<章>/<课>/`、`prompts/04/<章>/<课>/{a,b,c}.txt`。

增量创作允许章节不完整；正式制作视频前必须执行 `python tools/validate_curriculum.py --stage 04 --complete`，并把对应 Lesson 明确推进到 `video_ready`。2026-09-05 完整复核结果为 10 章、30 课、家庭角色 23/30（76.7%）、0 validation issue；这只批准 runtime 内容，不批准视频制作。

迁移期间曾使用 `python tools/validate_curriculum.py --stage 04` 逐章检查；现在 30 课已经全部迁移，`--complete` 应当通过。内容修改仍必须同步递增 Lesson 与对应 `production.json` 的 `content_revision`、重新完成十项结构化审查与十一问人工复核，再由工具重建提示词。当前版本分布为 revision 2 共 23 课、revision 3 共 4 课、revision 4 共 3 课；所有课程仍为 `language_reviewed`。

新版 [90 份三段提示词草稿](../prompts/04/README.md) 已齐并与 canonical revision/hash 同步；`production.json` 仅记录视觉分镜，台词由 `tools/build_video_prompts.py` 从这里直接导出。准备提示词不改变课程状态，正式视频仍需逐课验收。逐课和聚合数据、十一问结果与 production 末态见 [Stage 1 完整复核](04/FINAL-REVIEW.md)。
