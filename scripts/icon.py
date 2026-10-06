"""Write placeholder app icons: a rounded square on a plain field.

Usage: python3 icon.py [--bg RRGGBB] [--fg RRGGBB] DIR

Writes icon-180.png (the iOS home screen icon) and icon-512.png (the manifest
icon) into DIR. Standard library only.
"""
import argparse
import pathlib
import struct
import zlib

SIZES = (180, 512)


def rgb(text):
    value = text.lstrip("#")
    if len(value) != 6:
        raise argparse.ArgumentTypeError(f"expected RRGGBB, got {text!r}")
    return bytes.fromhex(value)


def chunk(kind, data):
    body = kind + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))


def inside(x, y, size):
    # The square stays within the middle 40%, clear of the corners that
    # Android's maskable icon shapes cut off.
    lo, hi, r = size * 0.3, size * 0.7, size * 0.08
    if not (lo <= x <= hi and lo <= y <= hi):
        return False
    cx = min(max(x, lo + r), hi - r)
    cy = min(max(y, lo + r), hi - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def png(size, bg, fg):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            rows.extend(fg if inside(x + 0.5, y + 0.5, size) else bg)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + chunk(b"IEND", b"")
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--bg", type=rgb, default=rgb("111827"))
    parser.add_argument("--fg", type=rgb, default=rgb("f9fafb"))
    parser.add_argument("dir", type=pathlib.Path)
    args = parser.parse_args()

    for size in SIZES:
        (args.dir / f"icon-{size}.png").write_bytes(png(size, args.bg, args.fg))


if __name__ == "__main__":
    main()
