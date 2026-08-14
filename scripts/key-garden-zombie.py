# -*- coding: utf-8 -*-
"""Magenta-dominance chroma key for garden-defense zombie v4 batch.

Usage:
    python scripts/key-garden-zombie.py [--flip] <name> [<name> ...]

读取 prj/assets/generated/garden-zombie-v4/raw/<name>.png，按“品红占优”抠底
（R>140 且 B>140 且 R>G+60 且 B>G+60），边缘羽化 + 去品红边，按内容包围盒裁切，
放到 512x640 画布（底部 8px）发布到两个消费方目录：
- prj/games/garden-defense/assets/zombies/（独立游戏 + 展示柜）
- prj/assets/generated/preschool-pvz-2d/published/（工作台嵌入版 app.js 加载）
僵尸皮肤为绿色、服装避开品红，先验证中心块误抠 <2% 再执行。
--flip 会在抠底后水平翻转（用于把朝向统一为面朝左）。
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "prj" / "assets" / "generated" / "garden-zombie-v4" / "raw"
PUBS = [
    ROOT / "prj" / "games" / "garden-defense" / "assets" / "zombies",
    ROOT / "prj" / "assets" / "generated" / "preschool-pvz-2d" / "published",
]
CANVAS = (512, 640)


def key_magenta(img: Image.Image) -> Image.Image:
    rgb = np.array(img.convert("RGB")).astype(int)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mask = (r > 140) & (b > 140) & (r > g + 60) & (b > g + 60)  # True = background

    h, w = mask.shape
    cy, cx = h // 2, w // 2
    s = 120
    center = mask[cy - s // 2:cy + s // 2, cx - s // 2:cx + s // 2]
    if 0 < center.mean() and center.mean() > 0.02:
        raise SystemExit(f"中心角色块误抠 {center.mean():.2%}，中止")

    alpha = Image.fromarray((~mask * 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.0))
    a = np.array(alpha).astype(int)

    # 去品红边：不透明处若品红仍占优，把 R、B 压到 G
    spill = (a > 0) & (r > g) & (b > g)
    rgb[spill, 0] = np.minimum(r, g)[spill]
    rgb[spill, 2] = np.minimum(b, g)[spill]

    out = np.dstack([rgb.astype(np.uint8), a.astype(np.uint8)])
    return Image.fromarray(out, "RGBA")


def crop_subject(img: Image.Image) -> Image.Image:
    arr = np.array(img)
    ys, xs = np.where(arr[:, :, 3] > 16)
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
    args = sys.argv[1:]
    flip = "--flip" in args
    names = [a for a in args if not a.startswith("--")]
    for name in names:
        src = RAW / f"{name}.png"
        keyed = key_magenta(Image.open(src))
        if flip:
            keyed = keyed.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        keyed.save(RAW / f"{name}-key.png")
        aligned = place_on_canvas(crop_subject(keyed))
        a = np.array(aligned)
        ys, xs = np.where(a[:, :, 3] > 16)
        for pub in PUBS:
            dest = pub / f"{name}-v4.png"
            aligned.save(dest)
            print(f"{name}: published {dest} "
                  f"subject {int(xs.max()-xs.min()+1)}x{int(ys.max()-ys.min()+1)} "
                  f"opaque {float((a[:,:,3]>200).mean()):.1%} flip={flip}")


if __name__ == "__main__":
    main()
