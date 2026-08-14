#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1])
REPORT = json.loads((ROOT / "batch_report.json").read_text(encoding="utf-8"))

CONSUMER = ["growth-world", "preschool-shell"]

assets = []
for r in REPORT["reports"]:
    rel = f"{r['pack']}/published/{r['file']}"
    assets.append(
        {
            "id": r["id"],
            "name": r["label"],
            "path": rel.replace("\\", "/"),
            "consumer": CONSUMER,
            "license": "project-original",
            "source": "generated-and-reviewed",
            "status": "approved-runtime",
            "width": r["size"][0],
            "height": r["size"][1],
            "alpha_edge_max": r["edge"]["max"],
            "transparent_mode": r["mode"],
        }
    )

defects = [
    "MAP_GOLD is a trophy-with-map, not flag+crown from the SVG spec.",
    "UNIFIED_GOLD is a trophy, not three rings + crown.",
    "PLATFORM_PET_CUB first pass looked too close to Nintendo Toad; v2 attempted.",
    "PLATFORM_PET_EVOLVED red-cap overalls still Mario-adjacent; prefer explorer-idle if replacing.",
    "VOXEL miner stages have mild identity drift (hair/pickaxe).",
    "Badge set is PNG fallback; scheme doc prefers CSS/SVG and HTML overlay for names.",
    "奥特曼 / 宝可梦 theme pets were skipped (no matching mini-game this round).",
]

manifest = {
    "pack": "preschool-badges-pets",
    "version": "v1",
    "notes": "11 achievement badges (no in-image text) + 3 theme pets x 4 stages. Names overlay in HTML.",
    "defects": defects,
    "assets": assets,
}

out = ROOT / "publish_manifest.json"
out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {out} n={len(assets)}")
