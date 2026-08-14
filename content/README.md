# content/ — 课程文案库

这里是「章 → 关」课程的**文案真相源**，入库跟踪。视频不在这里（见 `../demo/` 和 `../recordings/`）。

## 结构

```
content/
  01-wants-requests/            ← 章（10 个，零填充前缀）
    dialogues.md                ← 本章对话源（scaffold_levels.py 的输入）
    01-can-i-have/              ← 关（每章 3 个）
      meta.json                 ← 关卡文案
    02-i-need/
      meta.json
    03-can-we/
      meta.json
  02-refusing-bargaining/ … 10-planning-predicting/
```

## meta.json

每关一个 `meta.json`，字段：

| 字段 | 说明 |
| --- | --- |
| `title` | 英文标题（详情页显示） |
| `title_zh` | 中文标题（仅备课参考，前端不显示） |
| `scene` | 场景描述 |
| `patterns` | 目标句式数组 |
| `dialogue` | 对话数组，每项 `{speaker: "Dad"\|"Child", line}` |
| `variations` | 换样重演提示 |

字段缺失有默认（空串/空数组）；除 `title` 外都可选。

## 怎么生成 / 更新

1. 编辑 `<章>/dialogues.md`（D1/D2/D3，格式见 `01-wants-requests/dialogues.md`）。
2. 在仓库根跑 `python tools/scaffold_levels.py` —— 解析 dialogues.md，写出各关 `meta.json`。
   - **不会覆盖已激活的关**（`demo/<章>/<关>/demo.mp4` 已存在的关跳过，保护手改）。
3. `meta.json` 也可手改；手改后若重跑 scaffold，未激活的关会被覆盖。

## 十章主题

wants-requests · refusing-bargaining · asking-help · where-locating · why-how-come · feelings-preferences · reasoning · recounting-day · reporting-others · planning-predicting

文件夹名必须零填充前缀（`01-`…`10-`），字符串排序即闯关顺序。
