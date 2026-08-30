# 对话逻辑审查与修正 · Dialogue Life-Logic Review

- **分支：** `fix/dialogue-life-logic`
- **日期：** 2026-08-16
- **范围：** 从 `03-asking-help/D2` 起、所有**尚未生成 demo** 的关卡（03 的 D2/D3 + 04~10 全部，共 23 关）的对话源 `dialogues.md` 与视频提示词 `prompts/<章>/D{N}{a,b}.txt`。

## 审查标准

每关必须同时满足四条（第二轮收紧后的标准）：

1. **包含该关的目标句式**（教学目标，本次一律不动）。
2. **对话的因果/物理链条符合人之常情**——父子真演能演得顺，不能只为凑句式硬编动作。
3. **场景自然、不依赖道具**——用日常会出现的场景，不要靠一堆特定道具才成立；能靠对话本身演绎。
4. **符合爸爸+儿子的对话口吻**——动作要是一个爸爸对 4 岁孩子会做的事（比如把孩子托起来，而不是叫他自己搬凳子爬）。

> 第二轮发现第一轮的 03-D2 修正仍不达标：把卡点挪到「领口高处」后，拉链在孩子自己穿的夹克上——**孩子够不着自己的领口、凳子也帮不上够自己身上的东西**，`I can't reach` 对自身衣物根本不成立。第二轮改成夹克挂在门边高挂钩上（够不着成立）+ 爸爸把孩子托起来（不依赖凳子道具）。详见下文 03-D2 条目。

## 审查方法

- 逐关通读 03~10 共 8 份 `dialogues.md`。
- 并行通读 46 份提示词 `.txt`，重点看 `Setting` 与 `Action` 段的舞台动作是否有物理/空间上的矛盾——提示词的动作描述会直接喂给 Sora，错了就生成不合逻辑的画面。

## 发现并修正的问题

### 1. 03-asking-help / D2「卡住了」—— 因果链断裂 +「够不着」对自身衣物不成立 【改对话 + 两段提示词，两轮修正】

**原问题（两处，第二轮又挖出更深的一处）：**
- 原版卡住真因是「布料夹进拉链」，前半段却花在「够不着底部 → 站凳子」这条身高支线上，与真因无关，是干扰项；且方向反了——要够的是拉链「底部」（低处），站凳子是够高处，站上去反而离底部更远。
- **第一轮修正（不达标）**：把卡点挪到领口高处。但这仍有更深漏洞：**拉链在孩子自己穿的夹克上，挂钩/拉链在孩子自己身上，站凳子并不能让他「够到自己的领口」**——凳子只帮够外部物体，不帮够自己身上的东西。`I can't reach` 对「自己身上的拉链」根本不成立，且叫 4 岁孩子自己搬凳子爬也不符合爸爸会对孩子做的事。

**最终修正思路（第二轮）：** 把夹克从「穿在身上」改成**挂在门边的高挂钩上**——挂钩在成人高度，4 岁孩子确实够不着，`I can't reach` 这才名副其实。**去掉 step stool 道具**，改成**爸爸把孩子托起来**（爸爸天天做的事，最合人之常情，且不依赖道具）。托起后孩子凑近才看清：拉链挂在了挂钩上。因果链：卡住（拿不下来）→ 够不着看 → 爸爸托起 → 看清拉链挂住 → 弄下来 → 解决。场景只有门边 + 挂钩 + 夹克（家家户户都有），靠对话就能演。两个目标句式 `It's stuck` / `I can't reach ___` 都保留且都真实。

**改后对话：**
- C: It's stuck, Dad — my jacket won't come off the hook.
- F: What's caught up there?
- C: I can't reach it — the hook is too high for me to see.
- F: Here, let me lift you up so you can look.
- C: Oh! The zipper is caught on the hook.
- F: Lift the jacket up a little, and pull it off. There, it's free!
- C: I got it, thanks Dad.
- F: You're welcome. Zippers can be sneaky sometimes.

提示词 `D2a.txt` / `D2b.txt` 的 Setting 改为「a jacket hanging on a high wall hook」，动作改为 reaches up / dad lifts the cub up to the hook（**无 step stool**）。

### 2. 04-where-locating / D2「忘了放哪」—— 让 4 岁孩子独自去车里 + 捎爸爸的水壶 【改对话 + D2b 提示词】

**原问题：**
- 孩子说「I will go out and check the car」，爸爸还追加「While you're there, can you bring mine too?」——让 4 岁孩子独自去停着的车里找东西，还顺带拎两个水壶。监护与安全上都不合常理，roleplay 时「爸爸」这个角色会很别扭。

**修正思路：** 改成父子一起去（「Can we go out and check the car together?」/「let's both go look for it」），把「帮爸爸捎东西」从「爸爸委派孩子独力搬运」改成「孩子主动提出帮忙找」。目标句式 `Where did I put ___?` / `Did you see ___?` 都在前半段，未动。

**改后（后三句）：**
- C: Can we go out and check the car together?
- F: Good idea, let's both go look for it.
- C: Maybe I can help you find yours too.

提示词 `D2b.txt` 的 Action 同步重写（`D2a.txt` 未动——它只覆盖前三句未改台词）。

### 3. 10-planning-predicting / D2「预测下雨」—— Setting 与台词直接打架 【只改两段提示词】

**原问题：**
- 两段提示词的 Setting 都写「the sky turning gray」，但 D2a 里爸爸台词说「the sky is completely clear right now」——画面要变灰，台词却说全晴，自相矛盾。Sora 生成时无论画成灰还是晴都会和另一半矛盾。且 D2b 里天已 visibly 变灰，爸爸却还一直将信将疑，动机不足。

**修正思路：** 对话本身没问题（孩子凭嗅觉在视觉征兆出现前预测下雨，爸爸从质疑到半信），问题只在 Setting。把 D2a Setting 改成「a clear blue sky outside」（让「completely clear」成立）；D2b Setting 改成「the sky still mostly clear with a faint gray smudge low on the horizon」（远处刚泛起一点灰，给爸爸 D2b 的「maybe you are right」一个视觉动机）。两段天空由晴→远处微灰，也正好暗示孩子的预测可能应验，叙事更顺。**对话未动，meta.json 无需同步。**

### 4. 09-reporting-others / D2a —— 室内「points at the sky」措辞歧义 【只改提示词措辞】

**原问题：** 厨房场景里写「The dad points at the sky」，但人在室内，指的是画里的天空。字面会让动画师画成爸爸指向真实天空/天花板，不合逻辑。

**修正：** 改为「points at the sky **in the drawing**」。

### 5. 06-feelings-preferences / D3b ——「hugs the banana to his chest」动作别扭 【只改提示词措辞】

**原问题：** 一根香蕉很小，「抱在胸前」像抱玩偶，动作不自然。

**修正：** 改为「clutches the banana close to his chest」（攥在胸前）。

## 审查后判定「无需改动」的关卡

其余 18 关对话逻辑成立、演得顺，未动。几个被 flag 但经判断**保留**的：

- **05 全章 / 08 全章 / 09-D1·D3 / 10-D1·D3 / 03-D1·D3 / 04-D1·D3 / 06-D1·D2 / 07 全章**：因果链自洽，无物理矛盾。
- **06-D2「面包解咸」**：爸爸提议吃面包解咸，被问「真有用吗」时回「不确定，试试看」——这是真实的家长式 hedging，符合生活，**不算逻辑错误**，保留。
- **07 全章（推理偏超前）**：这是「讲道理」章，孩子推理略超前是该章的教学设定，非逻辑 bug；爸爸对 4 岁孩子用「famous last words」等成人化措辞也属真实亲子口吻，保留。
- **07-D3a 的 paws/toes 用词不一致**：纯措辞小事，不影响 roleplay，保留。

## 改动文件清单

**对话源（2）：**
- `content/03-asking-help/dialogues.md`（D2）
- `content/04-where-locating/dialogues.md`（D2）

**视频提示词（7）：**
- `prompts/03-asking-help/D2a.txt`、`D2b.txt`
- `prompts/04-where-locating/D2b.txt`
- `prompts/10-planning-predicting/D2a.txt`、`D2b.txt`
- `prompts/09-reporting-others/D2a.txt`
- `prompts/06-feelings-preferences/D3b.txt`

**meta.json（2，scaffold 自动同步）：**
- `content/03-asking-help/02-its-stuck/meta.json`
- `content/04-where-locating/02-where-did-i/meta.json`

> 注：`scaffold_levels.py` 对所有 23 个未激活关卡重写了 meta.json，但只有上述 2 个产生**内容**变化（其余 21 个因 dialogues.md 未改、内容完全一致；`git status` 里看到的 `M` 仅为 Windows CRLF 行尾标记，非内容差异，未纳入提交）。

## 未碰的边界

- 已生成 demo 的 7 关（01 全章、02 全章、03-D1）一律未动——改了就要重做视频。
- 未引入构建工具/依赖；未改状态机、路由、前端逻辑。
- 视频文件不入库（gitignore），本次只动文案与提示词。

## 验证建议

合并前可手动起服务，点开 `03-asking-help/02-its-stuck` 与 `04-where-locating/02-where-did-i` 详情页，确认对话显示为新版；其余未改关卡的详情页应无变化。

---

## 落地记录（2026-08-30，main 分支）

本审查 8-16 完成后合入了 `master`，但 8-21 起日常开发切到 `main`，修正一直留在 master/fix 分支上没跟过去。8-30 将其落到 main：

- **直接搬运（无漂移，逐字应用）**：03-D2 / 04-D2 的 `dialogues.md`、两个 `meta.json`、`prompts/03-asking-help/D2a.txt`+`D2b.txt`、`prompts/04-where-locating/D2b.txt`。03-02 标题随之变化（"the zipper won't move" → "my jacket won't come off the hook"），`demo/INDEX.md` 与 `demo/PROGRESS.md` 已同步。
- **无法直接搬运、在新版上重打**：05–10 的提示词在 8-28 被整体重写（commit 8cbf4f4），本审查基于旧文案的三个提示词修正里——
  - 10-D2 天空矛盾：问题在重写版里**复现**（Setting "the sky turning gray" vs 台词 "the sky is all blue right now"），已按同一思路重修（a 段 Setting 改晴空；b 段改 "mostly clear with a faint gray smudge low on the horizon"）。
  - 06-D3b "hugs the banana"：措辞在重写版里**保留**，已改 "clutches the banana close"。
  - 09-D2a "points at the sky"：重写版已写成 "points at his picture"，问题**不存在**，无需处理。
- **视频现状**：03-02 的 demo 是 8-16 在修正合入 master 之后生成的，画面即修正版（夹克挂高挂钩 + 爸爸托起）——本次文字落地后视频与台词**恢复同步**。04-02 的 demo 生成于 8-26（main 时期），按时间线疑似旧版画面（孩子独自去车里），需人工核验；若为旧版，用 `tools/test_pipeline.py` 重做即可。
- **master 分支处置**：其上的修正已全部落地 main，master 自 8-21 起本就停更，可不再维护（留着亦无害）。
