# -*- coding: utf-8 -*-
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "prj" / "assets" / "generated" / "voxel-paper-mc" / "raw"
PUB = ROOT / "prj" / "games" / "voxel-adventure" / "assets" / "hero"
ENSURE = ROOT / ".cursor" / "skills" / "game-asset-pipeline" / "scripts" / "ensure_transparent.py"
NAMES = ["explorer-idle", "explorer-walk-a", "explorer-walk-b", "explorer-jump", "explorer-mine"]
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
    src_dir = Path(sys.argv[1])
    RAW.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    reports = []
    for name in NAMES:
        src = src_dir / f"{name}.png"
        raw = RAW / f"{name}.png"
        keyed = RAW / f"{name}-key.png"
        shutil.copyfile(src, raw)
        out = subprocess.check_output(
            [sys.executable, str(ENSURE), str(raw), str(keyed), "--json"],
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
