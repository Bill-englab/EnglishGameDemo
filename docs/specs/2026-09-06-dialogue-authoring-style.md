# 连续对话内容生成风格规范

> 日期：2026-09-06
> 状态：内容生成风格手册，逐课作者使用
> 范围：Stage 1（当前约 4 岁）每节课的台词该怎么写
> 前置：总架构见 [`2026-09-06-continuous-dialogue-content-design.md`](2026-09-06-continuous-dialogue-content-design.md)。本文件是它的「怎么写台词」执行手册。

---

## 1. 目的

每节课交付一段真实、可表演、连续的家庭生活对话。它要让孩子从「说对一个句子」走到「遇到新信息后，自己继续把对话推进下去」，同时每一课的关键句式必须真实出现在对话里——删掉 core/stretch/repair 三个数据字段，不等于删掉教学目标。

---

## 2. 基准样例（风格标尺）

所有课以这段为风格基准（10.2 讲今天两件事）：

> **Dog Dad:** How was school today?
> **Tiger Child:** It was good. First we painted a big sun, and then we played outside.
> **Dog Dad:** What did you paint the sun with?
> **Tiger Child:** I used yellow and orange, so it looked really bright.
> **Dog Dad:** Nice. What happened outside?
> **Tiger Child:** We looked for bugs. I found a small one under a leaf.
> **Dog Dad:** A bug hunter! Tell me again at dinner.

它是基准的原因：每句话都承载具体内容（画了太阳、用了黄加橙、找到叶子下的虫子），没有一句靠「这个、这边、这里」撑着；开头问的事结尾有落点（晚饭再讲一遍）；爸爸只做短钩子，孩子承担全部实质内容。写完任何一课，先和这段比一比。

---

## 3. 五条硬规则（每课必须全过）

1. **内容自明。** 每句话承载具体信息——颜色、名字、事件、特征。禁止用 this / that / here / there 指示词撑对话。离开画面、只听录音，对话也要能听懂。
2. **逻辑闭环。** 开头提出的事，结尾必须有落点：解决了、归还了、行动起来了、或留一个自然的下一步。不用「谢谢—再见」糊弄收尾。
3. **关键句式必含。** 每课 conversation_move 对应的关键句式（见架构设计 §10 大纲表，如 `Can I have ___, please?`、`First ___, then ___.`、`It's mine. It has ___.`）必须由孩子**在真实动机下**自然说出至少一次。孩子不逐字背，但作者必须保证句式有落点。
4. **家庭自然场景。** 对话发生在自然的家庭/学校日常里，不堆道具、不为句式编造奇怪场景；话题可以把外部事件带进家（学校做了什么、公园找到什么）来增加内容密度。每课最多一组影响剧情的道具。
5. **孩子重、成人轻。** 大人单句短（约 10 词以内），每个话轮只干一件事；孩子承担实质内容，总词数不低于大人（或接近持平）。

---

## 4. 成人语言：短钩子（固定第 2 档）

成人是自然对话伙伴，不是句型卡片。三档档位：第 1 档点菜机（`Apple or banana?`）禁用；**第 2 档（标准）**自然、完整、给真实信息但不啰嗦；第 3 档一大串抢戏（`Sweetheart, you look absolutely starving...`）禁用。

大人的三种钩子，每课按位置各出现一次：

- **开场**：宣告事件或条件（`Dinner's ready.` / `Time to go, sweetheart.` / `How was school today?`）
- **中间**：前段和后段用**真追问**（`What's your plan?` / `Where did you have it last?` / `What happened outside?`）；中段用**条件句**顶替追问（`as long as you brush again afterward` / `One more race, then it's your turn.`）
- **结尾**：一句短确认加行动，不抢戏（`Great. Let's start.` / `Deal. I'll wait by the door.`）

不出选择题、不说 `Say...` 逼复述、孩子给出安全或身体信号时必须及时回应。

---

## 5. 三个阶段：句式指纹与孩子骨架

难度不靠词数，靠孩子动脑的方式。词永远是生活词，变的是孩子承担的任务。递进：**前段拼零件 → 中段学协商 → 后段学因果推测。** 每个阶段有承接词指纹，孩子靠它把功能串起来，不许串台。

**章节与阶段的映射（全量迁移定稿）**：第 1–3 章 = 前段；第 4–5 章 = 中段；第 6–10 章 = 后段。后段课允许复用前段句式（螺旋复用），但每章至少让新阶段的指纹词自然出现。

### 前段（第 1–3 章 · 拼零件）

- 指纹：`still / first / then`。全段**禁止** `because / so / if / might`。
- 孩子骨架：说明现状 → 提出有限请求或两步方案 → **给一条大人不知道的具体信息**（颜色、归属、特征，不是位置指示）。
- 基准（收玩具）：`I'm still building. Can I finish this part first?` → `I'll put the blocks away first, then can you help me with the cars?` → `The blue one. The red box is for cars.`
- 已定稿样例（1.2 选恐龙上衣，同色逼出特征）：

> **Dog Dad:** Time to get dressed. Two shirts are ready.
> **Tiger Child:** I want the dinosaur one, please.
> **Dog Dad:** Both are red. Which one do you mean?
> **Tiger Child:** The one with the big dinosaur. The other one only has stripes.
> **Dog Dad:** Good pick. Here you go.
> **Tiger Child:** Thank you. I'll wear it right away.

### 中段（第 4–5 章 · 协商）

- 指纹：`I know, but / just / again`。
- 孩子骨架：承认对方立场+转折 → 缩小请求（`just one slice` / `two more minutes`）→ 接受条件并复述自己的执行计划。
- 基准（睡前苹果片）：`I know, but I'm still hungry. Could I have just one apple slice?` → `Okay. I'll eat it at the table and brush my teeth again.`

### 后段（第 6–10 章 · 因果推测）

- 指纹：`so / might`、回忆过去式（`First...and then...` / `I used it` / `It was...` / `I found...`）、条件与计划（`if / when` 允许）。
- 孩子骨架：报告问题或事件 → 回忆+因果推测 → 报告结果和新状态。
- 基准（找水瓶）：`I used it in the living room, so it might be near the sofa.` → `Found it! It was behind the cushion. Now I'm ready.`
- 已定稿样例（10.2 讲两件事）见 §2 基准样例；1.3（牛奶改水）把公园赛跑带进厨房，是后段之前的过渡写法参考。

---

## 6. 推导公式（从零写一课）

1. 查这课的 move 和关键句式（架构设计 §10 大纲表）。
2. 选孩子的真实目标和一个自然家庭/学校场景。
3. 让关键句式由孩子在真实动机下说出来（不是为说句式而安排台词）。
4. 按阶段套孩子骨架（§5），用对本阶段承接词。
5. 大人插三个钩子：开场条件、中间追问（前/后段）或条件句（中段）、结尾短确认。
6. 通读一遍：删掉所有指示词撑话的句子，确认开头的事结尾有着落。

---

## 7. 交付前自查

- 关键句式出现了吗？是孩子在真实动机下说的吗？
- 全段有没有 this / here / there 撑起来的句子？
- 开头的事，结尾有着落吗？
- 孩子每次开口功能不同吗？承接词对阶段吗（前段无 because/so/if/might）？
- 大人有没有出选择题、说 `Say...`、或一句话干多件事？
- 场景自然吗？道具不超过一组吗？只听录音能听懂吗？
- 词数：孩子不低于大人（或接近持平）？大人单句 10 词以内？

---

## 8. 与其它文档的关系

- 本文件是**内容生成风格**手册，取代 `three-by-ten-v2` 时代「每段 3–4 轮、12–20 词、固定 Goal/Change/Resolve」的写作要求。
- 数据职责、切分原则、角色与安全约束见 [`2026-09-06-continuous-dialogue-content-design.md`](2026-09-06-continuous-dialogue-content-design.md)。
- 每课关键句式对照见 [`2026-09-04-curriculum-architecture-design.md`](2026-09-04-curriculum-architecture-design.md) §10 大纲表。
- [`curriculum/04/FINAL-REVIEW.md`](../../curriculum/04/FINAL-REVIEW.md) 只证明旧 contract 内容合格，不是本规范的验收结论。
