# Video Prompts — Sora demo-video 生成提示词

为 `roleplay-dialogues/` 里**每个对话**生成开箱即用的 Sora 提示词。
每个对话拆成 **a / b 两段**(各 3–5 句台词、约 8 秒,节奏从容),按 `a → b` 顺序生成后拼接,就是该关的 `demo.mp4`。

## 怎么用

1. 打开对应对话的 `D_a.txt` → 全选复制粘进 Sora → 生成;再开 `D_b.txt` 同样生成。
2. 两段按 a → b 顺序拼起来(剪映/CapCut 首尾相接),导出即 `demo.mp4`,放进 `roleplay-dialogues/<章>/<关>/`。

> 文件名约定:每个对话 = `D1` / `D2` / `D3`(对齐 `dialogues.md`),各自拆成 `D1a` + `D1b` 两个文件。字母 a/b 同时就是**生成与拼接顺序**。例:`01-wants-requests/D1a.txt` + `D1b.txt`。

## 角色设定(每份提示都自带,逐字一致,保证角色稳定)

- **爸爸** = 卡通狗(温棕色、大垂耳、橄榄绿 T 恤)
- **孩子** = 卡通小老虎(4 岁、橙底黑条纹、黄 T 恤、粗短 toddler 身形)
- 风格统一:**Pixar 式 3D 卡通 / 暖光 / 粉彩 / 萌系家庭向**;镜头:**锁机中景双人、轻微漂移、16:9、每段约 8 秒**。

> 若某句 AI 英文发音不地道(娃在学英文),把该段静音、你自己读那两句配上即可。
> 每段控制在 3–5 句,语速才不赶;若想再慢,把结尾 `about 8 seconds` 改大。

## 索引

| 章 | 对话 | 标题 | 目标句式 |
|---|---|---|---|
| 01 wants-requests | D1 | 想要某样东西 | `Can I have ___?` / `I want ___` |
| | D2 | 表达需要 | `I need ___` / `Can I ___?` |
| | D3 | 想做某事 | `Can we ___?` / `I want to ___` |
| 02 refusing-bargaining | D1 | 不想现在做 | `I don't want to ___` / `not yet` |
| | D2 | 讲条件 | `What if ___?` / `just one more ___` |
| | D3 | 婉拒 / 偏好 | `I'd rather ___` / `not now` |
| 03 asking-help | D1 | 请帮忙 | `Can you help me ___?` / `I can't ___` |
| | D2 | 卡住了 | `It's stuck` / `I can't reach ___` |
| | D3 | 自己来 | `Let me try` / `I can do it ___` |
| 04 where-locating | D1 | 找东西 | `Where's ___?` / `I can't find ___` |
| | D2 | 忘了放哪 | `Where did I put ___?` / `Did you see ___?` |
| | D3 | 位置确认 | `Is ___ in/on ___?` / `It's not ___` |
| 05 why-how-come | D1 | 问规则原因 | `Why do I have to ___?` |
| | D2 | 问原因 | `How come ___?` |
| | D3 | 问方法 | `How do you ___?` / `Why does ___?` |
| 06 feelings-preferences | D1 | 说情绪 | `I'm ___` / `because ___` |
| | D2 | 表达不喜欢 | `I don't like ___` / `It's too ___` |
| | D3 | 偏好选择 | `I'd rather ___` / `I like ___ better` |
| 07 reasoning | D1 | 解释选择 | `because ___` / `so ___` |
| | D2 | 解释原因 | `That's why ___` / `so ___` |
| | D3 | 让步 | `even though ___, I still ___` |
| 08 recounting-day | D1 | 复述去了哪 | `I went ___` / `It was ___` |
| | D2 | 复述做了啥 | `We ___` / `and then ___` |
| | D3 | 复述小意外 | `but then ___` / `I didn't ___` |
| 09 reporting-others | D1 | 转述同伴 | `He said ___` |
| | D2 | 转述指令 | `She told me to ___` |
| | D3 | 转述家人 | `Mom said ___` + `but ___` |
| 10 planning-predicting | D1 | 计划 | `We're going to ___` / `after ___` |
| | D2 | 预测 | `It will ___` / `I think ___` |
| | D3 | 安排顺序 | `First ___, then ___` / `as soon as ___` |
