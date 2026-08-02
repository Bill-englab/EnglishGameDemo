"""Scaffold level folders + meta.json from each chapter's dialogues.md.

dialogues.md is the single source of truth for the curriculum. This script
parses it and writes one meta.json per dialogue (D1/D2/D3) into a zero-padded
folder, so the map fills with all known levels.

- Folders already containing a demo.mp4 (an "activated" level you hand-made)
  are LEFT UNTOUCHED — your meta is preserved.
- Re-run any time after editing dialogues.md; it only (re)writes meta.json for
  not-yet-activated levels.

Run:  python scaffold_levels.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "roleplay-dialogues"

HEAD = re.compile(r"^##\s*D(\d+)\s*[｜|]\s*(.+?)\s*$", re.M)
TURN = re.compile(r"^>\s*\*\*(F|C):\*\*\s*(.*)$")


def debold(s: str) -> str:
    return s.replace("**", "")


def slugify(pattern: str) -> str:
    s = debold(pattern).replace("___", "").strip()
    s = re.sub(r"[^\w\s-]", "", s)
    words = s.lower().split()
    return "-".join(words[:3]) or "level"


def parse(md: str) -> list[dict]:
    levels = []
    blocks = re.split(r"(?=^##\s*D\d)", md, flags=re.M)
    for blk in blocks:
        m = HEAD.match(blk.strip())
        if not m:
            continue
        n = int(m.group(1))
        title_zh = m.group(2).strip()
        scene = ""
        patterns: list[str] = []
        dialogue: list[dict] = []
        variations = ""
        for line in blk.splitlines():
            ls = line.strip()
            if ls.startswith("**背景"):
                scene = ls.split("**", 2)[-1].lstrip("：:").strip()
            elif ls.startswith("**目标句式"):
                patterns = re.findall(r"`([^`]+)`", ls.split("**", 2)[-1])
            elif ls.startswith("**换样重演"):
                variations = ls.split("**", 2)[-1].lstrip("：:").strip()
            else:
                tm = TURN.match(ls)
                if tm:
                    spk = "Dad" if tm.group(1) == "F" else "Child"
                    dialogue.append({"speaker": spk, "line": debold(tm.group(2).strip())})
        # English title = first Child line (matches the convention of 01-can-i-have)
        title = next((d["line"] for d in dialogue if d["speaker"] == "Child"),
                     dialogue[0]["line"] if dialogue else title_zh)
        primary = patterns[0] if patterns else ""
        levels.append({
            "n": n,
            "slug": slugify(primary) if primary else f"level{n}",
            "meta": {
                "title": title,
                "title_zh": title_zh,
                "scene": scene,
                "patterns": patterns,
                "dialogue": dialogue,
                "variations": variations,
            },
        })
    return levels


def main() -> None:
    written = skipped = 0
    for chapter_dir in sorted(p for p in ROOT.iterdir() if p.is_dir()):
        md_file = chapter_dir / "dialogues.md"
        if not md_file.exists():
            continue
        for lv in parse(md_file.read_text(encoding="utf-8")):
            folder = chapter_dir / f"{lv['n']:02d}-{lv['slug']}"
            folder.mkdir(parents=True, exist_ok=True)
            # never clobber an activated level (one you've added a demo for)
            if (folder / "demo.mp4").exists():
                skipped += 1
                continue
            (folder / "meta.json").write_text(
                json.dumps(lv["meta"], ensure_ascii=False, indent=2),
                encoding="utf-8")
            written += 1
            print(f"  wrote {folder / 'meta.json'}")
    print(f"\nDone. wrote={written} skipped(activated)={skipped}")


if __name__ == "__main__":
    main()
