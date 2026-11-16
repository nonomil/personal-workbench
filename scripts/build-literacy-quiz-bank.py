#!/usr/bin/env python3
"""Build the garden-defense dynamic quiz bank from the literacy data.

Reads prj/preschool-literacy-data.js (PersonalWorkbenchLiteracyData.bank),
takes the first --count rows that carry a tone-marked pinyin, and emits
prj/games/shared/literacy-quiz-bank.js with deterministic same-initial
distractors for each entry.  Build-time only; no network, no TTS.
"""
from __future__ import annotations

import argparse
import io
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "prj" / "preschool-literacy-data.js"
TARGET = ROOT / "prj" / "games" / "shared" / "literacy-quiz-bank.js"
TONE_RE = re.compile(r"[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]")
TONE_MAP = str.maketrans("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ", "aaaaooooeeeeiiiiuuuuvvvv")


def bare(syllable: str) -> str:
    return syllable.translate(TONE_MAP)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=400)
    args = parser.parse_args()

    raw = io.open(SOURCE, encoding="utf-8").read()
    marker = "= {\"bank\":"
    start = raw.index(marker) + 2  # 指向 {"
    end = raw.rindex("};")
    payload = raw[start:end + 1]
    bank = json.loads(payload)["bank"]

    rows = []
    for row in bank:
        extra = row.get("extra") or {}
        pinyin = str(extra.get("pinyin") or "").strip()
        char = str(row.get("text") or "").strip()
        if not char or not pinyin or not TONE_RE.search(pinyin):
            continue
        rows.append({"char": char, "pinyin": pinyin, "bare": bare(pinyin)})
        if len(rows) >= args.count:
            break

    by_letter: dict[str, list[dict]] = {}
    for row in rows:
        by_letter.setdefault(row["bare"][:1], []).append(row)

    for index, row in enumerate(rows):
        pool = [b for b in by_letter.get(row["bare"][:1], []) if b != row["bare"]]
        if len(pool) < 2:
            for offset in range(len(rows)):
                candidate = rows[(index + 7 + offset * 3) % len(rows)]["bare"]
                if candidate != row["bare"] and candidate not in pool:
                    pool.append(candidate)
                    if len(pool) >= 2:
                        break
        options = [row["pinyin"]]
        same_letter = [c for c in pool if c is not row and c["bare"] != row["bare"]]
        for candidate in same_letter:
            if len(options) >= 3:
                break
            if candidate["pinyin"] not in options:
                options.append(candidate["pinyin"])
        fallback = 1
        while len(options) < 3:
            candidate = rows[(index * 5 + fallback * 11) % len(rows)]
            fallback += 1
            if candidate["bare"] != row["bare"] and candidate["pinyin"] not in options:
                options.append(candidate["pinyin"])
        # 确定性轮换正确项位置，避免全在第一位
        slot = index % 3
        options[0], options[slot] = options[slot], options[0]
        row["options"] = options

    lines = ",\n".join(
        json.dumps({"char": r["char"], "pinyin": r["pinyin"], "options": r["options"]}, ensure_ascii=False)
        for r in rows
    )
    body = (
        "/* 由 scripts/build-literacy-quiz-bank.py 生成：识字字库前 "
        + str(len(rows))
        + " 字的读音三选一题库（干扰项取同声母，构建期确定）。源：preschool-literacy-data.js */\n"
        "(function (global) {\n"
        "    'use strict';\n"
        "    global.LiteracyQuizBank = [\n" + lines + "\n    ];\n"
        "})(typeof window !== 'undefined' ? window : globalThis);\n"
    )
    io.open(TARGET, "w", encoding="utf-8", newline="\n").write(body)
    print("quiz bank written:", TARGET, "entries:", len(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
