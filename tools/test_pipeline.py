"""End-to-end test: generate demo for 04-where-locating/01-wheres via CogVideoX-Flash.

Reads D1a.txt + D1b.txt, calls Zhipu API for each, downloads two 5s clips,
concatenates them into demo.mp4, writes to demo tree, then verifies scanner
detects it.
"""
import json
import os
import time
import urllib.request
import urllib.error
from pathlib import Path

import imageio_ffmpeg
import subprocess

ROOT = Path(__file__).resolve().parent.parent
CHAPTER = "04-where-locating"
LEVEL = "01-wheres"
PROMPTS_DIR = ROOT / "prompts" / CHAPTER
DEMO_TARGET = ROOT / "demo" / CHAPTER / LEVEL / "demo.mp4"
TEMP_DIR = ROOT / "demo" / "_tmp_pipeline_test"

API_BASE = "https://open.bigmodel.cn/api/paas/v4"
MODEL = "cogvideox-flash"


def load_key():
    env = (ROOT / ".env").read_text()
    for line in env.splitlines():
        if line.startswith("ZHIPU_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("ZHIPU_API_KEY not found in .env")


def api_post(path, body, key):
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def api_get(path, key):
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def generate_segment(prompt_text, key, label):
    """Submit a video generation job, poll until done, download the mp4."""
    print(f"  [{label}] Submitting to CogVideoX-Flash...")
    body = {
        "model": MODEL,
        "prompt": prompt_text,
        "size": "1920x1080",
    }
    resp = api_post("/videos/generations", body, key)
    task_id = resp["id"]
    print(f"  [{label}] Task ID: {task_id}, polling...")

    for i in range(72):  # max 6 min
        time.sleep(5)
        data = api_get(f"/async-result/{task_id}", key)
        status = data.get("task_status", "UNKNOWN")
        if i % 4 == 0:
            print(f"  [{label}]   [{i+1}] {status}")
        if status in ("SUCCESS", "FAIL"):
            break

    if status != "SUCCESS":
        raise RuntimeError(f"[{label}] generation failed: {data}")

    video_url = data["video_result"][0]["url"]
    print(f"  [{label}] Downloading from {video_url[:60]}...")

    req = urllib.request.Request(video_url)
    with urllib.request.urlopen(req, timeout=60) as resp:
        video_bytes = resp.read()

    out_path = TEMP_DIR / f"{label}.mp4"
    out_path.write_bytes(video_bytes)
    print(f"  [{label}] Saved: {out_path.name} ({len(video_bytes)/1024/1024:.1f} MB)")
    return out_path


def concat_videos(clips, output_path):
    """Concatenate mp4 clips via ffmpeg (re-encode for safety)."""
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    list_file = TEMP_DIR / "concat_list.txt"
    list_file.write_text("".join(f"file '{c}'\n" for c in clips))

    cmd = [
        ffmpeg, "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(list_file),
        "-c:v", "libx264",
        "-c:a", "aac",
        "-movflags", "+faststart",
        str(output_path),
    ]
    print(f"  [concat] Running ffmpeg re-encode...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [concat] STDERR: {result.stderr[-500:]}")
        raise RuntimeError("ffmpeg concat failed")

    # Verify output
    probe = subprocess.run([ffmpeg, "-i", str(output_path)], capture_output=True, text=True)
    for line in probe.stderr.splitlines():
        if "Duration" in line or ("Stream" in line and "Video" in line):
            print(f"  [concat] {line.strip()}")
    print(f"  [concat] Output: {output_path} ({output_path.stat().st_size/1024/1024:.1f} MB)")


def main():
    key = load_key()
    print(f"API Key: {key[:8]}...{key[-4:]}")
    print(f"Target: {CHAPTER}/{LEVEL}")
    print()

    # Ensure dirs exist
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    DEMO_TARGET.parent.mkdir(parents=True, exist_ok=True)

    # Read prompts
    prompt_a = (PROMPTS_DIR / "D1a.txt").read_text().strip()
    prompt_b = (PROMPTS_DIR / "D1b.txt").read_text().strip()
    print(f"Prompt A: {len(prompt_a)} chars")
    print(f"Prompt B: {len(prompt_b)} chars")
    print()

    # Generate both segments
    print("=== Generating segment A ===")
    clip_a = generate_segment(prompt_a, key, "a")
    print()

    print("=== Generating segment B ===")
    clip_b = generate_segment(prompt_b, key, "b")
    print()

    # Concatenate
    print("=== Concatenating A + B ===")
    concat_videos([clip_a, clip_b], DEMO_TARGET)
    print()

    # Verify scanner detection
    print("=== Verifying scanner detection ===")
    import sys
    sys.path.insert(0, str(ROOT / "app"))
    from scanner import scan_library

    content_root = ROOT / "content"
    demo_root = ROOT / "demo"
    recordings_root = ROOT / "recordings"

    chapters = scan_library(content_root, demo_root, recordings_root)
    for ch in chapters:
        if ch["chapter"] == CHAPTER:
            for lv in ch["levels"]:
                if lv["level"] == LEVEL:
                    print(f"  has_demo: {lv['has_demo']}")
                    print(f"  has_performance: {lv['has_performance']}")
                    if lv["has_demo"]:
                        print(f"  ✅ SCANNER DETECTED THE NEW DEMO!")
                    else:
                        print(f"  ❌ Scanner did NOT detect the demo")
                    break

    print()
    print("=== DONE ===")
    print(f"Demo file: {DEMO_TARGET}")
    print(f"Size: {DEMO_TARGET.stat().st_size/1024/1024:.1f} MB")

    # Cleanup temp
    import shutil
    shutil.rmtree(TEMP_DIR)
    print(f"Temp dir cleaned: {TEMP_DIR}")


if __name__ == "__main__":
    main()
