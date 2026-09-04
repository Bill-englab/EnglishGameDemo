# 课程创作源（新版）

`curriculum/` 是分年龄、可审查、可持续演进的新版课程唯一创作源。当前首先建设 `04/`：目标是让已有较好英文理解力的 4 岁非母语孩子，从“听懂并作出反应”逐步走到“能用合适句式参与日常对话”。

目录层级固定为：

```text
curriculum/<stage>/stage.json
curriculum/<stage>/<chapter>/chapter.json
curriculum/<stage>/<chapter>/<lesson>/lesson.json
```

每课含一个主要 Conversation Move、三段约 10 秒的完整对话、两个可迁移的 Replay Card，以及八项真实性审查。4 岁阶段每课完整对话控制在 35–65 个英文词，其中孩子承担 18–28 词。详细原则见[课程架构设计](../docs/specs/2026-09-04-curriculum-architecture-design.md)。

迁移完成前，网站仍读取 `content/` 和 `prompts/` 中的 v1 内容。不要手工让两套内容互相覆盖，也暂时不要据新版课程生产 demo；新版通过 Phase A 审查后再接入运行时。

校验命令将在 `tools/validate_curriculum.py` 提供。增量创作允许章节不完整，正式制作视频前必须执行完整校验。
