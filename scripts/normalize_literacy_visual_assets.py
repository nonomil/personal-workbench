from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


TARGETS = {
    "literacy-companion-reading": (512, 512),
    "literacy-action-assess": (384, 384),
    "literacy-action-mistakes": (384, 384),
    "literacy-action-profile": (384, 384),
    "literacy-badge-seed": (256, 256),
    "literacy-badge-story": (256, 256),
    "literacy-badge-reading": (256, 256),
    "literacy-badge-fluent": (256, 256),
    "literacy-certificate-corner": (512, 512),
}


def fit_canvas(source: Image.Image, width: int, height: int) -> Image.Image:
    source = source.convert("RGBA")
    scale = min((width * 0.88) / source.width, (height * 0.88) / source.height)
    resized = source.resize(
        (max(1, round(source.width * scale)), max(1, round(source.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    left = (width - resized.width) // 2
    top = (height - resized.height) // 2
    canvas.alpha_composite(resized, (left, top))
    pixels = canvas.load()
    for y in range(canvas.height):
        for x in range(canvas.width):
            red, green, blue, alpha = pixels[x, y]
            green_distance = green - max(red, blue)
            if alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
            elif green > 175 and green_distance > 45:
                pixels[x, y] = (red, green, blue, 0)
    return canvas


def main() -> None:
    root = Path("docs/01-方案/学习项目设计/img/05-识字视觉优化/generated")
    ready = root / "ready"
    ready.mkdir(parents=True, exist_ok=True)
    items: list[dict[str, object]] = []
    for asset_id, (width, height) in TARGETS.items():
        source_path = root / f"{asset_id}.png"
        if not source_path.is_file():
            raise SystemExit(f"missing source asset: {source_path}")
        output_path = ready / source_path.name
        image = fit_canvas(Image.open(source_path), width, height)
        image.save(output_path, format="PNG", optimize=True)
        corners = [
            image.getpixel(point)[3]
            for point in [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
        ]
        if corners != [0, 0, 0, 0]:
            raise SystemExit(f"non-transparent corner in {output_path}: {corners}")
        items.append(
            {
                "id": asset_id,
                "file": output_path.name,
                "source": source_path.as_posix(),
                "width": width,
                "height": height,
                "mode": image.mode,
                "alphaCorners": corners,
            }
        )
        print(f"normalized {output_path.name} {width}x{height}")

    (ready / "manifest.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "subject": "preschool-literacy-uplift",
                "status": "visual-review",
                "sourceManifest": "../manifest.json",
                "items": items,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
