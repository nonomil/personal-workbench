# Assign L1-L5 levels to all preschool learning banks (build-time only).
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
prj = root / "prj" / "data" / "preschool"

LEVELS = ["L1", "L2", "L3", "L4", "L5"]
LEVEL_RE = re.compile(r"^L[1-5]$")

PHONICS_STAGE_LEVEL = {
    "sound-awareness": "L1",
    "first-letter-sounds": "L1",
    "cvc-blending": "L2",
    "short-vowels-and-families": "L3",
    "common-digraphs": "L4",
    "consonant-blends": "L5",
    "decodable-sentences": "L5",
    "transfer-and-review": "L5",
}

PINYIN_INITIAL_L1 = {"b", "p", "m", "f", "d", "t", "n", "l"}
POEM_L1_IDS = {
    "poem-yong-e",
    "poem-jingyesi",
    "poem-minnong",
    "poem-cunju",
    "poem-chunxiao",
    "poem-xiaochi",
    "poem-huixiang",
}

ENGLISH_THEME_ORDER = [
    "颜色",
    "数字",
    "动物",
    "身体",
    "家人",
    "食物",
    "自然",
    "物品",
    "描述",
    "动作",
    "学校",
    "生活",
    "表达",
    "高频词",
    "主题",
]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def band_for_index(index: int, total: int, bands: int = 5) -> str:
    if total <= 0:
        return "L1"
    size = max(1, (total + bands - 1) // bands)
    level = min(bands, index // size + 1)
    return f"L{level}"


def ensure_hanzi_level(row: list, level: str) -> list:
    next_row = list(row[:4])
    explain = ""
    if len(row) >= 5 and not LEVEL_RE.match(str(row[4] or "").strip()):
        explain = str(row[4] or "").strip()
    if len(row) >= 6 and not LEVEL_RE.match(str(row[5] or "").strip()):
        explain = explain or str(row[5] or "").strip()
    next_row.append(explain)
    next_row.append(level)
    return next_row


def assign_hanzi():
    path = prj / "识字" / "character-bank.json"
    bank = read_json(path)
    total = len(bank)
    if bank and isinstance(bank[0], dict):
        for index, item in enumerate(bank):
            item["level"] = band_for_index(index, total)
        write_json(path, bank)
        return total
    leveled = [ensure_hanzi_level(row, band_for_index(index, total)) for index, row in enumerate(bank)]
    write_json(path, leveled)
    return total


def english_sort_key(item: dict):
    theme = str(item.get("theme") or "生活")
    try:
        theme_rank = ENGLISH_THEME_ORDER.index(theme)
    except ValueError:
        theme_rank = len(ENGLISH_THEME_ORDER)
    return (theme_rank, str(item.get("text") or "").lower())


def assign_english():
    path = prj / "英语" / "vocabulary-bank.json"
    bank = read_json(path)
    for item in bank:
        item["level"] = "L1"
    ordered = sorted(bank, key=english_sort_key)
    write_json(path, ordered)
    return len(ordered)


def poem_level(item: dict) -> str:
    poem_id = str(item.get("id") or "")
    if poem_id in POEM_L1_IDS:
        return "L1"
    lines = item.get("lines") or []
    line_count = len(lines)
    text = "".join(lines)
    unique_chars = len({ch for ch in text if "\u4e00" <= ch <= "\u9fff"})
    longest = max((len(str(line)) for line in lines), default=0)
    if line_count > 4:
        return "L5"
    if longest >= 7:
        return "L4"
    if unique_chars <= 19:
        return "L2"
    return "L3"


def assign_poetry():
    path = prj / "古诗" / "poem-bank.json"
    bank = read_json(path)
    for item in bank:
        item["level"] = poem_level(item)
    write_json(path, bank)
    return len(bank)


def assign_pinyin():
    path = prj / "识字" / "pinyin-initial-bank.json"
    bank = read_json(path)
    initials = [item for item in bank if item.get("kind") == "initial"]
    finals = [item for item in bank if item.get("kind") == "final"]
    wholes = [item for item in bank if item.get("kind") == "whole"]
    for item in initials:
        text = str(item.get("text") or item.get("initial") or "").strip()
        item["level"] = "L1" if text in PINYIN_INITIAL_L1 else "L2"
    for index, item in enumerate(finals):
        item["level"] = band_for_index(index, len(finals), 2)
        if item["level"] == "L1":
            item["level"] = "L3"
        else:
            item["level"] = "L4"
    for item in wholes:
        item["level"] = "L5"
    write_json(path, bank)
    return len(bank)


def assign_phonics_words():
    path = prj / "english" / "phonics" / "word-bank.json"
    bank = read_json(path)
    for item in bank:
        stage = str(item.get("stageId") or "")
        item["level"] = PHONICS_STAGE_LEVEL.get(stage, "L3")
    write_json(path, bank)
    return len(bank)


def assign_motion():
    path = prj / "运动与专注" / "motion-bank.json"
    bank = read_json(path)
    movements = [item for item in bank if item.get("type") == "movement"]
    focus = [item for item in bank if item.get("type") == "focus"]
    for index, item in enumerate(movements):
        item["level"] = band_for_index(index, len(movements), 3)
    for index, item in enumerate(focus):
        item["level"] = "L4" if index < (len(focus) + 1) // 2 else "L5"
    write_json(path, bank)
    return len(bank)


def assign_routes():
    stage_levels = ["L1", "L2", "L3", "L4", "L5", "L5"]
    route_dirs = [
        prj / "识字",
        prj / "英语",
        prj / "数学",
        prj / "古诗",
        prj / "运动与专注",
        prj / "english" / "phonics",
    ]
    updated = 0
    for route_dir in route_dirs:
        route_path = route_dir / "route.json"
        if not route_path.exists():
            continue
        route = read_json(route_path)
        stages = route.get("stages") or []
        for index, stage in enumerate(stages):
            stage["level"] = stage_levels[min(index, len(stage_levels) - 1)]
        write_json(route_path, route)
        updated += 1
    return updated


def summarize():
    counts = {}
    hanzi = read_json(prj / "识字" / "character-bank.json")
    for row in hanzi:
        if isinstance(row, dict):
            level = str(row.get("level") or "L1")
        else:
            level = str(row[-1]) if row else "L1"
        counts.setdefault(("hanzi", level), 0)
        counts[("hanzi", level)] += 1
    english = read_json(prj / "英语" / "vocabulary-bank.json")
    for item in english:
        level = str(item.get("level") or "L1")
        counts.setdefault(("english", level), 0)
        counts[("english", level)] += 1
    return counts


if __name__ == "__main__":
    only = ""
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only = arg.split("=", 1)[1]
    result = {}
    if only in ("", "hanzi"):
        result["hanzi"] = assign_hanzi()
    if only in ("", "english"):
        result["english"] = assign_english()
    if only in ("", "poetry"):
        result["poetry"] = assign_poetry()
    if only in ("", "pinyin"):
        result["pinyin"] = assign_pinyin()
    if only in ("", "phonics"):
        result["phonics_words"] = assign_phonics_words()
    if only in ("", "motion"):
        result["motion"] = assign_motion()
    if only in ("", "routes"):
        result["routes"] = assign_routes()
    result["distribution"] = {f"{subject}:{level}": count for (subject, level), count in summarize().items()}
    print(json.dumps(result, ensure_ascii=False, indent=2))
