"""Compress demo videos that are larger than 5MB using ffmpeg."""
import os
import subprocess
import sys

# Get ffmpeg path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app", ".venv", "Lib", "site-packages"))
import imageio_ffmpeg
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

DEMO_ROOT = os.path.join(os.path.dirname(__file__), "..", "demo")
THRESHOLD = 5 * 1024 * 1024  # 5MB

def get_size(path):
    return os.path.getsize(path)

def compress_video(src):
    """Compress with H.264, CRF 28, scale to 720p max, keep audio."""
    tmp = src + ".compressed.mp4"
    cmd = [
        FFMPEG, "-y", "-i", src,
        "-c:v", "libx264", "-crf", "28",
        "-preset", "fast",
        "-vf", "scale='min(1280,iw)':-2",
        "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart",
        tmp,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR: {result.stderr[-200:]}")
        if os.path.exists(tmp):
            os.remove(tmp)
        return False
    # Replace original if compressed is smaller
    orig_size = get_size(src)
    new_size = get_size(tmp)
    if new_size < orig_size:
        os.replace(tmp, src)
        print(f"  {orig_size//1048576}MB -> {new_size//1048576}MB")
        return True
    else:
        os.remove(tmp)
        print(f"  Compressed version larger, keeping original")
        return False

def main():
    compressed = 0
    skipped = 0
    for root, dirs, files in os.walk(DEMO_ROOT):
        for f in files:
            if f in ("demo.mp4", "demo.webm"):
                path = os.path.join(root, f)
                size = get_size(path)
                if size > THRESHOLD:
                    mb = size // 1048576
                    print(f"Compressing ({mb}MB): {os.path.relpath(path, DEMO_ROOT)}")
                    if compress_video(path):
                        compressed += 1
                    else:
                        skipped += 1
                else:
                    skipped += 1
    print(f"\nDone: {compressed} compressed, {skipped} skipped")

if __name__ == "__main__":
    main()
