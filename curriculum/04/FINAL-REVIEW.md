# Stage 1（`curriculum/04`）三段十秒完整内容审查

审查范围：10 章、30 课、90 段 canonical 对话、30 份 `production.json` 与 90 份生成提示词。最终审查日期：2026-09-06。

## 发布结论

Stage 1 已完成 `three-by-ten-v2` 迁移和逐课书面复核。`stage.json` 与 30/30 Lesson 均声明该 contract；所有 Lesson 保持 `language_reviewed`，**0 课**被提升为 `video_ready`。

- 结构：10/10 章、30/30 课、90/90 个 A/B/C 段；30 个不同的主要 Conversation Move。
- 正式台词：共 **1451 词 / 296 turns**；Child 共 **654 词 / 134 turns**。
- 逐课负担：45–51 词、9–11 turns；Child 18–27 词、4–5 turns。
- 分段负担：90/90 段均为 3–4 turns、12–20 词；89 段在首选 14–19 词区间，唯一例外是 10.1 Part B 的 13 词，仍在硬范围内且动作很小。
- 角色：Dad 11 课、Mom 12 课、Teacher 3 课、Peer 4 课；家庭成员 23/30（76.7%），高于 70% 门槛。
- 迁移：每课 2 张完整 Replay Card，共 60 个新情境；每课正式新增一个 Move 并只复现此前 Move。
- 审查：30/30 课的十个结构化 review gate 为 true；下方另逐课回答获批规格的 11 个书面内容问题。
- 版本：revision 2 共 23 课、revision 3 共 4 课（2.3、5.1、8.1、9.3）、revision 4 共 3 课（2.1、2.2、5.3）。Lesson 与对应 production 版本逐课一致。
- 提示词：90/90 与 canonical 台词、revision 和 SHA256 同步；没有旧 `12-15 seconds`、正向 `extend the clip` 或 pacing advisory。
- 媒体：历史 14/30 demo 均由 revision 1 / v1 内容制作，相对当前 revision 2–4 **全部 stale**；本轮没有删除、覆盖或重新编码任何 demo/performance。

## 审查方法与判定口径

每课按 A→B→C 阅读正式台词，再读两个 Replay Card；随后逐字阅读 production 的 scene、emotion 与三组 start/action/end。Q1–Q11 对应获批规格中的 11 个问题：

1. `can_do` 是否得到真实生活结果；
2. A/B/C 是否形成连续因果链；
3. Child 的 4–5 次输出是否各有功能；
4. core/stretch/repair 是否在正式剧情或 Replay Card 中自然出现；
5. `recycle` 是否只来自此前课程；
6. 道具、颜色、位置和手部动作是否连续；
7. 两张 Replay Card 是否为完整新情境；
8. 成人行为、身体、情绪与安全逻辑是否合理；
9. 男孩身份、服装归属和代词是否一致；
10. 情绪、脸部、声音和手势是否克制但准确；
11. A/B/C 提示是否逐字导出台词且各自满足十秒预算。

`P` 表示对该问题逐项通过。服装扫描只判断**分配给 Child 的服装**；中性的 `get dressed`、成人自己的衣物以及不带性别刻板印象的颜色/玩具不会被误判。情绪扫描允许 `No ...`、`do not ...`、`never ...` 等负面安全禁令，也允许带明确上限的轻微情绪；它只拒绝正向要求尖叫、极端兴奋、扭曲或无边界的 `excited`/`shocked`/`angry` 等表演。

## 精确负担与版本

词数按 validator 的空白分词计算；单元格均为“词 / turns”。

| 课 | 标题 | Partner / Move | A | B | C | 全课 | Child | Rev |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.1 | The Apple, Please | Mom / `request-item` | 14/3 | 18/3 | 16/4 | 48/10 | 22/4 | 2 |
| 1.2 | The Dinosaur Shirt | Dad / `specify-choice` | 19/3 | 14/4 | 18/4 | 51/11 | 24/5 | 2 |
| 1.3 | Water Instead | Mom / `change-choice` | 16/3 | 15/4 | 15/3 | 46/10 | 21/4 | 2 |
| 2.1 | Not Ready Yet | Dad / `delay-boundary` | 17/3 | 16/3 | 17/4 | 50/10 | 24/5 | 4 |
| 2.2 | Two More Minutes | Mom / `request-time` | 19/3 | 17/3 | 14/4 | 50/10 | 22/5 | 4 |
| 2.3 | Blocks First | Dad / `propose-order` | 16/3 | 14/3 | 17/4 | 47/10 | 23/5 | 3 |
| 3.1 | Help With the Track | Dad / `request-help` | 15/3 | 16/3 | 18/4 | 49/10 | 27/5 | 2 |
| 3.2 | Show Me Again | Teacher / `signal-nonunderstanding` | 16/3 | 16/3 | 18/4 | 50/10 | 19/5 | 2 |
| 3.3 | The Blue Cup | Mom / `repair-meaning` | 17/3 | 15/3 | 17/4 | 49/10 | 24/4 | 2 |
| 4.1 | Water First | Mom / `state-body-need` | 14/3 | 16/3 | 16/3 | 46/9 | 20/4 | 2 |
| 4.2 | Bathroom Break | Dad / `request-a-pause` | 17/4 | 15/3 | 15/3 | 47/10 | 23/5 | 2 |
| 4.3 | My Knee Hurts | Mom / `describe-discomfort` | 14/3 | 14/3 | 18/3 | 46/9 | 19/4 | 2 |
| 5.1 | Shoes, Then Jacket | Dad / `sequence-actions` | 15/3 | 14/4 | 17/4 | 46/11 | 22/5 | 3 |
| 5.2 | One Book Before Bed | Mom / `request-before-boundary` | 16/3 | 16/4 | 16/3 | 48/10 | 24/4 | 2 |
| 5.3 | I Still Need My Bottle | Dad / `report-readiness` | 18/3 | 14/3 | 16/4 | 48/10 | 24/5 | 4 |
| 6.1 | Where Is My Car? | Dad / `ask-location` | 15/3 | 17/3 | 19/4 | 51/10 | 24/5 | 2 |
| 6.2 | Under the Bed? | Mom / `check-location` | 14/3 | 14/3 | 19/4 | 47/10 | 19/4 | 2 |
| 6.3 | Mine Has a Dinosaur | Teacher / `identify-belonging` | 15/3 | 16/4 | 15/3 | 46/10 | 18/4 | 2 |
| 7.1 | Can I Build Too? | Peer / `join-play` | 15/3 | 16/4 | 16/3 | 47/10 | 19/4 | 2 |
| 7.2 | After Your Turn | Peer / `request-turn` | 17/3 | 17/4 | 15/3 | 49/10 | 20/4 | 2 |
| 7.3 | Space Pirates | Peer / `suggest-shared-play` | 15/3 | 17/3 | 18/4 | 50/10 | 25/5 | 2 |
| 8.1 | I Feel Frustrated | Mom / `explain-feeling` | 16/3 | 14/3 | 15/4 | 45/10 | 23/5 | 3 |
| 8.2 | Please Stop | Dad / `set-stop-boundary` | 14/3 | 15/3 | 18/4 | 47/10 | 18/4 | 2 |
| 8.3 | Let's Build It Again | Peer / `repair-relationship` | 16/3 | 15/3 | 19/4 | 50/10 | 24/5 | 2 |
| 9.1 | How Much Longer? | Dad / `ask-duration` | 15/3 | 17/3 | 18/4 | 50/10 | 22/5 | 2 |
| 9.2 | Where Is the Pasta? | Mom / `ask-shop-location` | 17/3 | 16/3 | 18/3 | 51/9 | 22/4 | 2 |
| 9.3 | I Can't Find My Mom | Mom / `seek-safe-adult-help` | 17/3 | 14/3 | 17/3 | 48/9 | 19/4 | 3 |
| 10.1 | I Built a Tower | Teacher / `recount-one-event` | 18/3 | 13/3 | 17/3 | 48/9 | 20/4 | 2 |
| 10.2 | First We Painted | Dad / `recount-two-events` | 15/4 | 18/3 | 18/3 | 51/10 | 19/4 | 2 |
| 10.3 | Tomorrow's Plan | Mom / `contribute-to-plan` | 17/3 | 14/3 | 19/3 | 50/9 | 24/4 | 2 |

### 章节聚合

| 章 | 全部词/turns | Child 词/turns | Partner 分布 | Revision 分布 |
| --- | ---: | ---: | --- | --- |
| 1 | 145/31 | 67/13 | Dad×1, Mom×2 | r2×3 |
| 2 | 147/30 | 69/15 | Dad×2, Mom×1 | r3×1, r4×2 |
| 3 | 148/30 | 70/14 | Dad×1, Mom×1, Teacher×1 | r2×3 |
| 4 | 139/28 | 62/13 | Dad×1, Mom×2 | r2×3 |
| 5 | 142/31 | 70/14 | Dad×2, Mom×1 | r2×1, r3×1, r4×1 |
| 6 | 144/30 | 61/13 | Dad×1, Mom×1, Teacher×1 | r2×3 |
| 7 | 146/30 | 64/13 | Peer×3 | r2×3 |
| 8 | 142/30 | 65/14 | Dad×1, Mom×1, Peer×1 | r2×2, r3×1 |
| 9 | 149/28 | 63/13 | Dad×1, Mom×2 | r2×2, r3×1 |
| 10 | 149/28 | 63/12 | Dad×1, Mom×1, Teacher×1 | r2×3 |
| **总计** | **1451/296** | **654/134** | **家庭 23、Peer 4、Teacher 3** | **r2×23, r3×4, r4×3** |

### 复现 Move 聚合与承接

validator 重新计算后的非零复现次数为：`ask-location=3`、`change-choice=2`、`check-location=2`、`delay-boundary=2`、`identify-belonging=1`、`join-play=2`、`propose-order=3`、`recount-one-event=1`、`repair-meaning=1`、`report-readiness=2`、`request-a-pause=1`、`request-help=8`、`request-item=9`、`request-time=1`、`sequence-actions=3`、`specify-choice=9`、`state-body-need=1`。

5.3 只保留实际出现的 `request-help`，不再把 readiness/bottle 场景写成 `state-body-need`；该 Move 在合适的 8.2 身体边界场景中承接。9.3 只保留实际出现的 `request-help`，不再把姓名或 worker badge 写成物品归属；`identify-belonging` 在 10.1 的 picture Replay 中由 `It's mine. It has a sun.` 自然承接。没有为覆盖计数把身体需要或归属语言硬塞进不相关的安全/出发场景。

## 30 课内容合同逐项结果

| 课 | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Q8 | Q9 | Q10 | Q11 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | P | P | P | P | P | P | P | P | P | P | P |
| 1.2 | P | P | P | P | P | P | P | P | P | P | P |
| 1.3 | P | P | P | P | P | P | P | P | P | P | P |
| 2.1 | P | P | P | P | P | P | P | P | P | P | P |
| 2.2 | P | P | P | P | P | P | P | P | P | P | P |
| 2.3 | P | P | P | P | P | P | P | P | P | P | P |
| 3.1 | P | P | P | P | P | P | P | P | P | P | P |
| 3.2 | P | P | P | P | P | P | P | P | P | P | P |
| 3.3 | P | P | P | P | P | P | P | P | P | P | P |
| 4.1 | P | P | P | P | P | P | P | P | P | P | P |
| 4.2 | P | P | P | P | P | P | P | P | P | P | P |
| 4.3 | P | P | P | P | P | P | P | P | P | P | P |
| 5.1 | P | P | P | P | P | P | P | P | P | P | P |
| 5.2 | P | P | P | P | P | P | P | P | P | P | P |
| 5.3 | P | P | P | P | P | P | P | P | P | P | P |
| 6.1 | P | P | P | P | P | P | P | P | P | P | P |
| 6.2 | P | P | P | P | P | P | P | P | P | P | P |
| 6.3 | P | P | P | P | P | P | P | P | P | P | P |
| 7.1 | P | P | P | P | P | P | P | P | P | P | P |
| 7.2 | P | P | P | P | P | P | P | P | P | P | P |
| 7.3 | P | P | P | P | P | P | P | P | P | P | P |
| 8.1 | P | P | P | P | P | P | P | P | P | P | P |
| 8.2 | P | P | P | P | P | P | P | P | P | P | P |
| 8.3 | P | P | P | P | P | P | P | P | P | P | P |
| 9.1 | P | P | P | P | P | P | P | P | P | P | P |
| 9.2 | P | P | P | P | P | P | P | P | P | P | P |
| 9.3 | P | P | P | P | P | P | P | P | P | P | P |
| 10.1 | P | P | P | P | P | P | P | P | P | P | P |
| 10.2 | P | P | P | P | P | P | P | P | P | P | P |
| 10.3 | P | P | P | P | P | P | P | P | P | P | P |

## Production 逐课复核

每行均复核：必要道具与数量、手部/位置衔接、Child 服装与男孩身份、情绪上限、A-end=B-start/B-end=C-start、最终物理状态。`P×6` 表示六项分别通过，不代表已实测生成视频。

| 课 | 结果 | 可核对的最终链路 |
| --- | --- | --- |
| 1.1 | P×6 | 苹果/香蕉身份不变；Mom 右手纠错后交苹果，Child 双手持苹果结束。 |
| 1.2 | P×6 | 始终只有两件红上衣；黄色 T-shirt 不换装，Child 最终双手持恐龙上衣。 |
| 1.3 | P×6 | 杯子到 C 前一直空；只倒水，Child 最终持装水杯，牛奶未入杯。 |
| 2.1 | P×6 | 单个红屋顶由 Child 右手持有并装上，再放入收纳盒；其余三块留桌面。 |
| 2.2 | P×6 | 黄蜡笔在 B-end/C-start 均由 Child 右手持有，补完太阳后留桌面；二人平静出门，没有伪造两分钟流逝。 |
| 2.3 | P×6 | 两块积木先入左格，再由二人各收一辆车入右格，桌面清空。 |
| 3.1 | P×6 | Child 右手推轨道、Dad 右手固定；随后同一列车交到 Child 右手并越过接缝。 |
| 3.2 | P×6 | 无道具；Teacher 与 Child 各自只做一次 clap-then-tap，双手回到自己的膝盖。 |
| 3.3 | P×6 | 绿杯始终未拿起；Mom 核对蓝色带把手杯后交给 Child 双手。 |
| 4.1 | P×6 | 水在首次口渴信号后立即可取；Child 喝完再说话，零食保持未动。 |
| 4.2 | P×6 | Child 在 A 内离开；B 用明确省略表示真实如厕与洗手后返回，卡牌位置未变。 |
| 4.3 | P×6 | 始终是右膝；Mom 右手轻放同一冷布，活动仍暂停且不声称治愈。 |
| 5.1 | P×6 | 坐姿依次穿两只鞋和开襟夹克；Child 最终仍穿黄 T-shirt、夹克未扣。 |
| 5.2 | P×6 | 蓝熊书完整阅读用时间省略；奶油色书不动，结尾蓝书在 Mom 腿上、灯关闭。 |
| 5.3 | P×6 | Child 右手取瓶、左手稳袋；瓶入袋后左手提袋，门仍关闭。 |
| 6.1 | P×6 | Dad 右手左移蓝盒露出红车；Child 右手取同一辆车，原位置清空。 |
| 6.2 | P×6 | 同一蓝黄袜从椅面到 Child 右手；左脚袜仍穿着，右脚仍未穿。 |
| 6.3 | P×6 | 星星瓶落桌，Teacher 左手交恐龙瓶到 Child 右手；贴纸与瓶不交换。 |
| 7.1 | P×6 | Peer 放第 4 段路，Child 接唯一蓝桥；四段路与桥最终首尾相接。 |
| 7.2 | P×6 | 唯一红球完成 Peer 最后一滚、手递交接、Child 第一滚并由 Peer 接住。 |
| 7.3 | P×6 | 唯一地图由 Peer 交给 Child；二人始终坐在平铺毯上，各自开始协商后的角色。 |
| 8.1 | P×6 | Mom 右手找到蓝拼图并交 Child 左手；Child 填入唯一缺口，拼图四块齐。 |
| 8.2 | P×6 | Dad 在首次 stop 立即双手放下；一整垫宽距离保持到结尾，无再次接触。 |
| 8.3 | P×6 | 仅三块 tan/blue/red；Child 稳底座，Peer 依次放回中层与顶层，颜色顺序恢复。 |
| 9.1 | P×6 | Dad 全程系带、目视道路、双手握方向盘；Child 保持约束，五分钟没有在片内流逝。 |
| 9.2 | P×6 | 唯一红色透明窗 pasta 袋从底层架进入 Mom 右手所持空篮，包装身份不变。 |
| 9.3 | P×6 | 始终在家且 Mom 可见；badge 只表示预先约定角色，没有陌生人、真实电话或重聚。 |
| 10.1 | P×6 | 教室固定双人谈话，无塔、Maya、闪回或第三声音；空手小动作后仍坐原位。 |
| 10.2 | P×6 | 家中固定双人谈话，无画作、巴士、画笔或学校闪回；最终仍空手坐原位。 |
| 10.3 | P×6 | 家中固定双人计划，无书、天气特效或目的地切换；条件计划在原位确认。 |

## 本轮修正与验证边界

- Chapter 2 的六个非逐字 response-tier 示例已对齐：三个 stretch 采用正式剧情中的真实扩展；三个 repair 放入带真实误解的新 Replay exchange。两个只有 `Okay...` 的接受语从 `repair` 改为 `confirmation`。因 canonical 元数据与 Replay 内容改变，三课连同 production、source hash 和提示词一起升至 revision 3；正式 A/B/C 台词未改。
- 最终 Q4 复核把 8.1 的普通求助 `Can you help me find it?` 从 `repair` 改为 `stretch`；board-game Replay 现在先出现 Dad 对诉求的真实误解，再由 Child 说 `No, I mean you skipped my turn.` 明确修复。5.3 与 9.3 删除两项没有实际练习的 recycle 声明。三课随 canonical/production/hash 同步升版，正式 A/B/C 台词未改。
- 提示词导出器增加了一个窄范围安全门：任何未知非空 `dialogue_contract` 都在 legacy/v2 分支前被拒绝，只有缺失或空值保留 v1 兼容。v2 production 中把尖叫、极端兴奋、扭曲、失控动作、旧时长逃生语或无边界情绪词当作**正向导演要求**时拒绝导出；`No screaming is allowed, frantic gestures are encouraged.` 与 `Child is raging throughout the scene.` 均不能绕过检查。语义正确的逗号并列禁令、明确 `No`/`do not`/`never` 约束与轻微有界情绪仍被允许。
- Chapter 2 的 roof 与 crayon 在 B-end/C-start 明确保持 Child 右手持有；2.1、2.2 因 production 边界文字改变同步升至 revision 4。所有 90 份导出均已重建并复核 source revision/hash。
- 9.1 是三段连续的车内谈话：五分钟只是估计，片内没有时间省略、过桥或抵达。2.2 明确“提前完成、无时间跳转”；4.2 与 5.2 才分别用显式省略表示真实如厕返回和完整读完一本书。

## 剩余制作风险

书面审查和导出同步不能替代真实生成验收。每课仍需单独试生成并检查约十秒自然语速、口型、声音身份、参考帧衔接、细小手部动作、角色比例和孩子观看舒适度。生成模型也可能忽略文字中的手部或负面约束。历史 demo 不得作为新版验收证据；只有上述项目逐课通过后，才能明确把那一课提升为 `video_ready` 并制作替换视频。

**APPROVED FOR RUNTIME USE; VIDEO PRODUCTION REMAINS PAUSED**
