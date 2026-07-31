#!/usr/bin/env python3
"""Clear the safe transparent padding around already-cropped PNG assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--border", type=int, default=3)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    for source in sorted(args.input.glob("*.png")):
        image = Image.open(source).convert("RGBA")
        pixels = image.load()
        border = max(1, min(args.border, min(image.size) // 4))
        for y in range(image.height):
            for x in range(image.width):
                if x < border or y < border or x >= image.width - border or y >= image.height - border:
                    r, g, b, _ = pixels[x, y]
                    pixels[x, y] = (r, g, b, 0)
        image.save(args.out / source.name, "PNG")
        print(f"cleaned: {source.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
