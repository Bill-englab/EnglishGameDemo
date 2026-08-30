# 视频素材进度表 · Video Asset Progress

快照（snapshot）：2026-08-30 ｜ demo 完成 **14 / 30** ｜ 段落 **28 / 60**

## 结构说明 · How it works

- 每个对话需要生成一个 **demo 视频**，由 **两段**（对话前半 + 后半）拼成：
  - 段 1：`prompts/<chapter>/D{N}a.txt` —— 对话前半段
  - 段 2：`prompts/<chapter>/D{N}b.txt` —— 对话后半段
  - 两段生成后拼接成一个 `demo/<chapter>/<dialogue>/demo.mp4`
- `performance.mp4` 是小孩/家长自己录的表演，**不走 AI 生成**，不在本表追踪范围内。
- 图例：`[x]` 已生成　`[ ]` 待生成。两段都 `[x]` = demo 完整。
- 现有 `demo.mp4` 视为两段都已生成（完整）。若某个其实是单段，把段 2 改回 `[ ]`。

---

## 01 · wants-requests（想要 / 请求）

### 01-can-i-have — Can I have the apple one, please? · 想要某样东西
→ `demo/01-wants-requests/01-can-i-have/demo.mp4`
- [x] 段 1 — `prompts/01-wants-requests/D1a.txt`
- [x] 段 2 — `prompts/01-wants-requests/D1b.txt`

### 02-i-need — I need the scissors to cut this paper. · 表达需要
→ `demo/01-wants-requests/02-i-need/demo.mp4`
- [x] 段 1 — `prompts/01-wants-requests/D2a.txt`
- [x] 段 2 — `prompts/01-wants-requests/D2b.txt`

### 03-can-we — Can we go to the park after we finish this? · 想做某事
→ `demo/01-wants-requests/03-can-we/demo.mp4`
- [x] 段 1 — `prompts/01-wants-requests/D3a.txt`
- [x] 段 2 — `prompts/01-wants-requests/D3b.txt`

**01 小计：3 / 3 demo（6 / 6 段）**

---

## 02 · refusing-bargaining（拒绝 / 讲条件）

### 01-i-dont-want — I don't want to go outside yet. · 不想现在做
→ `demo/02-refusing-bargaining/01-i-dont-want/demo.mp4`
- [x] 段 1 — `prompts/02-refusing-bargaining/D1a.txt`
- [x] 段 2 — `prompts/02-refusing-bargaining/D1b.txt`

### 02-what-if — What if I just watch half of the next episode? · 讲条件
→ `demo/02-refusing-bargaining/02-what-if/demo.mp4`
- [x] 段 1 — `prompts/02-refusing-bargaining/D2a.txt`
- [x] 段 2 — `prompts/02-refusing-bargaining/D2b.txt`

### 03-id-rather — I'd rather do it after we eat dinner. · 婉拒 / 偏好
→ `demo/02-refusing-bargaining/03-id-rather/demo.mp4`
- [x] 段 1 — `prompts/02-refusing-bargaining/D3a.txt`
- [x] 段 2 — `prompts/02-refusing-bargaining/D3b.txt`

**02 小计：3 / 3 demo（6 / 6 段）**

---

## 03 · asking-help（请求帮忙）

### 01-can-you-help — Can you help me open this jar? · 请帮忙
→ `demo/03-asking-help/01-can-you-help/demo.mp4`
- [x] 段 1 — `prompts/03-asking-help/D1a.txt`
- [x] 段 2 — `prompts/03-asking-help/D1b.txt`

### 02-its-stuck — It's stuck, Dad — the zipper won't move. · 卡住了
→ `demo/03-asking-help/02-its-stuck/demo.mp4`
- [x] 段 1 — `prompts/03-asking-help/D2a.txt`
- [x] 段 2 — `prompts/03-asking-help/D2b.txt`

### 03-let-me-try — No, let me try it first by myself. · 自己来
→ `demo/03-asking-help/03-let-me-try/demo.mp4`
- [x] 段 1 — `prompts/03-asking-help/D3a.txt`
- [x] 段 2 — `prompts/03-asking-help/D3b.txt`

**03 小计：3 / 3 demo（6 / 6 段）**

---

## 04 · where-locating（位置 / 找东西）

### 01-wheres — Where's my blue sock, Dad? I can't see it. · 找东西
→ `demo/04-where-locating/01-wheres/demo.mp4`
- [x] 段 1 — `prompts/04-where-locating/D1a.txt`
- [x] 段 2 — `prompts/04-where-locating/D1b.txt`

### 02-where-did-i — Where did I put my water bottle? I forgot. · 忘了放哪
→ `demo/04-where-locating/02-where-did-i/demo.mp4`
- [x] 段 1 — `prompts/04-where-locating/D2a.txt`
- [x] 段 2 — `prompts/04-where-locating/D2b.txt`

### 03-is-inon — Is my hat in this bag? · 位置确认
→ `demo/04-where-locating/03-is-inon/demo.mp4`
- [x] 段 1 — `prompts/04-where-locating/D3a.txt`
- [x] 段 2 — `prompts/04-where-locating/D3b.txt`

**04 小计：3 / 3 demo（6 / 6 段）**

---

## 05 · why-how-come（问原因 / 问方法）

### 01-why-do-i — Why do I have to brush them two times? · 问规则原因
→ `demo/05-why-how-come/01-why-do-i/demo.mp4`
- [x] 段 1 — `prompts/05-why-how-come/D1a.txt`
- [x] 段 2 — `prompts/05-why-how-come/D1b.txt`

### 02-how-come — How come we can't have dessert? · 问原因
→ `demo/05-why-how-come/02-how-come/demo.mp4`
- [x] 段 1 — `prompts/05-why-how-come/D2a.txt`
- [x] 段 2 — `prompts/05-why-how-come/D2b.txt`

### 03-how-do-you — How do you know that it's going to rain? · 问方法
→ `demo/05-why-how-come/03-how-do-you/demo.mp4`
- [ ] 段 1 — `prompts/05-why-how-come/D3a.txt`
- [ ] 段 2 — `prompts/05-why-how-come/D3b.txt`

**05 小计：2 / 3 demo（4 / 6 段）**

---

## 06 · feelings-preferences（情绪 / 偏好）

### 01-im — I'm feeling tired because I went to sleep late. · 说情绪
→ `demo/06-feelings-preferences/01-im/demo.mp4`
- [ ] 段 1 — `prompts/06-feelings-preferences/D1a.txt`
- [ ] 段 2 — `prompts/06-feelings-preferences/D1b.txt`

### 02-i-dont-like — I don't like this soup, Dad. · 表达不喜欢
→ `demo/06-feelings-preferences/02-i-dont-like/demo.mp4`
- [ ] 段 1 — `prompts/06-feelings-preferences/D2a.txt`
- [ ] 段 2 — `prompts/06-feelings-preferences/D2b.txt`

### 03-id-rather — I'd rather have the banana, please. · 偏好选择
→ `demo/06-feelings-preferences/03-id-rather/demo.mp4`
- [ ] 段 1 — `prompts/06-feelings-preferences/D3a.txt`
- [ ] 段 2 — `prompts/06-feelings-preferences/D3b.txt`

**06 小计：0 / 3 demo（0 / 6 段）**

---

## 07 · reasoning（推理 / 解释）

### 01-because — Because the chair wobbles, so I moved to the floor. · 解释选择
→ `demo/07-reasoning/01-because/demo.mp4`
- [ ] 段 1 — `prompts/07-reasoning/D1a.txt`
- [ ] 段 2 — `prompts/07-reasoning/D1b.txt`

### 02-thats-why — That's why I brought it — it gets cold at night. · 解释原因
→ `demo/07-reasoning/02-thats-why/demo.mp4`
- [ ] 段 1 — `prompts/07-reasoning/D2a.txt`
- [ ] 段 2 — `prompts/07-reasoning/D2b.txt`

### 03-even-though-i — Even though it was wet outside, I still had lots of fun. · 让步
→ `demo/07-reasoning/03-even-though-i/demo.mp4`
- [ ] 段 1 — `prompts/07-reasoning/D3a.txt`
- [ ] 段 2 — `prompts/07-reasoning/D3b.txt`

**07 小计：0 / 3 demo（0 / 6 段）**

---

## 08 · recounting-day（复述一天）

### 01-i-went — It was good. I went out to her garden. · 复述去了哪
→ `demo/08-recounting-day/01-i-went/demo.mp4`
- [ ] 段 1 — `prompts/08-recounting-day/D1a.txt`
- [ ] 段 2 — `prompts/08-recounting-day/D1b.txt`

### 02-we — We drew lots of monsters, and then we showed them to the teacher. · 复述做了啥
→ `demo/08-recounting-day/02-we/demo.mp4`
- [ ] 段 1 — `prompts/08-recounting-day/D2a.txt`
- [ ] 段 2 — `prompts/08-recounting-day/D2b.txt`

### 03-but-then — I tripped while running at recess, but then I didn't cry. · 复述小意外
→ `demo/08-recounting-day/03-but-then/demo.mp4`
- [ ] 段 1 — `prompts/08-recounting-day/D3a.txt`
- [ ] 段 2 — `prompts/08-recounting-day/D3b.txt`

**08 小计：0 / 3 demo（0 / 6 段）**

---

## 09 · reporting-others（转述他人）

### 01-he-said — He said he is coming over to my house. · 转述同伴
→ `demo/09-reporting-others/01-he-said/demo.mp4`
- [ ] 段 1 — `prompts/09-reporting-others/D1a.txt`
- [ ] 段 2 — `prompts/09-reporting-others/D1b.txt`

### 02-she-told-me — She told me to add some more color to it. · 转述指令
→ `demo/09-reporting-others/02-she-told-me/demo.mp4`
- [ ] 段 1 — `prompts/09-reporting-others/D2a.txt`
- [ ] 段 2 — `prompts/09-reporting-others/D2b.txt`

### 03-mom-said — Mom said dinner is at seven, but I'm already hungry now. · 转述家人
→ `demo/09-reporting-others/03-mom-said/demo.mp4`
- [ ] 段 1 — `prompts/09-reporting-others/D3a.txt`
- [ ] 段 2 — `prompts/09-reporting-others/D3b.txt`

**09 小计：0 / 3 demo（0 / 6 段）**

---

## 10 · planning-predicting（计划 / 预测）

### 01-were-going-to — We're going to the swimming pool, right? · 计划
→ `demo/10-planning-predicting/01-were-going-to/demo.mp4`
- [ ] 段 1 — `prompts/10-planning-predicting/D1a.txt`
- [ ] 段 2 — `prompts/10-planning-predicting/D1b.txt`

### 02-it-will — It will rain today, you know. · 预测
→ `demo/10-planning-predicting/02-it-will/demo.mp4`
- [ ] 段 1 — `prompts/10-planning-predicting/D2a.txt`
- [ ] 段 2 — `prompts/10-planning-predicting/D2b.txt`

### 03-first-then — First we need our shoes, then our water bottles. · 安排顺序
→ `demo/10-planning-predicting/03-first-then/demo.mp4`
- [ ] 段 1 — `prompts/10-planning-predicting/D3a.txt`
- [ ] 段 2 — `prompts/10-planning-predicting/D3b.txt`

**10 小计：0 / 3 demo（0 / 6 段）**

---

## 总计 · Total

**demo 7 / 30**（段落 14 / 60，约 23%）

下一组（按顺序）：`03-asking-help/02-its-stuck` 的 demo —— 段 1 `D2a.txt` + 段 2 `D2b.txt`，生成后拼成 `02-its-stuck/demo.mp4`。
