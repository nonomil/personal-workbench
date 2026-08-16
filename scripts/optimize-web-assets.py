"""Compress runtime PNG/JPEG in place for Pages and APK. Keep filenames."""
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PRJ = ROOT / "prj"

SKIP_DIR_NAMES = {
    "raw",
    "keyed",
    "split",
    "_backup",
    "ref",
    "visual-tests",
    "papermc",
    "docs",
}
SKIP_PREFIXES = (
    "assets/GPT生图",
    "assets/generated/game-asset-pipeline-smoke",
    "assets/generated/world-rebuild-20260807",
    "assets/generated/blocklegend-mobs-4view",
    "assets/generated/preschool-pvz-skills",
    "assets/vocab/wordquest-vocab-2026.08.15",
    "games/blocklegend/docs",
)
LOCKED_RELATIVE = {
    "games/platform-quest/assets/hero/explorer-idle.png",
    "games/platform-quest/assets/hero/explorer-walk-a.png",
    "games/platform-quest/assets/hero/explorer-walk-b.png",
    "games/platform-quest/assets/hero/explorer-jump.png",
    "games/voxel-adventure/assets/hero/explorer-idle.png",
    "games/voxel-adventure/assets/hero/explorer-walk-a.png",
    "games/voxel-adventure/assets/hero/explorer-walk-b.png",
    "games/voxel-adventure/assets/hero/explorer-jump.png",
    "games/voxel-adventure/assets/hero/explorer-mine.png",
}
PHOTO_MARKERS = ("/sky/", "/bg/", "/background/", "lawn", "hero.png", "page-bg")


def rel_of(path: Path) -> str:
    return path.relative_to(PRJ).as_posix()


def should_skip(path: Path) -> bool:
    rel = rel_of(path)
    if rel in LOCKED_RELATIVE:
        return True
    parts = set(path.parts)
    if parts & SKIP_DIR_NAMES:
        return True
    return any(rel == prefix or rel.startswith(prefix + "/") for prefix in SKIP_PREFIXES)


def max_side_for(rel: str) -> int:
    if any(token in rel for token in ("/sky/", "/bg/", "/background/")):
        return 1600
    if "/vocab/" in rel or "/badges/" in rel or "/pets/" in rel:
        return 640
    return 1024


def is_photoish(rel: str) -> bool:
    return any(marker in rel for marker in PHOTO_MARKERS)


def save_png(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True, compress_level=9)
    return buf.getvalue()


def optimize_image(path: Path) -> dict | None:
    rel = rel_of(path)
    before = path.stat().st_size
    try:
        image = Image.open(path)
        image.load()
    except Exception as error:
        return {"path": rel, "error": str(error)}

    max_side = max_side_for(rel)
    work = image
    if max(work.size) > max_side:
        work = work.copy()
        work.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    candidates = [save_png(work)]
    if not is_photoish(rel) and work.mode in {"RGB", "RGBA", "P"}:
        try:
            quantized = work.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
            candidates.append(save_png(quantized))
        except Exception:
            pass

    best = min(candidates, key=len)
    width, height = work.size
    image.close()
    if work is not image:
        try:
            work.close()
        except Exception:
            pass
    if len(best) >= int(before * 0.95):
        return None
    tmp = path.with_name(path.name + ".tmpopt")
    try:
        tmp.write_bytes(best)
        tmp.replace(path)
    except OSError as error:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
        return {"path": rel, "error": str(error)}
    return {
        "path": rel,
        "before": before,
        "after": len(best),
        "saved": before - len(best),
        "size": [width, height],
    }


def main() -> int:
    changed = []
    scanned = 0
    for path in PRJ.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        if should_skip(path):
            continue
        scanned += 1
        if scanned % 200 == 0:
            print(f"scanned {scanned} changed {len(changed)}", flush=True)
        result = optimize_image(path)
        if result and "error" not in result:
            changed.append(result)
        elif result and "error" in result:
            print("skip-error", result["path"], result["error"], file=sys.stderr)

    saved = sum(item["saved"] for item in changed)
    report = {
        "scanned": scanned,
        "changed": len(changed),
        "saved_mb": round(saved / 1024 / 1024, 1),
        "files": sorted(changed, key=lambda item: item["saved"], reverse=True)[:40],
    }
    out = ROOT / "tmp" / "optimize-web-assets.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("scanned", "changed", "saved_mb")}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
