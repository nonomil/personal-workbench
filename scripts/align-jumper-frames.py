# -*- coding: utf-8 -*-
"""Align platform-quest jumper hero frames: key -> crop -> 256x320 bottom-aligned.

Usage:
    python scripts/align-jumper-frames.py [src_dir]

src_dir 默认 prj/assets/generated/platform-hero/raw，读取 jumper-*.png，
抠底后按内容包围盒裁切，放到 256x320 画布（底部 8px 边距），
发布到 prj/games/platform-quest/assets/hero/。
"""
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "prj" / "assets" / "generated" / "platform-hero" / "raw"
PUB = ROOT / "prj" / "games" / "platform-quest" / "assets" / "hero"
ENSURE = ROOT / ".cursor" / "skills" / "game-asset-pipeline" / "scripts" / "ensure_transparent.py"
NAMES = ["jumper-idle", "jumper-walk-a", "jumper-walk-b", "jumper-jump"]
CANVAS = (256, 320)


def crop_subject(img: Image.Image) -> Image.Image:
    arr = np.array(img.convert("RGBA"))
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 16)
    if xs.size == 0:
        return img
    pad = 8
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(img.width, int(xs.max()) + pad + 1)
    y1 = min(img.height, int(ys.max()) + pad + 1)
    return img.crop((x0, y0, x1, y1))


def place_on_canvas(img: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    src = img.convert("RGBA")
    scale = min((CANVAS[0] - 16) / src.width, (CANVAS[1] - 24) / src.height)
    nw = max(1, int(src.width * scale))
    nh = max(1, int(src.height * scale))
    src = src.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (CANVAS[0] - nw) // 2
    y = CANVAS[1] - nh - 8
    canvas.paste(src, (x, y), src)
    return canvas


def main() -> None:
    src_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else RAW
    RAW.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    reports = []
    for name in NAMES:
        src = src_dir / f"{name}.png"
        if not src.exists():
            reports.append({"name": name, "error": "missing"})
            continue
        keyed = RAW / f"{name}-key.png"
        out = subprocess.check_output(
            [sys.executable, str(ENSURE), str(src), str(keyed), "--json"],
            text=True,
        )
        reports.append(json.loads(out))
        aligned = place_on_canvas(crop_subject(Image.open(keyed)))
        dest = PUB / f"{name}.png"
        aligned.save(dest)
        reports[-1]["published"] = str(dest)
        reports[-1]["size"] = list(aligned.size)
    print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
