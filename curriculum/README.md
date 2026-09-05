# 课程创作源（新版）

`curriculum/` 是分年龄、可审查、可持续演进的新版课程唯一创作源。当前首先建设 `04/`：目标是让已有较好英文理解力的 4 岁非母语孩子，从“听懂并作出反应”逐步走到“能用合适句式参与日常对话”。

目录层级固定为：

```text
curriculum/<stage>/stage.json
curriculum/<stage>/<chapter>/chapter.json
curriculum/<stage>/<chapter>/<lesson>/lesson.json
```

每课含一个主要 Conversation Move、三段约 10 秒的完整对话、两个可迁移的 Replay Card。新版逐课设置 `dialogue_contract: "three-by-ten-v2"`：每段 3–4 轮、12–20 个英文词；全课 9–11 轮、45–58 词，其中孩子 4–5 轮、18–28 词。词数仅统计 `parts[].turns[].line` 的结构化台词（按空白分词），不包含镜头说明。每段仍必须有孩子发言，且仅使用声明的两名角色。

新版达到 `language_reviewed`、`video_ready` 或 `video_produced` 时，原八项真实性审查之外还必须通过 `character_continuity` 和 `emotion_stability`，共十项。未知的非空 `dialogue_contract` 会被拒绝。既有语言与逻辑原则见[课程架构设计](../docs/specs/2026-09-04-curriculum-architecture-design.md)。

网站已直接读取这里的 canonical Lesson。`content/` 和根级旧 prompts 只作 v1 历史参考，不要手工同步。新版媒体使用 Stage 路径：`demo/04/<章>/<课>/`、`recordings/<用户名>/04/<章>/<课>/`、`prompts/04/<章>/<课>/{a,b,c}.txt`。

增量创作允许章节不完整；正式制作视频前必须执行 `python tools/validate_curriculum.py --stage 04 --complete`，并把对应 Lesson 明确推进到 `video_ready`。

迁移期使用 `python tools/validate_curriculum.py --stage 04` 逐章检查：未设置新 contract 的旧课仍按 35–65 词、孩子 18–28 词及旧审查门校验。`--complete` 要求 Stage 04 每一课都携带 `three-by-ten-v2`，因此在 30 课全部迁移前会有意失败。迁移一课时同时更新版本、十项审查与对应 `production.json` 的情绪字段，再重新导出该课提示词。旧课的提示词模板保留至该课迁移，避免中途让其他章节导出失效。

新版 [90 份三段提示词草稿](../prompts/04/README.md) 已齐；`production.json` 仅记录视觉分镜，台词由 `tools/build_video_prompts.py` 从这里直接导出。准备提示词不改变课程状态，正式视频仍需逐课验收。
