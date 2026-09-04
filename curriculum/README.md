# 课程创作源（新版）

`curriculum/` 是分年龄、可审查、可持续演进的新版课程唯一创作源。当前首先建设 `04/`：目标是让已有较好英文理解力的 4 岁非母语孩子，从“听懂并作出反应”逐步走到“能用合适句式参与日常对话”。

目录层级固定为：

```text
curriculum/<stage>/stage.json
curriculum/<stage>/<chapter>/chapter.json
curriculum/<stage>/<chapter>/<lesson>/lesson.json
```

每课含一个主要 Conversation Move、三段约 10 秒的完整对话、两个可迁移的 Replay Card，以及八项真实性审查。4 岁阶段每课完整对话控制在 35–65 个英文词，其中孩子承担 18–28 词。详细原则见[课程架构设计](../docs/specs/2026-09-04-curriculum-architecture-design.md)。

网站已直接读取这里的 canonical Lesson。`content/` 和根级旧 prompts 只作 v1 历史参考，不要手工同步。新版媒体使用 Stage 路径：`demo/04/<章>/<课>/`、`recordings/<用户名>/04/<章>/<课>/`、`prompts/04/<章>/<课>/{a,b,c}.txt`。

增量创作允许章节不完整；正式制作视频前必须执行 `python tools/validate_curriculum.py --stage 04 --complete`，并把对应 Lesson 明确推进到 `video_ready`。
