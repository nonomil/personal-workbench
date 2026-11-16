#!/usr/bin/env python3
"""Regenerate the kit's call-pronunciation audio with edge-tts.

Reads data/pinyin-call-table.js values (波坡摸佛… / 啊喔鹅…) plus the example
syllable chars you list in --extra, speaks each once, and writes audio/<text>.mp3
while updating audio/manifest.json.

Usage:
    pip install edge-tts
    python scripts/bake_call_audio.py              # 只烤缺失的
    python scripts/bake_call_audio.py --force      # 全部重烤
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

KIT = Path(__file__).resolve().parents[1]
AUDIO = KIT / "audio"
VOICE = "zh-CN-XiaoyiNeural"   # 活泼女声；可换 zh-CN-XiaoxiaoNeural 等
RATE = "-10%"


def call_words() -> list[str]:
    text = (KIT / "data" / "pinyin-call-table.js").read_text(encoding="utf-8")
    return re.findall(r"'([^']+)'(?:,|\n)", text.split("finals:")[1])


async def bake(word: str, force: bool) -> tuple[str, bool]:
    import edge_tts

    target = AUDIO / f"{word}.mp3"
    if target.exists() and not force:
        return word, False
    communicate = edge_tts.Communicate(word, VOICE, rate=RATE)
    await communicate.save(str(target))
    return word, True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    words = sorted(set(call_words()))
    AUDIO.mkdir(parents=True, exist_ok=True)
    results = asyncio.run(asyncio.gather(*(bake(word, args.force) for word in words)))

    manifest_path = AUDIO / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    mapping = manifest.get("map") or {}
    for word, _ in results:
        mapping[word] = f"{word}.mp3"
    manifest_path.write_text(
        json.dumps({"engine": "edge", "voice": VOICE, "count": len(mapping), "map": mapping},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    baked = [word for word, generated in results if generated]
    print(f"words: {len(words)}  baked: {len(baked)}  skipped: {len(words) - len(baked)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
