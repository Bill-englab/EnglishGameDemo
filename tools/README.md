# tools/ — 脚本

| 脚本 | 作用 |
| --- | --- |
| `scaffold_levels.py` | 从 `content/<章>/dialogues.md` 解析 D1/D2/D3，写出各关 `meta.json`。不覆盖已激活的关（`demo/` 里已有 `demo.mp4` 的关跳过）。 |

## 用法

```bash
python tools/scaffold_levels.py
```

在仓库根运行。详见脚本顶部注释。
