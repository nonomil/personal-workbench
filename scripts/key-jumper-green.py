# -*- coding: utf-8 -*-
"""Green-dominance chroma key for jumper hero frames (bg has noise/gradient).

Usage:
    python scripts/key-jumper-green.py <name> [<name> ...]

读取 prj/assets/generated/platform-hero/raw/<name>.png，按“绿色占优”判定抠底
（G>140 且 G>R+60 且 G>B+60），边缘羽化 + 去绿边，再按内容包围盒裁切，
放到 256x320 画布（底部 8px），发布到 prj/games/platform-quest/assets/hero/。
角色设定不含绿色，先验证中心块误抠为 0 再执行。
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "prj" / "assets" / "generated" / "platform-hero" / "raw"
PUB = ROOT / "prj" / "games" / "platform-quest" / "assets" / "hero"
CANVAS = (256, 320)


def key_green(img: Image.Image) -> Image.Image:
    rgb = np.array(img.convert("RGB")).astype(int)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mask = (g > 140) & (g > r + 60) & (g > b + 60)  # True = background

    center = mask[452:572, 452:572]
    if center.mean() > 0.02:
        raise SystemExit(f"中心角色块误抠 {center.mean():.2%}，中止")

    # 羽化：mask 模糊 1px 得到柔和 alpha
    alpha = Image.fromarray((~mask * 255).astype(np.uint8), "L")
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.0))
    a = np.array(alpha).astype(int)

    # 去绿边：不透明处若绿色仍占优，把 G 压到 max(R,B)
    spill = (a > 0) & (g > r) & (g > b)
    rgb[spill, 1] = np.maximum(r, b)[spill]

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
    for name in sys.argv[1:]:
        src = RAW / f"{name}.png"
        keyed = key_green(Image.open(src))
        keyed.save(RAW / f"{name}-key.png")
        aligned = place_on_canvas(crop_subject(keyed))
        dest = PUB / f"{name}.png"
        aligned.save(dest)
        a = np.array(aligned)
        ys, xs = np.where(a[:, :, 3] > 16)
        print(f"{name}: published {dest.name} "
              f"subject {int(xs.max()-xs.min()+1)}x{int(ys.max()-ys.min()+1)} "
              f"opaque {float((a[:,:,3]>200).mean()):.1%}")


if __name__ == "__main__":
    main()
