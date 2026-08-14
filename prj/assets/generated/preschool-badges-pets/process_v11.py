#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

src_dir = Path(sys.argv[1])
root = Path(sys.argv[2])
script = Path(sys.argv[3])

jobs = [
    ("badges", "badge-map-gold.png", "MAP_GOLD", "大冒险家", True),
    ("badges", "badge-unified-gold.png", "UNIFIED_GOLD", "全能大师", True),
    ("pets", "pet-platform-evolved.png", "PLATFORM_PET_EVOLVED", "探险家", True),
    ("pets", "pet-food.png", "PET_FOOD", "饲料", False),
    ("pets", "pet-garden-hungry.png", "GARDEN_PET_HUNGRY", "向日葵饥饿", False),
    ("ui", "icon-pet-feed.png", "ICON_PET_FEED", "喂食按钮", False),
]

reports = []
for pack, name, asset_id, label, backup in jobs:
    src = src_dir / name
    raw_dir = root / pack / "raw"
    pub_dir = root / pack / "published"
    raw_dir.mkdir(parents=True, exist_ok=True)
    pub_dir.mkdir(parents=True, exist_ok=True)
    raw = raw_dir / name
    pub = pub_dir / name
    if backup and pub.is_file():
        shutil.copy2(pub, pub.with_name(pub.stem + "-prev.png"))
    shutil.copy2(src, raw)
    proc = subprocess.run(
        [sys.executable, str(script), str(raw), str(pub), "--json"],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if proc.returncode != 0:
        reports.append({"id": asset_id, "error": proc.stderr or proc.stdout})
        print(asset_id, "FAIL", proc.stderr or proc.stdout)
        continue
    info = json.loads(proc.stdout)
    info.update(id=asset_id, label=label, pack=pack, file=name)
    reports.append(info)
    print(asset_id, info.get("mode"), info.get("edge"))

man_path = root / "publish_manifest.json"
man = json.loads(man_path.read_text(encoding="utf-8"))
by_id = {a["id"]: i for i, a in enumerate(man["assets"])}
for r in reports:
    if "error" in r:
        continue
    entry = {
        "id": r["id"],
        "name": r["label"],
        "path": f"{r['pack']}/published/{r['file']}",
        "consumer": ["growth-world", "preschool-shell"],
        "license": "project-original",
        "source": "generated-and-reviewed",
        "status": "approved-runtime",
        "width": r["size"][0],
        "height": r["size"][1],
        "alpha_edge_max": r["edge"]["max"],
        "transparent_mode": r["mode"],
    }
    if r["id"] in by_id:
        man["assets"][by_id[r["id"]]] = entry
    else:
        man["assets"].append(entry)

man["version"] = "v1.1"
man["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
man["defects"] = [
    "PLATFORM_PET_CUB published file is v2 purple puffball (first Toad-like pass discarded).",
    "PLATFORM_PET_EVOLVED now matches explorer-idle; red cap + overalls are the canonical explorer.",
    "VOXEL miner stages still have mild identity drift (hair/pickaxe).",
    "Badge set is PNG fallback; scheme doc prefers CSS/SVG and HTML overlay for names.",
    "奥特曼 / 宝可梦 theme pets were skipped (no matching mini-game this round).",
    "MAP_GOLD / UNIFIED_GOLD v1 trophies kept as *-prev.png; published files are spec icons.",
]
man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2), encoding="utf-8")
print("manifest", len(man["assets"]))
