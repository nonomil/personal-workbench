#!/usr/bin/env python3
"""Build and optionally materialize preschool content audio.

The script is build-time only.  It reads the existing preschool JSON banks and
creates a deterministic MP3 target for each Chinese, pinyin, poetry and
English phonics item.  ``--dry-run`` only uses the Python standard library, so
CI and APK preparation can inspect the complete plan without loading a TTS
model or making a network request.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
DEFAULT_OUTPUT = PROJECT_ROOT / "prj" / "assets" / "audio" / "tts"
DEFAULT_MODEL = os.environ.get("VOXCPM2_MODEL_PATH", "D:/HuggingFaceCache/VoxCPM2")
DEFAULT_VOICE = "mom"
DEFAULT_ENGINE = "edge"

CHARACTER_BANK = Path("prj/data/preschool/识字/character-bank.json")
PINYIN_BANK = Path("prj/data/preschool/识字/pinyin-initial-bank.json")
POETRY_BANK = Path("prj/data/preschool/古诗/poem-bank.json")
PHONICS_WORD_BANK = Path("prj/data/preschool/english/phonics/word-bank.json")
PHONICS_LETTER_BANK = Path("prj/data/preschool/english/phonics/letter-bank.json")

PHONEME_SPEAK = {
    "a": "ah",
    "e": "eh",
    "i": "ih",
    "o": "aw",
    "u": "uh",
    "b": "buh",
    "c": "kuh",
    "d": "duh",
    "f": "fff",
    "g": "guh",
    "h": "huh",
    "j": "juh",
    "k": "kuh",
    "l": "lll",
    "m": "mmm",
    "n": "nnn",
    "p": "puh",
    "q": "kwuh",
    "r": "rrr",
    "s": "sss",
    "t": "tuh",
    "v": "vvv",
    "w": "wuh",
    "x": "ks",
    "y": "yuh",
    "z": "zzz",
    "sh": "shh",
    "ch": "ch",
    "th": "th",
    "ck": "kuh",
    "ng": "ng",
}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate preschool Chinese, poetry and phonics audio")
    parser.add_argument("--project-root", type=Path, default=PROJECT_ROOT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--category",
        action="append",
        choices=["hanzi", "pinyin", "poetry", "phonics"],
        help="Only include a category; repeat to include several categories",
    )
    parser.add_argument("--id", action="append", dest="ids", help="Only include an exact generated item id")
    parser.add_argument("--text", action="append", help="Only include an exact spoken text")
    parser.add_argument("--limit", type=int, help="Limit selected entries after filtering")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Voice preset key from config.py")
    parser.add_argument("--engine", choices=["edge", "voxcpm2", "auto"], default=DEFAULT_ENGINE)
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Local VoxCPM2 model directory or model id")
    parser.add_argument("--device", default="auto", help="VoxCPM2 device: auto, cpu, cuda, cuda:N")
    parser.add_argument("--voice-prompt", help="Override the VoxCPM2 voice design prompt")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate existing audio")
    parser.add_argument("--dry-run", action="store_true", help="Print a plan without generating or writing audio")
    parser.add_argument("--summary", action="store_true", help="With --dry-run, omit the per-item list")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent Edge TTS requests; VoxCPM2 remains serial")
    parser.add_argument("--edge-timeout", type=float, default=30.0, help="Per-request Edge TTS timeout in seconds")
    parser.add_argument("--edge-retries", type=int, default=3, help="Attempts for each Edge TTS item")
    parser.add_argument("--edge-retry-delay", type=float, default=2.0, help="Initial Edge retry delay in seconds")
    parser.add_argument("--inference-timesteps", type=int, default=10)
    parser.add_argument("--sample-rate", type=int, default=24000)
    return parser.parse_args(argv)


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def clean_poetry_line(value: Any) -> str:
    return re.sub(r"[，。、；：！？,.!?;:“”‘’《》\s]", "", str(value or "")).strip()


def read_json(project_root: Path, relative: Path) -> list[dict[str, Any]]:
    path = project_root / relative
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, list):
        raise ValueError(f"词库必须是数组：{path}")
    return [item for item in value if isinstance(item, dict)]


def fnv1a_key(kind: str, lang: str, voice: str, text: str) -> str:
    """Match ``preschool-speech.js`` without relying on non-ASCII filenames."""
    payload = f"{kind}|{lang}|{voice}|{normalize_text(text)}".encode("utf-8")
    value = 2166136261
    for byte in payload:
        value ^= byte
        value = (value * 16777619) & 0xFFFFFFFF
    return f"{value:08x}"


def target_for(output_dir: Path, kind: str, lang: str, voice: str, text: str) -> Path:
    key = fnv1a_key(kind, lang, voice, text)
    return output_dir / kind / f"{key}.mp3"


def relative_to_project(project_root: Path, path: Path) -> str:
    try:
        return path.resolve().relative_to(project_root.resolve()).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def make_item(
    *,
    category: str,
    item_id: str,
    kind: str,
    lang: str,
    text: str,
    source: str,
    voice: str,
) -> dict[str, Any] | None:
    normalized = normalize_text(text)
    if not normalized:
        return None
    return {
        "id": item_id,
        "category": category,
        "kind": kind,
        "lang": lang,
        "voice": voice,
        "text": normalized,
        "source": source,
    }


def append_unique(items: list[dict[str, Any]], seen: set[tuple[str, str, str, str]], item: dict[str, Any] | None) -> None:
    if not item:
        return
    key = (item["kind"], item["lang"], item["voice"], item["text"])
    if key in seen:
        return
    seen.add(key)
    items.append(item)


def source_entries(project_root: Path, voice: str) -> tuple[list[dict[str, Any]], dict[str, int]]:
    items: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    counts = {
        "hanziCharacters": 0,
        "hanziWords": 0,
        "pinyin": 0,
        "poems": 0,
        "poemLines": 0,
        "phonicsWords": 0,
        "phonicsLetters": 0,
    }
    seen_hanzi_words: set[str] = set()

    for index, row in enumerate(read_json(project_root, CHARACTER_BANK)):
        text = normalize_text(row.get("text") or row.get("char"))
        if text:
            counts["hanziCharacters"] += 1
            append_unique(
                items,
                seen,
                make_item(
                    category="hanzi",
                    item_id=f"hanzi-char-{row.get('id') or index + 1}",
                    kind="hanzi",
                    lang="zh-CN",
                    text=text,
                    source="character-bank:character",
                    voice=voice,
                ),
            )
        extra = row.get("extra") if isinstance(row.get("extra"), dict) else {}
        words = extra.get("words") if isinstance(extra.get("words"), list) else row.get("words")
        for word_index, word in enumerate(words if isinstance(words, list) else []):
            word_text = normalize_text(word)
            if not word_text:
                continue
            if word_text not in seen_hanzi_words:
                counts["hanziWords"] += 1
                seen_hanzi_words.add(word_text)
            append_unique(
                items,
                seen,
                make_item(
                    category="hanzi",
                    item_id=f"hanzi-word-{row.get('id') or index + 1}-{word_index + 1}",
                    kind="hanzi",
                    lang="zh-CN",
                    text=word_text,
                    source="character-bank:word",
                    voice=voice,
                ),
            )

    for index, row in enumerate(read_json(project_root, PINYIN_BANK)):
        extra = row.get("extra") if isinstance(row.get("extra"), dict) else {}
        sample = normalize_text(row.get("sample") or extra.get("sample") or row.get("zh"))
        if not sample:
            continue
        counts["pinyin"] += 1
        append_unique(
            items,
            seen,
            make_item(
                category="pinyin",
                item_id=f"pinyin-{row.get('id') or index + 1}",
                kind="pinyin",
                lang="zh-CN",
                text=sample,
                source="pinyin-bank",
                voice=voice,
            ),
        )

    # 拼音呼读音/韵母发音表：声母读呼读音（b→波），韵母读呼读字（a→啊）。
    # 2026-08-29 修复"听拼音读成例字"：卡片听到的应是字母本音，例字只是组词示例。
    PINYIN_CALL_TEXT = {
        "b": "波", "p": "坡", "m": "摸", "f": "佛", "d": "得", "t": "特", "n": "讷", "l": "勒",
        "g": "哥", "k": "科", "h": "喝", "j": "鸡", "q": "七", "x": "西",
        "zh": "知", "ch": "吃", "sh": "狮", "r": "日", "z": "资", "c": "刺", "s": "丝", "y": "衣", "w": "乌",
        "a": "啊", "o": "喔", "e": "鹅", "i": "衣", "u": "乌", "ü": "迂",
        "ai": "哀", "ei": "诶", "ui": "威", "ao": "凹", "ou": "欧", "iu": "优", "ie": "耶", "üe": "约", "er": "儿",
        "an": "安", "en": "恩", "in": "因", "un": "温", "ün": "晕",
        "ang": "昂", "eng": "鞥", "ing": "英", "ong": "翁",
    }
    for index, row in enumerate(read_json(project_root, PINYIN_BANK)):
        extra = row.get("extra") if isinstance(row.get("extra"), dict) else {}
        call_text = PINYIN_CALL_TEXT.get(str(row.get("text") or "").strip())
        if not call_text:
            continue
        append_unique(
            items,
            seen,
            make_item(
                category="pinyin",
                item_id=f"pinyin-call-{row.get('id') or index + 1}",
                kind="pinyin",
                lang="zh-CN",
                text=call_text,
                source="pinyin-bank:call",
                voice=voice,
            ),
        )

    for poem_index, row in enumerate(read_json(project_root, POETRY_BANK)):
        title = normalize_text(row.get("title"))
        raw_lines = row.get("lines") if isinstance(row.get("lines"), list) else []
        lines = [clean_poetry_line(line) for line in raw_lines if clean_poetry_line(line)]
        if not title or not lines:
            continue
        counts["poems"] += 1
        poem_id = str(row.get("id") or poem_index + 1)
        append_unique(
            items,
            seen,
            make_item(
                category="poetry",
                item_id=f"poetry-{poem_id}-full",
                kind="poetry",
                lang="zh-CN",
                text="，".join([title, *lines]),
                source="poem-bank:full",
                voice=voice,
            ),
        )
        for line_index, line in enumerate(lines):
            counts["poemLines"] += 1
            append_unique(
                items,
                seen,
                make_item(
                    category="poetry",
                    item_id=f"poetry-{poem_id}-line-{line_index + 1}",
                    kind="poetry",
                    lang="zh-CN",
                    text=line,
                    source="poem-bank:line",
                    voice=voice,
                ),
            )

    for index, row in enumerate(read_json(project_root, PHONICS_WORD_BANK)):
        text = normalize_text(row.get("text"))
        if text:
            counts["phonicsWords"] += 1
            append_unique(
                items,
                seen,
                make_item(
                    category="phonics",
                    item_id=f"phonics-word-{row.get('id') or index + 1}",
                    kind="word",
                    lang="en-US",
                    text=text,
                    source="phonics-word-bank:word",
                    voice=voice,
                ),
            )
        phonemes = row.get("phonemes") if isinstance(row.get("phonemes"), list) else []
        for phoneme in phonemes:
            token = normalize_text(phoneme).lower()
            spoken = PHONEME_SPEAK.get(token, token)
            append_unique(
                items,
                seen,
                make_item(
                    category="phonics",
                    item_id=f"phonics-phoneme-{token}",
                    kind="phoneme",
                    lang="en-US",
                    text=spoken,
                    source="phonics-word-bank:phoneme",
                    voice=voice,
                ),
            )

    for index, row in enumerate(read_json(project_root, PHONICS_LETTER_BANK)):
        counts["phonicsLetters"] += 1
        keyword = normalize_text(row.get("keyword") or row.get("zh"))
        if keyword:
            append_unique(
                items,
                seen,
                make_item(
                    category="phonics",
                    item_id=f"phonics-letter-word-{row.get('id') or index + 1}",
                    kind="word",
                    lang="en-US",
                    text=keyword,
                    source="phonics-letter-bank:keyword",
                    voice=voice,
                ),
            )
        extra = row.get("extra") if isinstance(row.get("extra"), dict) else {}
        token = normalize_text(row.get("sound") or extra.get("sound") or row.get("text")).lower()
        spoken = PHONEME_SPEAK.get(token, token)
        append_unique(
            items,
            seen,
            make_item(
                category="phonics",
                item_id=f"phonics-letter-phoneme-{token}",
                kind="phoneme",
                lang="en-US",
                text=spoken,
                source="phonics-letter-bank:phoneme",
                voice=voice,
            ),
        )

    return items, counts


def select_items(items: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    categories = set(args.category or [])
    ids = set(args.ids or [])
    texts = {normalize_text(text) for text in (args.text or [])}
    selected = [
        item
        for item in items
        if (not categories or item["category"] in categories)
        and (not ids or item["id"] in ids)
        and (not texts or item["text"] in texts)
    ]
    if args.limit is not None:
        if args.limit < 0:
            raise ValueError("--limit 不能为负数")
        selected = selected[: args.limit]
    return selected


def build_plan(project_root: Path, output_dir: Path, args: argparse.Namespace) -> dict[str, Any]:
    all_items, counts = source_entries(project_root, args.voice)
    selected = select_items(all_items, args)
    plan_items = []
    for item in selected:
        target = target_for(output_dir, item["kind"], item["lang"], item["voice"], item["text"])
        exists = target.exists() and target.stat().st_size > 100
        plan_items.append(
            {
                **item,
                "target": relative_to_project(project_root, target),
                "status": "overwrite" if args.overwrite and exists else ("skip-existing" if exists else "pending"),
            }
        )
    skipped = sum(item["status"] == "skip-existing" for item in plan_items)
    pending = sum(item["status"] in {"pending", "overwrite"} for item in plan_items)
    return {
        "total": len(all_items),
        "selected": len(plan_items),
        "skippedExisting": skipped,
        "toGenerate": pending,
        "sourceCounts": counts,
        "items": plan_items,
    }


def load_config():
    sys.path.insert(0, str(SCRIPT_DIR))
    from config import VOICE_PRESETS  # type: ignore

    return VOICE_PRESETS


def edge_preset(voice_presets: dict[str, Any], voice: str, lang: str) -> dict[str, str]:
    preset = voice_presets.get(voice) or voice_presets[DEFAULT_VOICE]
    by_lang = preset.get("edgeByLang") if isinstance(preset, dict) else None
    if isinstance(by_lang, dict) and isinstance(by_lang.get(lang), dict):
        return by_lang[lang]
    return preset.get("edge") or {"voice": "zh-CN-XiaoxiaoNeural", "rate": "-8%", "pitch": "+4Hz"}


def voxcpm_prompt(voice_presets: dict[str, Any], voice: str, lang: str, override: str | None) -> str:
    if override is not None:
        return override
    preset = voice_presets.get(voice) or voice_presets[DEFAULT_VOICE]
    by_lang = preset.get("voxcpmByLang") if isinstance(preset, dict) else None
    if isinstance(by_lang, dict) and by_lang.get(lang):
        return str(by_lang[lang])
    return str(preset.get("voxcpm") or "")


async def generate_edge(item: dict[str, Any], target: Path, voice_presets: dict[str, Any]) -> dict[str, Any]:
    import edge_tts

    preset = edge_preset(voice_presets, item["voice"], item["lang"])
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.tmp")
    try:
        await asyncio.wait_for(
            edge_tts.Communicate(
                item["text"],
                voice=preset["voice"],
                rate=preset.get("rate", "+0%"),
                pitch=preset.get("pitch", "+0Hz"),
            ).save(str(temporary)),
            timeout=item["edgeTimeout"],
        )
        if not temporary.exists() or temporary.stat().st_size <= 100:
            raise ValueError("Edge TTS 输出为空")
        temporary.replace(target)
        return {"bytes": target.stat().st_size, "engine": "edge"}
    except asyncio.TimeoutError as error:
        raise TimeoutError(f"Edge TTS 请求超过 {item['edgeTimeout']:.1f}s") from error
    finally:
        temporary.unlink(missing_ok=True)


def load_voxcpm(model_ref: str, device: str):
    from voxcpm import VoxCPM

    model_path = Path(model_ref)
    kwargs: dict[str, Any] = {"load_denoiser": False}
    if device != "auto":
        kwargs["device"] = device
    if model_path.exists():
        kwargs["local_files_only"] = True
    return VoxCPM.from_pretrained(model_ref, **kwargs)


def generate_voxcpm(model: Any, item: dict[str, Any], target: Path, prompt: str, args: argparse.Namespace) -> dict[str, Any]:
    import numpy as np
    import soundfile as sf

    target.parent.mkdir(parents=True, exist_ok=True)
    full_text = f"{prompt}{item['text']}" if prompt else item["text"]
    wav = model.generate(
        text=full_text,
        cfg_value=2.0,
        inference_timesteps=args.inference_timesteps,
        max_len=min(160, max(40, len(item["text"]) * 24)),
        retry_badcase_ratio_threshold=4.0,
    )
    array = np.asarray(wav, dtype=np.float32)
    if array.ndim > 1:
        array = array.mean(axis=0 if array.shape[0] <= 4 else 1)
    array = np.clip(array, -1.0, 1.0)
    temporary = target.with_name(f".{target.name}.tmp")
    sf.write(str(temporary), array, int(model.tts_model.sample_rate), format="MP3", subtype="MPEG_LAYER_III")
    if not temporary.exists() or temporary.stat().st_size <= 100:
        temporary.unlink(missing_ok=True)
        raise ValueError("VoxCPM2 输出为空")
    temporary.replace(target)
    return {"bytes": target.stat().st_size, "engine": "voxcpm2"}


def write_manifest(output_dir: Path, project_root: Path, items: Iterable[dict[str, Any]], engine: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "engine": engine,
        "items": [
            {
                **item,
                "target": relative_to_project(project_root, target_for(output_dir, item["kind"], item["lang"], item["voice"], item["text"])),
            }
            for item in items
        ],
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.workers < 1:
        raise ValueError("--workers 必须至少为 1")
    if args.edge_timeout <= 0:
        raise ValueError("--edge-timeout 必须大于 0")
    if args.edge_retries < 1:
        raise ValueError("--edge-retries 必须至少为 1")
    if args.edge_retry_delay < 0:
        raise ValueError("--edge-retry-delay 不能为负数")
    project_root = args.project_root if args.project_root.is_absolute() else PROJECT_ROOT / args.project_root
    output_dir = args.output_dir if args.output_dir.is_absolute() else project_root / args.output_dir
    plan = build_plan(project_root.resolve(), output_dir.resolve(), args)
    if args.dry_run:
        output = dict(plan)
        if args.summary:
            output.pop("items", None)
        print(json.dumps(output, ensure_ascii=False))
        return 0

    voice_presets = load_config()
    pending = [entry for entry in plan["items"] if entry["status"] in {"pending", "overwrite"}]
    generated: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    model = None
    actual_engine = args.engine
    if args.engine == "auto":
        actual_engine = "edge"
    if actual_engine == "voxcpm2" and pending:
        model = load_voxcpm(args.model, args.device)

    async def run_edge_batch() -> None:
        semaphore = asyncio.Semaphore(args.workers)

        async def run_one(entry: dict[str, Any]) -> None:
            async with semaphore:
                target = target_for(output_dir, entry["kind"], entry["lang"], entry["voice"], entry["text"])
                request = {**entry, "edgeTimeout": args.edge_timeout}
                last_error: Exception | None = None
                for attempt in range(1, args.edge_retries + 1):
                    try:
                        metadata = await generate_edge(request, target, voice_presets)
                        generated.append({"id": entry["id"], "target": entry["target"], **metadata})
                        print(f"[edge] {entry['id']} -> {entry['target']}", flush=True)
                        return
                    except Exception as error:  # keep the batch moving and report exact failures
                        last_error = error
                        if attempt < args.edge_retries:
                            delay = args.edge_retry_delay * attempt
                            print(
                                f"[edge] RETRY {entry['id']} ({attempt}/{args.edge_retries}): {error}",
                                file=sys.stderr,
                                flush=True,
                            )
                            if delay:
                                await asyncio.sleep(delay)
                failed.append({"id": entry["id"], "target": entry["target"], "error": str(last_error)})
                print(f"[edge] FAILED {entry['id']}: {last_error}", file=sys.stderr, flush=True)

        await asyncio.gather(*(run_one(entry) for entry in pending))

    if actual_engine == "edge":
        asyncio.run(run_edge_batch())
    else:
        for entry in pending:
            target = target_for(output_dir, entry["kind"], entry["lang"], entry["voice"], entry["text"])
            try:
                metadata = generate_voxcpm(model, entry, target, voxcpm_prompt(voice_presets, entry["voice"], entry["lang"], args.voice_prompt), args)
                generated.append({"id": entry["id"], "target": entry["target"], **metadata})
                print(f"[voxcpm2] {entry['id']} -> {entry['target']}", flush=True)
            except Exception as error:
                failed.append({"id": entry["id"], "target": entry["target"], "error": str(error)})
                print(f"[voxcpm2] FAILED {entry['id']}: {error}", file=sys.stderr, flush=True)

    write_manifest(output_dir, project_root.resolve(), source_entries(project_root.resolve(), args.voice)[0], actual_engine)
    print(json.dumps({**plan, "generated": generated, "failed": failed}, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
