#!/usr/bin/env python3
"""Remove solid-ish sprite backgrounds via corner flood-fill + color distance."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def color_dist(a, b) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def sample_corners(pixels, w: int, h: int, pad: int = 6):
    samples = []
    coords = [
        (pad, pad), (w // 2, pad), (w - 1 - pad, pad),
        (pad, h // 2), (w - 1 - pad, h // 2),
        (pad, h - 1 - pad), (w // 2, h - 1 - pad), (w - 1 - pad, h - 1 - pad),
    ]
    for x, y in coords:
        r, g, b, a = pixels[x, y]
        if a > 0:
            samples.append((r, g, b))
    if not samples:
        return (200, 40, 160)
    # median-ish average of corner samples
    rs = sorted(s[0] for s in samples)
    gs = sorted(s[1] for s in samples)
    bs = sorted(s[2] for s in samples)
    mid = len(samples) // 2
    return (rs[mid], gs[mid], bs[mid])


def flood_key(rgba: Image.Image, threshold: float = 55.0) -> Image.Image:
    img = rgba.convert("RGBA")
    w, h = img.size
    pixels = img.load()
    key = sample_corners(pixels, w, h)
    visited = [[False] * w for _ in range(h)]
    q = deque()

    def try_seed(x: int, y: int):
        if 0 <= x < w and 0 <= y < h and not visited[y][x]:
            r, g, b, a = pixels[x, y]
            if a > 0 and color_dist((r, g, b), key) <= threshold * 1.2:
                visited[y][x] = True
                q.append((x, y))

    # seed entire border
    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = pixels[x, y]
        # mark transparent
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or visited[ny][nx]:
                continue
            nr, ng, nb, na = pixels[nx, ny]
            if na == 0:
                visited[ny][nx] = True
                continue
            d = color_dist((nr, ng, nb), key)
            # also compare to local parent color for soft gradients
            d2 = color_dist((nr, ng, nb), (r, g, b))
            if d <= threshold or (d <= threshold * 1.35 and d2 <= 28):
                visited[ny][nx] = True
                q.append((nx, ny))

    # second pass: kill residual near-key freckles not connected (optional light)
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            # classic magenta / pink leftover
            if r >= 150 and b >= 130 and g <= 130 and color_dist((r, g, b), key) <= threshold * 1.1:
                # only if near already transparent neighbor
                near = False
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and pixels[nx, ny][3] == 0:
                        near = True
                        break
                if near:
                    pixels[x, y] = (0, 0, 0, 0)

    bbox = img.getbbox()
    if bbox:
        pad = 6
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(w, bbox[2] + pad)
        bottom = min(h, bbox[3] + pad)
        img = img.crop((left, top, right, bottom))
    return img


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--threshold", type=float, default=58.0)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    count = 0
    for source in sorted(args.input.rglob("*.png")):
        rel = source.relative_to(args.input)
        if "keyed" in rel.parts:
            continue
        out_path = args.out / rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        image = Image.open(source)
        if image.width > image.height * 1.3 and image.width >= 800:
            image.convert("RGBA").save(out_path, "PNG")
            print(f"bg-copy: {rel}")
            count += 1
            continue
        keyed = flood_key(image, threshold=args.threshold)
        keyed.save(out_path, "PNG")
        print(f"keyed: {rel} -> {keyed.size}")
        count += 1
    print(f"done: {count} files -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
