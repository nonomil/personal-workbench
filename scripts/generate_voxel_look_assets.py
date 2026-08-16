#!/usr/bin/env python3
"""Generate voxel-craft sky and decoration assets via CliproxAPI. Do not print secrets."""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image


JOBS = [
    {
        "id": "sky-forest",
        "kind": "sky",
        "out": "prj/games/voxel-craft/assets/bg/sky-forest.png",
        "prompt": (
            "Children voxel sandbox game sky background, painterly blocky clouds over a dense green forest canopy, "
            "soft daylight, wide landscape, no characters, no buildings, no UI. "
            "No text, no letters, no numbers, no Chinese characters, no logos, no watermark. "
            "Fill the entire square frame, opaque illustration, not a sprite."
        ),
    },
    {
        "id": "sky-desert",
        "kind": "sky",
        "out": "prj/games/voxel-craft/assets/bg/sky-desert.png",
        "prompt": (
            "Children voxel sandbox game sky background, warm amber desert dusk, sand dunes and a huge pale sun, "
            "soft painterly blocky style, wide landscape, no characters, no camels, no UI. "
            "No text, no letters, no numbers, no Chinese characters, no logos, no watermark. "
            "Fill the entire square frame, opaque illustration, not a sprite."
        ),
    },
    {
        "id": "sky-nether",
        "kind": "sky",
        "out": "prj/games/voxel-craft/assets/bg/sky-nether.png",
        "prompt": (
            "Children voxel sandbox game sky background, dark red ember sky over a rocky volcanic waste, "
            "glowing cracks and floating ash, painterly blocky style, no skulls, no gore, no UI. "
            "No text, no letters, no numbers, no Chinese characters, no logos, no watermark. "
            "Fill the entire square frame, opaque illustration, not a sprite."
        ),
    },
    {
        "id": "deco-bush",
        "kind": "deco",
        "out": "prj/games/voxel-craft/assets/deco/deco-bush.png",
        "prompt": (
            "用途：透明背景图片素材\n"
            "主体：one small cute voxel shrub, rounded leafy bush, children's game prop\n"
            "尺寸/构图：适配 1024x1024，主体完整，四周留安全边距\n"
            "风格：中性儿童体素游戏素材\n"
            "材质：soft painted voxel leaves\n"
            "透明要求：主体以外必须可去背；背景使用纯色 #00ff00 chroma-key\n"
            "限制：无投影、无地面、无背景纹理、无水印、无文字，主体中不要出现 #00ff00"
        ),
    },
    {
        "id": "deco-cactus",
        "kind": "deco",
        "out": "prj/games/voxel-craft/assets/deco/deco-cactus.png",
        "prompt": (
            "用途：透明背景图片素材\n"
            "主体：one small cute voxel cactus with two arms, children's desert game prop\n"
            "尺寸/构图：适配 1024x1024，主体完整，四周留安全边距\n"
            "风格：中性儿童体素游戏素材\n"
            "材质：soft painted voxel cactus\n"
            "透明要求：主体以外必须可去背；背景使用纯色 #00ff00 chroma-key\n"
            "限制：无投影、无地面、无背景纹理、无水印、无文字，主体中不要出现 #00ff00"
        ),
    },
    {
        "id": "deco-ember",
        "kind": "deco",
        "out": "prj/games/voxel-craft/assets/deco/deco-ember.png",
        "prompt": (
            "用途：透明背景图片素材\n"
            "主体：one small cute voxel ember cluster, glowing orange rocks and tiny flame, children's game prop\n"
            "尺寸/构图：适配 1024x1024，主体完整，四周留安全边距\n"
            "风格：中性儿童体素游戏素材\n"
            "材质：soft painted voxel fire rocks\n"
            "透明要求：主体以外必须可去背；背景使用纯色 #00ff00 chroma-key\n"
            "限制：无投影、无地面、无背景纹理、无水印、无文字，主体中不要出现 #00ff00"
        ),
    },
]


def load_env(path: Path) -> None:
    text = path.read_text(encoding="utf-8-sig")
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip())


def chroma_key_green(src: Path, dest: Path) -> None:
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if g >= 140 and g > r + 35 and g > b + 35:
                pixels[x, y] = (r, g, b, 0)
    img.save(dest, "PNG")


def generate_one(base: str, key: str, prompt: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    raw = dest.with_name(dest.stem + ".raw.bin")
    payload = json.dumps({
        "model": "gpt-image-2",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json",
    }).encode("utf-8")
    req = urllib.request.Request(
        base.rstrip("/") + "/images/generations",
        data=payload,
        headers={
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError("HTTP %s for %s: %s" % (err.code, dest.name, detail)) from err
    if body.get("error"):
        raise RuntimeError("API error for %s: %s" % (dest.name, body["error"]))
    data = ((body.get("data") or [{}])[0] or {}).get("b64_json")
    if not data:
        raise RuntimeError("missing b64_json for %s" % dest.name)
    raw.write_bytes(base64.b64decode(data))
    img = Image.open(raw)
    img.save(dest.with_name(dest.stem + ".src.png"))
    return dest.with_name(dest.stem + ".src.png")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", required=True)
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    load_env(Path(args.env_file))
    base = os.environ.get("CLIPROX_API_BASE", "").strip()
    key = os.environ.get("CLIPROX_API_KEY", "").strip()
    if not base or not key:
        print("missing CLIPROX_API_BASE or CLIPROX_API_KEY", file=sys.stderr)
        return 2
    wanted = {item.strip() for item in args.only.split(",") if item.strip()}
    jobs = [job for job in JOBS if not wanted or job["id"] in wanted]
    print("jobs", len(jobs), "base-host-ok", bool(base))
    for job in jobs:
        dest = Path(job["out"])
        print("generate", job["id"])
        src = generate_one(base, key, job["prompt"], dest)
        if job["kind"] == "deco":
            chroma_key_green(src, dest)
        else:
            Image.open(src).convert("RGB").save(dest, "PNG")
        print("wrote", dest, dest.stat().st_size)
        time.sleep(1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
