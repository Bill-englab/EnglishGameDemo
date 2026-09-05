# Video Prompts — 三段式视频生成提示词

新版 Stage 04 已提供 **30 课 × A/B/C 三段 = 90 份**独立提示词。每份都含本段完整台词、固定角色、场景、起始状态、动作与反应、结束状态、语音和时长约束。

**[逐课索引 →](04/README.md)**

## 直接使用

1. 在课程详情页的 **Grown-up Notes** 区展开 **VideoGen · A/B/C prompts**，分别复制 Part A、B、C。也可直接打开 `04/<章>/<课>/a.txt`、`b.txt`、`c.txt`。
2. 各生成一段，默认每段约 10 秒，按 A → B → C 拼成一个 `demo.mp4`。不要把三段提示一次性提交成一个十秒视频。
3. 人物参考图保持一致；如果所用工具支持，后一段使用前一段的末帧作衔接参考。提示词本身不能保证模型的人物、声音和道具连续性。
4. 检查台词、口型、动作、节奏、衔接和安全表达。通过人工分镜/试生成确认后，再将对应课程推进到 `video_ready` 并制作正式 demo。
5. 上传到课程的示范区，或放到 `demo/04/<章>/<课>/demo.mp4`。本次没有生成或修改任何视频。

当前提示词是完整可复制的**制作草稿**；30/30 课仍为 `language_reviewed`，不因补齐文件就自动获得 `video_ready`。历史 14 个 revision 1 / v1 demo 相对当前 revision 2–4 均为 stale；不恢复旧版视频生产。

## 固定角色

每份提示只列当前课出现的两个角色，不把全部家庭成员塞进同一镜头。

| 角色 | 固定视觉设定 |
| --- | --- |
| Child | 4 岁小老虎男孩，橙底黑条纹、黄色 T 恤、幼儿身形；需要代词时用 he/him |
| Dad | 温棕色狗狗、大垂耳、橄榄绿 T 恤 |
| Mom | 粉色猪猪、珊瑚色开衫、奶油色内搭 |
| Teacher | 奶油色兔子、直立耳朵、淡紫色开衫 |
| Peer | 同龄棕色小熊、青绿色 T 恤、儿童声音与身形 |

统一暖光、粉彩、精致家庭向 3D 卡通、16:9；以固定机位中景双人为主。车内等场景以安全、物理合理的构图优先。无旁白、字幕、额外台词或多余角色；剧情需要的物品标签可以保留。

## 节奏与真实性

- `three-by-ten-v2` 每段必须在约 10 秒内自然完成；每段 12–20 个台词词，超出范围拒绝导出。先在课程源缩短或调整对话并重新审查，再导出；生成时不删词、不改写、不加速，也不延长片段。
- 新版的 `production.json` 必须含 `emotion` 对象，三个非空字符串为 `baseline`、`allowed_shift`、`forbidden`。它们进入每段的 `EMOTIONAL PERFORMANCE` 区块；建议基线为 `Calm, warm and regulated baseline.`，仅允许情境需要的轻微变化。模板另固定禁止尖叫、极端兴奋、暴怒、脸或身体变形、疯狂手势与失控奔跑。
- 导出器按“谁穿/被穿上”检查 Child 的服装归属：中性的 `get dressed`、成人穿自己的 dress/skirt 或 Child 只整理成人衣物都允许；把 dress/skirt/blouse/gown 穿到 Child 身上会拒绝导出。
- 2.2 的“两分钟”是上限且孩子提前完成，没有时间跳转；4.2 和 5.2 分别用一次明确省略表示真实如厕返回与完整读完一本书；9.1 三段车内谈话完全连续，五分钟只是估计，片内不经过桥也不抵达。
- 爸爸听到 stop 立即停止；走失求助是妈妈在家陪同的平静演练；车内爸爸始终注意驾驶。保持身体需要、安全边界和真实因果优先。
- 导出器会在选择 v1/v2 行为前拒绝任何未知非空 `dialogue_contract`；只有缺失或空值保留 v1 兼容。它也会拒绝把尖叫、极端兴奋、扭曲、旧时长逃生语或无边界的 `excited`/`shocked`/`angry` 当作正向导演要求。固定 `No ...`、`do not ...`、`never ...` 安全禁令、语义完整的逗号并列禁令以及有明确轻微上限的情绪仍允许；禁止词出现在负面约束里不是失败。

## 后续维护：不产生第二份台词源

```text
curriculum/04/<章>/<课>/lesson.json    唯一台词、角色、设定与版本来源
prompts/04/<章>/<课>/production.json  只写镜头与动作，不复制台词
                       ↓
tools/build_video_prompts.py         生成 / 校验
                       ↓
prompts/04/<章>/<课>/{a,b,c}.txt       详情页直接读取的导出文件
```

修改台词时编辑课程源并递增 `content_revision`；重新审查分镜后，同步 `production.json` 的版本。修改镜头只编辑 `production.json`。不要直接维护三份导出文件中的重复台词。

Stage 1 的 `stage.json` 与 30/30 Lesson 已统一启用 `dialogue_contract: "three-by-ten-v2"`；男孩角色、情绪上限和严格十秒约束覆盖全部 90 份导出。Stage 04 的 `--complete` 现在应通过。提示词校验只统计结构化台词，不把场景或情绪说明计入词数。

```bash
python tools/build_video_prompts.py --stage 04 --check
python tools/build_video_prompts.py --stage 04 --write
python tools/validate_curriculum.py --stage 04 --complete
```

不带 `--write` 时只检查，不写文件。检查涵盖缺段、过期导出、源版本、说话角色、A/B/C 起止状态和危险的正向表演要求；每份提示含源内容摘要，遗漏递增版本的内容修改也会让导出检查失败。检查不等于人工审美、真实时长或生成质量验收。

## 历史资料

根目录原来的 60 份 `D1a/D1b…` 提示词全部保留，只对应旧版 `content/`。旧说明见 [V1-REFERENCE.md](V1-REFERENCE.md)，不要用于新版关卡。
