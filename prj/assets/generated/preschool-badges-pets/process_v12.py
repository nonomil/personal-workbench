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
    ("pets", "pet-voxel-growth.png", "VOXEL_PET_GROWTH", "成长矿工", True),
    ("pets", "pet-voxel-evolved.png", "VOXEL_PET_EVOLVED", "进化矿工", True),
    ("pets", "pet-voxel-hungry.png", "VOXEL_PET_HUNGRY", "矿工饥饿", False),
    ("pets", "pet-platform-hungry.png", "PLATFORM_PET_HUNGRY", "蘑菇饥饿", False),
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
    proc.check_returncode()
    info = json.loads(proc.stdout)
    info.update(id=asset_id, label=label, pack=pack, file=name)
    reports.append(info)
    print(asset_id, info["mode"], info["edge"])

man_path = root / "publish_manifest.json"
man = json.loads(man_path.read_text(encoding="utf-8"))
by_id = {a["id"]: i for i, a in enumerate(man["assets"])}
for r in reports:
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

man["version"] = "v1.2"
man["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
man["defects"] = [
    "PLATFORM_PET_CUB published file is v2 purple puffball.",
    "PLATFORM_PET_EVOLVED matches explorer-idle; red cap + overalls are the canonical explorer.",
    "VOXEL cub/growth/evolved/hungry now share the yellow-hat miner identity; older drifted files kept as *-prev.png.",
    "Badge PNG is now consumed by preschool-achievements.js; SVG remains fallback.",
    "奥特曼 / 宝可梦 theme pets were skipped.",
]
man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2), encoding="utf-8")
print("manifest", len(man["assets"]))
