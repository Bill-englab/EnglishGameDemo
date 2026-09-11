# Stage 2（`curriculum/05`）内容计划 — I can keep it going

> 日期：2026-09-11
> 状态：**骨架已于同日实现**——`curriculum/05` 30 课全部创建（`draft`，revision 1），validator `--complete` 0 issue，90 份提示词已导出（索引见 [`prompts/05/README.md`](../../prompts/05/README.md)）。正文大纲即已实现内容；30 课仍需用户逐课人工复核后才能提升 `language_reviewed`。
> 前置阅读：[课程架构设计](2026-09-04-curriculum-architecture-design.md)（§4 成长框架、§10 大纲格式、§11 螺旋复用）、[连续对话规范](2026-09-06-continuous-dialogue-content-design.md)、[内容生成风格手册](2026-09-06-dialogue-authoring-style.md)、[Stage 1 最终审查](../../curriculum/04/FINAL-REVIEW.md)
> 上层决策：见[阶段路线图](2026-09-11-stage-roadmap-nce-bridge.md)

## 1. 成长方向：孩子承担什么新责任

Stage 2 的核心命题是"让对话继续，而不是回答一句就结束"。相对 Stage 1，难度增长全部来自**沟通责任**，不来自生词量和句长：

1. **主动追问**——Stage 1 里成人问所有真问题；Stage 2 让孩子成为提问者（追问故事、问细节、问安排）。
2. **为没在场的人描述**——信息差反转：孩子知道、大人不知道，描述必须具体到能行动。
3. **延展协商**——从"缩小请求"升级到"提交换条件、提第三方案、礼貌不同意"。
4. **讲述与解释**——两个连续事件加细节；解释玩法和步骤，并确认对方听懂。

红线（继承架构设计 §4）：每章复用 Stage 1 语言功能，在其上加深度。**不出现** Stage 1 之外的语法目标；新词汇每课 2–4 个生活词，不设生词指标。

## 2. 难度校准（参考，非逐课硬配额）

沿用连续对话规范 §4 的校准思路，整体上调一档：

| 课程位置 | 完整对话参考 | 孩子承担的沟通责任 |
| --- | --- | --- |
| 前几章（1–2 章） | 约 55–70 词、7–9 轮 | 每段对话孩子**主动提问 ≥2 次**；描述具体到颜色/特征/位置 |
| 中段（3–5 章） | 约 55–75 词 | 理由句（because/so）主动产出；转述一条完整信息；协商跨 ≥3 轮 |
| 后段（6–10 章） | 约 60–80 词，允许自然长短 | if 条件提议；讲两个事件带 when/where；解释 3 步流程并确认理解 |

**阶段句式指纹**（沿用风格手册的三段指纹法，Stage 2 版）：

- **Phase A（第 1–2 章 · 追问与描述）**：`What happened next? / Where did you get it? / Who is coming?` + 描述块 `the one with... / next to... / on the top shelf`
- **Phase B（第 3–5 章 · 信息交换）**：`because / so` 主动产出；`says` 转述块（`Mom says dinner is ready.`）；星期与钟点口语
- **Phase C（第 6–8 章 · 协商升级）**：`If I..., can we...?`；`What about...? / How about...?`；礼貌异议 `I like it, but...`
- **Phase D（第 9–10 章 · 讲述与解释）**：`first / then / after that`；过去式碎片（Stage 1 第 10 章已有）；流程指令 `You press this part, and then it goes.`；确认理解 `Do you want to try? / Like this?`

## 3. 十章骨架（每章 3 课）

格式沿用架构设计 §10。`核心回应`是卡住时的支架参考，不是逐字目标。伙伴分布：家庭 22/30（73%，≥70% 门槛）、Teacher 3、Peer 5。

### Phase A — 让对话转起来

#### Chapter 1 — 追问（目录名建议 `01-follow-up-questions`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用（Stage 1） |
| --- | --- | --- | --- | --- |
| 1.1 爸爸的一天 | 爸爸 / 晚餐后聊天 | 听大人讲一件事，主动追问把故事听完 | `What happened next?` | 听众回应、recount 语言输入 |
| 1.2 神秘包裹 | 妈妈 / 收到包裹 | 对没见过的东西问出细节 | `What's inside? Where did you get it?` | `ask-location`、`specify-choice` |
| 1.3 周六谁来 | 妈妈 / 家庭计划 | 对安排问出 who / where / when | `Who is coming? What time do we leave?` | `contribute-to-plan`、`ask-duration` |

#### Chapter 2 — 说给没在场的人听（`02-describing-for-others`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 2.1 爸爸的杯子 | 爸爸 / 找不到东西 | 描述特征帮大人找到物品 | `It's the small blue one with a handle.` | `specify-choice`、`check-location` |
| 2.2 玩具放哪了 | 妈妈 / 收玩具后 | 说清位置让妈妈行动 | `It's on the top shelf, next to the bear.` | `check-location`、`identify-belonging` |
| 2.3 新同学 | 兔子老师 / 学校 | 描述一个人的样子和喜好 | `He has curly fur. He likes dinosaurs.` | `recount-one-event`、`explain-feeling` |

### Phase B — 交换信息

#### Chapter 3 — 时间与安排（`03-time-and-schedules`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 3.1 早上问安排 | 妈妈 / 早晨 | 问今天的安排和时间 | `What are we doing today? What time...?` | `ask-duration` |
| 3.2 还有多久 | 爸爸 / 出门路上 | 问剩余时间并理解先后 | `How long until...?` | `ask-duration`、`sequence-actions` |
| 3.3 周六的计划 | 妈妈 / 家庭计划 | 问计划细节并补上自己的部分 | `What should I bring?` | `contribute-to-plan`、`first-then` |

#### Chapter 4 — 比较与决定（`04-comparing-deciding`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 4.1 两种选择 | 妈妈 / 厨房或超市 | 比较两个选项并说原因 | `This one is bigger, but I want that one because...` | `specify-choice`、`explain-feeling` |
| 4.2 冷天穿什么 | 爸爸 / 出门前 | 根据天气选衣服并说理由 | `It's cold outside, so I need my jacket.` | `sequence-actions`、`state-body-need` |
| 4.3 我最喜欢的 | 爸爸 / 闲聊 | 说喜好并给原因 | `I like ___ the most because...` | `explain-feeling` 句式迁移 |

#### Chapter 5 — 传话（`05-relaying-messages`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 5.1 妈妈说晚餐好了 | 爸爸 / 在书房 | 准确传一条口信 | `Mom says dinner is ready.` | 请求/告知语言 |
| 5.2 面卖完了 | 妈妈 / 超市回来 | 转述信息并回应追问 | `They didn't have pasta, so we got rice.` | `recount-two-events` |
| 5.3 给爸爸打电话 | 爸爸 / 电话 | 完成一次短通话：问好、说事、答一问、收尾 | `Hi Dad... Okay, bye!` | `request-item`、`ask-duration` |

### Phase C — 协商升级

#### Chapter 6 — 交换条件（`06-trades-conditions`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 6.1 睡前交换 | 妈妈 / 睡前 | 主动提出交换条件 | `If I put the blocks away fast, can we read two books?` | `request-before-boundary`、`propose-order` |
| 6.2 两个都不想要 | 爸爸 / 家里或商店 | 在给出的选项外提第三方案 | `Actually, what about the small one?` | `change-choice`、`propose-order` |
| 6.3 新规则 | 同龄伙伴 / 游戏 | 对游戏规则提出修改 | `How about we take turns being the driver?` | `request-turn`、`suggest-shared-play` |

#### Chapter 7 — 计划一起做事（`07-planning-together`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 7.1 约定搭城堡 | 同龄伙伴 / 玩耍前 | 商量时间、地点、做什么 | `Let's build it after snack, by the blocks.` | `suggest-shared-play`、`ask-about-arrangement` |
| 7.2 下雨了 | 爸爸 / 出门前 | 计划被打乱时提替代方案 | `It's raining, so we can't go to the park. What if we...?` | `contribute-to-plan`、`propose-order` |
| 7.3 一起装书架 | 爸爸 / 手工 | 分任务并确认分工 | `You hold the big one, and I'll hand you the screws.` | `request-help`、`sequence-actions` |

#### Chapter 8 — 观点与感受交换（`08-opinions-empathy`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 8.1 妈妈累了 | 妈妈 / 晚上 | 主动关心并追问 | `Are you tired? Do you want to sit down?` | `ask-for-detail`、情绪词 |
| 8.2 我不太同意 | 同龄伙伴 / 游戏想法 | 礼貌表达不同意见并给理由 | `I like your idea, but I think...` | `request-turn`、`explain-feeling` |
| 8.3 安慰朋友 | 同龄伙伴 / 朋友难过 | 共情并提议一起做点什么 | `Are you okay? Do you want to build it with me?` | `repair-relationship`、`ask-about-feelings` |

### Phase D — 讲述与解释

#### Chapter 9 — 讲完整的小事（`09-telling-stories`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 9.1 学校的两件事 | 爸爸 / 晚餐 | 讲两个连续事件并带细节 | `First..., and then...` + when / where | `recount-two-events` |
| 9.2 老师的追问 | 兔子老师 / 学校 | 讲述中回应听众的澄清问题 | `It was the red one. At the sand table.` | `repair-meaning`、`recount-two-events` |
| 9.3 周日的郊游 | 妈妈 / 回家后 | 按顺序讲一次外出经历 | `We went to... First..., after that...` | `recount-two-events`、`ask-about-arrangement` |

#### Chapter 10 — 解释怎么做（`10-explaining-how`）

| 关卡 | 伙伴 / 设定 | can_do | 核心回应 | 主要复用 |
| --- | --- | --- | --- | --- |
| 10.1 我们的新游戏 | 同龄伙伴 / 玩耍 | 给别人解释一种玩法 | `First you hide it, then I count...` | `suggest-shared-play`、`plan-the-game` |
| 10.2 它怎么动 | 爸爸 / 玩具 | 解释一个玩具的操作步骤 | `You press this part, and then it goes.` | `sequence-actions`、`request-help`（反向） |
| 10.3 教会为止 | 兔子老师 / show-and-tell | 解释后确认对方听懂、回答问题 | `Do you want to try? First..., then...` | `signal-nonunderstanding`（反向）、`explain-how-it-works` |

**螺旋复用自查**（架构 §11）：`stage.json` 的 13 个 carry-forward moves 中，`set-stop-boundary` 与 `seek-safe-adult-help` 未出现在上表主要复用列，必须安排进对应章节的 Replay Card（8.2 的身体边界、9.3 的外出安全），创作时由 validator 覆盖报告核对。

## 4. NCE1 前半册场景映射（只借场景与词汇域，不借台词）

| Stage 2 章 | NCE1 参考（L1–72） | 借入的内容 |
| --- | --- | --- |
| 1 追问 | L67–70 周末、汽车比赛 | 被追问的素材域（周末活动、比赛见闻） |
| 2 描述 | L25–28 厨房/客厅方位；L11–14 颜色、所有格 | 家居位置词、特征描述 |
| 3 时间 | L57–68 时间表达、Sawyer 家日常、周末 | 钟点口语、星期、日常安排词 |
| 4 比较 | L13 / L51–53 天气与穿着；L41–49 食物数量与喜好 | 天气词（sunny / rainy / cold / windy）、食物量词（a loaf / a bottle / a piece）、喜好问答 |
| 5 传话 | L59 购物；留言/电话场景概念 | 购物信息（They didn't have...）、通话开场收尾 |
| 6 交换 | L45–64 can / must 情态场景 | 交换条件的情态表达 |
| 7 计划 | L37–40 be going to、做书架 | 制作类词汇（build / hold / screw）、be going to 自然复现 |
| 8 观点 | L47–50 喜好表达 | agree / disagree 的礼貌块 |
| 9 讲述 | L67–72 过去时周末故事；L61–63 看病 | 经历叙述素材（周末、看病——看病进 Replay Card，由兔子老师扮医生） |
| 10 解释 | L29–40 祈使句（Come in, Amy / Making a bookcase） | 流程指令句式（You press... / Turn it...） |

词汇域扩展总量控制在上述范围；每课新增生活词 2–4 个，写入对话前先查 Stage 1 词表避免重复计数。

## 5. 提示词与生产管线

管线与 Stage 1 完全一致，无新工具：

```text
curriculum/05/<章>/<课>/lesson.json     唯一台词、角色、设定与版本来源（continuous-dialogue-v1）
prompts/05/<章>/<课>/production.json    只写镜头与动作：clips[3] + emotion + start/action/end
                     ↓
tools/build_video_prompts.py --stage 05 --check / --write
                     ↓
prompts/05/<章>/<课>/{a,b,c}.txt        详情页 VideoGen 读取的导出文件
```

### 5.1 新场景的 production 注意事项

- **电话（5.3）**：两说话人规则不变（Child + 远端家人）。开拍前先定构图方案——分屏双画格或单侧持机；这是 Stage 2 唯一需要新构图决策的场景，建议先做单课试生成再定稿。道具唯一：话机或手机。
- **看病（仅 Replay Card）**：不新增角色，兔子老师扮医生；延续 9.3 走失演练的"在家平静扮演"原则，不制造真实焦虑。
- **商店/超市（4.1、6.2、5.2 素材）**：沿用 9.2 货架构图与"唯一关键道具"经验。
- **手工/装置（7.3、10.2）**：手部连续性高危场景，参考 3.1（轨道推接）与 7.1（积木交接）的写法：谁的手、哪个方向、放在哪，逐 clip 写明。
- **show-and-tell（10.3）**：固定双人构图，无闪回、无第三声音，参考 10.1/10.2 的空手讲述写法。

### 5.2 卡司与安全门

- 五个固定角色不变（小老虎、狗爸爸、猪妈妈、兔子老师、小熊伙伴）；统一画风、情绪上限、服装归属检查、正向危险表演拒绝，全部沿用现有导出器规则。
- demo 生产节奏沿用现状：`language_reviewed` 不自动 `video_ready`；逐课试生成通过后才制作正式 demo。孩子进度快于 demo 生产是预期内的——详情页 Read Together 的完整对话足以支撑线下 role-play，demo 不是推进关卡的前提。

## 6. 创作与验收流程

沿用架构 §12 与连续对话规范 §13 的流程，Stage 2 特有检查点：

1. 每课先过 [风格手册五条硬规则](2026-09-06-dialogue-authoring-style.md)（内容自明、逻辑闭环、关键句式必含、自然场景、孩子重成人轻）；
2. Phase A 各课核对"孩子主动提问 ≥2 次"；
3. Phase C 各课核对"协商跨 ≥3 轮"（一次交换不算完成）；
4. 每章核对螺旋复用：新 move 复用 ≥2 个 Stage 1 move，且跨 ≥2 个生活情境；
5. `python tools/validate_curriculum.py --stage 05` 逐章过；全 30 课后 `--complete`；
6. 提示词导出与版本同步由 `build_video_prompts.py --stage 05 --check` 把关。

## 7. 待用户确认的开放问题

1. **十章主题与顺序**是否认可？尤其两类新形态：Ch5 传话（"Mom says..."口信任务）和 Ch8 观点交换（主动关心大人情绪）。
2. **Ch8.1「妈妈累了」**由孩子主动关心大人——是否符合家庭价值观？（备选：改成关心摔了一跤的爸爸）
3. **目录名定稿**：第 3 节各章标题括号内的英文 kebab-case 建议名。
4. **Stage 2 视觉**：沿用现有 10 个 world 背景还是为新场景（商店、诊所）补图？建议先沿用、上线后按观感补图。
5. **demo 生产节奏**：维持逐课 `video_ready` 试点，还是 Stage 2 前期纯靠 Read Together 文本 + 家长带练？（建议前者，与现有政策一致）

## 8. 明确不做

- 本计划不创建任何 `curriculum/05/` 文件——逐章获用户确认后按流程开工；
- 不在 Stage 2 引入 Stage 1 之外的语法教学目标（比较级、现在完成时等只作为自然口语碎片允许出现，不设课程目标）。
