#!/usr/bin/env python3
"""Copy Cursor-generated stills into raw/, then ensure_transparent into published/."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

SRC = Path(sys.argv[1])
ROOT = Path(sys.argv[2])
SCRIPT = Path(sys.argv[3])

FILES = [
    ("pets", "pet-garden-egg.png", "GARDEN_PET_EGG", "阳光蛋"),
    ("pets", "pet-garden-sprout.png", "GARDEN_PET_SPROUT", "小芽"),
    ("pets", "pet-garden-sunflower.png", "GARDEN_PET_GROWTH", "向日葵"),
    ("pets", "pet-garden-evolved.png", "GARDEN_PET_EVOLVED", "太阳花"),
    ("pets", "pet-voxel-egg.png", "VOXEL_PET_EGG", "方块蛋"),
    ("pets", "pet-voxel-cub.png", "VOXEL_PET_CUB", "小矿工"),
    ("pets", "pet-voxel-growth.png", "VOXEL_PET_GROWTH", "成长矿工"),
    ("pets", "pet-voxel-evolved.png", "VOXEL_PET_EVOLVED", "进化矿工"),
    ("pets", "pet-platform-egg.png", "PLATFORM_PET_EGG", "探险蛋"),
    ("pets", "pet-platform-cub.png", "PLATFORM_PET_CUB", "蘑菇幼崽"),
    ("pets", "pet-platform-growth.png", "PLATFORM_PET_GROWTH", "伙伴恐龙"),
    ("pets", "pet-platform-evolved.png", "PLATFORM_PET_EVOLVED", "探险家"),
    ("badges", "badge-garden-bronze.png", "GARDEN_BRONZE", "花园新秀"),
    ("badges", "badge-garden-silver.png", "GARDEN_SILVER", "花园园丁"),
    ("badges", "badge-garden-gold.png", "GARDEN_GOLD", "花园大师"),
    ("badges", "badge-map-bronze.png", "MAP_BRONZE", "小探险家"),
    ("badges", "badge-map-silver.png", "MAP_SILVER", "探险先锋"),
    ("badges", "badge-map-gold.png", "MAP_GOLD", "大冒险家"),
    ("badges", "badge-builder-bronze.png", "BUILDER_BRONZE", "小镇居民"),
    ("badges", "badge-builder-silver.png", "BUILDER_SILVER", "小镇工匠"),
    ("badges", "badge-builder-gold.png", "BUILDER_GOLD", "镇长"),
    ("badges", "badge-unified-silver.png", "UNIFIED_SILVER", "三域行者"),
    ("badges", "badge-unified-gold.png", "UNIFIED_GOLD", "全能大师"),
]


def main() -> None:
    reports = []
    missing = []
    for pack, name, asset_id, label in FILES:
        src = SRC / name
        if not src.is_file():
            missing.append(str(src))
            continue
        raw_dir = ROOT / pack / "raw"
        pub_dir = ROOT / pack / "published"
        raw_dir.mkdir(parents=True, exist_ok=True)
        pub_dir.mkdir(parents=True, exist_ok=True)
        raw = raw_dir / name
        pub = pub_dir / name
        shutil.copy2(src, raw)
        proc = subprocess.run(
            [sys.executable, str(SCRIPT), str(raw), str(pub), "--json"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if proc.returncode != 0:
            reports.append(
                {
                    "id": asset_id,
                    "file": name,
                    "error": proc.stderr or proc.stdout,
                }
            )
            continue
        info = json.loads(proc.stdout)
        info["id"] = asset_id
        info["label"] = label
        info["pack"] = pack
        info["file"] = name
        reports.append(info)

    out = ROOT / "batch_report.json"
    payload = {"missing": missing, "reports": reports}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"wrote": str(out), "n": len(reports), "missing": len(missing)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
