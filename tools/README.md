# tools/ — 脚本

| 脚本 | 作用 |
| --- | --- |
| `scaffold_levels.py` | 从 `content/<章>/dialogues.md` 解析 D1/D2/D3，写出各关 `meta.json`。不覆盖已激活的关（`demo/` 里已有 `demo.mp4` 的关跳过）。 |
| `validate_curriculum.py` | 校验新版分年龄课程的结构、对话长度、角色比例、审查门槛和 Conversation Move 复现情况。 |

## 用法

```bash
python tools/scaffold_levels.py
```

在仓库根运行。详见脚本顶部注释。

## 新版课程校验

```bash
python tools/validate_curriculum.py --stage 04
python tools/validate_curriculum.py --stage 04 --complete
```

第一条用于增量创作：章节和课程尚未写满不会报错。第二条是视频生产前的发布门槛，会要求达到 `stage.json` 声明的章节数、课程数和家庭对话比例。
