# Video Prompts — Sora demo-video 生成提示词

为 `content/` 里**每个对话**生成两段开箱即用的 Sora 提示词(**两段式**)。
每个对话拆成 **两段**:`D{1,2,3}a.txt`(前半台词)+ `D{1,2,3}b.txt`(后半台词),各粘进 Sora 单独生成。两段合起来 = 原来的整段台词,一句不少;拆两段是为了让 Sora 念得更慢、更从容(治"一段式说太快")。

## 怎么用

1. 对每个对话,分别打开 `D{1,2,3}a.txt` 和 `D{1,2,3}b.txt` → 各粘进 Sora → 各生成一段。
2. 把两段按 **a → b** 顺序拼成 **`demo.mp4`**,放进 `demo/<章>/<关>/`。两段同编码可直接流拷贝拼接:

```bash
printf "file 'a.mp4'\nfile 'b.mp4'\n" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy demo.mp4
```

> 文件名对齐 `content/<章>/dialogues.md` 的 D1/D2/D3。例:`prompts/01-wants-requests/D1a.txt` + `D1b.txt` ↔ 关卡 `content/01-wants-requests/01-can-i-have/`(标题 "Can I have the apple one?"),拼成的 `demo.mp4` 放进 `demo/01-wants-requests/01-can-i-have/`。

## 角色设定(每份提示都自带,逐字一致,保证角色稳定)

- **爸爸** = 卡通狗(温棕色、大垂耳、橄榄绿 T 恤)
- **孩子** = 卡通小老虎(4 岁、橙底黑条纹、黄 T 恤、粗短 toddler 身形)
- 风格统一:**Pixar 式 3D 卡通 / 暖光 / 粉彩 / 萌系家庭向**;镜头:**锁机中景双人、轻微漂移、16:9**。

## 节奏:两段式 + 慢速(本版核心)

为治"一段式说太快",**每个对话默认拆成两段生成**;两段都自带 **慢速、句间带停顿** 的念白指令,并按各自台词句数给时长:

| 单段台词句数 | 目标时长 |
|---|---|
| 3 句 | 约 10 秒 |
| 4 句 | 约 12 秒 |
| 5 句 | 约 14 秒 |

- 拆法:按台词轮次从中点切,前半进 a、后半进 b(如 7 句 → a 3 句 + b 4 句;8 句 → 4+4;9 句 → 4+5)。
- 关键指令(**两段都有**):`speak slowly and calmly, with natural little pauses between each line — never rushed` + 结尾 `Slow, unhurried dialogue delivery with small pauses`。
> Sora 单条生成有时会卡在 10–12s 上限;真正控制语速的是上面那句"慢速 + 停顿"指令。若某段仍嫌快,把**该段**结尾秒数改大即可——两段各自调,互不影响。
> 若某句 AI 英文发音不地道(娃在学英文),把该段静音、你自己读那两句配上即可。

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
