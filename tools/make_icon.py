#!/usr/bin/env python3
"""Generate the app icon (icon.png + favicon.ico) from a source image.

Reads design/icon.png (any size), downsamples it to 128x128, and writes:
    app/static/icon.png       (128x128 PNG)
    app/static/favicon.ico    (single-entry ICO wrapping that PNG -- Vista+)

Uses only the standard library -- no PIL/Pillow, no npm.

Run from the repo root:  python tools/make_icon.py
"""
import os
import struct
import zlib


def read_png_rgb(path):
    """Decode a PNG file and return (width, height, raw_rgb_bytes).
    Supports 8-bit RGB (type 2) and 8-bit RGBA (type 6); returns RGB only.
    Handles multi-IDAT streams and PNG filter types 0-4.
    """
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG file")
    w = struct.unpack(">I", data[16:20])[0]
    h = struct.unpack(">I", data[20:24])[0]
    bit_depth = data[24]
    color_type = data[25]
    if bit_depth != 8:
        raise ValueError("only 8-bit depth supported, got %d" % bit_depth)

    # Collect all IDAT chunks
    idat = b""
    i = 8
    while i < len(data):
        ln = struct.unpack(">I", data[i:i+4])[0]
        typ = data[i+4:i+8]
        if typ == b"IDAT":
            idat += data[i+8:i+8+ln]
        i += 8 + ln + 4

    raw = zlib.decompress(idat)

    # Determine bytes-per-pixel
    if color_type == 2:       # RGB
        bpp = 3
    elif color_type == 6:     # RGBA
        bpp = 4
    elif color_type == 0:     # grayscale
        bpp = 1
    elif color_type == 4:     # grayscale + alpha
        bpp = 2
    else:
        raise ValueError("unsupported color type %d" % color_type)

    stride = w * bpp + 1  # +1 for filter byte per row
    # Un-filter (reverse PNG row filters)
    out = bytearray()
    prev = bytearray(w * bpp)
    for y in range(h):
        filt = raw[y * stride]
        row = bytearray(raw[y * stride + 1: (y + 1) * stride])
        if filt == 0:        # None
            pass
        elif filt == 1:      # Sub
            for x in range(bpp, len(row)):
                row[x] = (row[x] + row[x - bpp]) & 0xFF
        elif filt == 2:      # Up
            for x in range(len(row)):
                row[x] = (row[x] + prev[x]) & 0xFF
        elif filt == 3:      # Average
            for x in range(len(row)):
                a = row[x - bpp] if x >= bpp else 0
                b = prev[x]
                row[x] = (row[x] + (a + b) // 2) & 0xFF
        elif filt == 4:      # Paeth
            for x in range(len(row)):
                a = row[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                if pa <= pb and pa <= pc:
                    pr = a
                elif pb <= pc:
                    pr = b
                else:
                    pr = c
                row[x] = (row[x] + pr) & 0xFF
        out += row
        prev = row

    # Convert to RGB (drop alpha / expand grayscale)
    if bpp == 3:
        return w, h, bytes(out)
    rgb = bytearray(w * h * 3)
    for i in range(w * h):
        if bpp == 4:
            rgb[i*3:i*3+3] = out[i*4:i*4+3]
        elif bpp == 1:
            v = out[i]
            rgb[i*3:i*3+3] = v, v, v
        elif bpp == 2:
            v = out[i*2]
            rgb[i*3:i*3+3] = v, v, v
    return w, h, bytes(rgb)


def downsample(src_w, src_h, src_rgb, out_w, out_h):
    """Nearest-neighbor downsample. Good enough for 2048->128."""
    pixels = bytearray()
    for y in range(out_h):
        pixels.append(0)  # PNG filter: None
        sy = y * src_h // out_h
        for x in range(out_w):
            sx = x * src_w // out_w
            off = (sy * src_w + sx) * 3
            pixels += bytes(src_rgb[off:off+3])
    return bytes(pixels)


def _chunk(typ, data):
    c = struct.pack(">I", len(data)) + typ + data
    crc = zlib.crc32(typ + data) & 0xFFFFFFFF
    return c + struct.pack(">I", crc)


def build_png(w, h, pixels_rgb):
    """Build an 8-bit RGB PNG from raw scanlines (with filter bytes)."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # type 2 = RGB
    idat = zlib.compress(pixels_rgb, 9)
    return sig + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", idat) + _chunk(b"IEND", b"")


def build_ico(png_bytes):
    """Wrap a PNG in a single-entry ICO (PNG-in-ICO, supported Vista+)."""
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII",
                        128, 128, 0, 0, 1, 32,
                        len(png_bytes),
                        6 + 16)
    return header + entry + png_bytes


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.normpath(os.path.join(here, ".."))
    src = os.path.join(repo, "design", "icon.png")
    static_dir = os.path.join(repo, "app", "static")

    if not os.path.exists(src):
        raise SystemExit("source icon not found: %s" % src)

    sw, sh, srgb = read_png_rgb(src)
    print("source: %dx%d" % (sw, sh))

    pixels = downsample(sw, sh, srgb, 128, 128)
    png = build_png(128, 128, pixels)
    ico = build_ico(png)

    png_path = os.path.join(static_dir, "icon.png")
    ico_path = os.path.join(static_dir, "favicon.ico")
    with open(png_path, "wb") as f:
        f.write(png)
    with open(ico_path, "wb") as f:
        f.write(ico)

    print("wrote %s (%d bytes)" % (png_path, len(png)))
    print("wrote %s (%d bytes)" % (ico_path, len(ico)))


if __name__ == "__main__":
    main()
