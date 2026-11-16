#!/usr/bin/env python3
"""Use the shared VoxCPM2 environment to generate preschool vocabulary audio.

The script is deliberately build-time only.  It does not import VoxCPM until
there is at least one file to generate, so ``--dry-run`` works on any machine
with the standard library and can be used in CI.

Examples (PowerShell):
    python tools/tts-portable/generate-preschool-vocab.py --dry-run
    python tools/tts-portable/generate-preschool-vocab.py --word hello --word apple
    python tools/tts-portable/generate-preschool-vocab.py --limit 10 --device cuda
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
DEFAULT_BANK = PROJECT_ROOT / "prj" / "data" / "preschool" / "英语" / "vocabulary-bank.json"
DEFAULT_OUTPUT = PROJECT_ROOT / "prj" / "assets" / "audio" / "vocab"
DEFAULT_MODEL = os.environ.get("VOXCPM2_MODEL_PATH", "D:/HuggingFaceCache/VoxCPM2")
DEFAULT_VOICE_PROMPT = "(warm clear female teacher voice)"
DEFAULT_MAX_DURATION = 4.0
DEFAULT_MAX_MODEL_LEN = 96


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate preschool vocabulary MP3 files with VoxCPM2")
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK, help="Vocabulary JSON path")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT, help="MP3 output directory")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Local VoxCPM2 model directory or model id")
    parser.add_argument("--device", default="auto", help="auto, cpu, cuda, or cuda:N")
    parser.add_argument("--word", action="append", help="Only generate this word; repeat for multiple words")
    parser.add_argument("--limit", type=int, help="Limit selected words after filtering")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate files that already exist")
    parser.add_argument("--dry-run", action="store_true", help="Print a JSON plan without loading VoxCPM")
    parser.add_argument("--voice-prompt", default=DEFAULT_VOICE_PROMPT, help="VoxCPM2 parenthesized voice design prompt")
    parser.add_argument("--inference-timesteps", type=int, default=10)
    parser.add_argument("--sample-rate", type=int, default=24000, help="Final MP3 sample rate")
    parser.add_argument("--max-duration", type=float, default=DEFAULT_MAX_DURATION, help="Reject generated audio longer than this many seconds")
    parser.add_argument("--max-model-len", type=int, default=DEFAULT_MAX_MODEL_LEN, help="Hard cap for VoxCPM2 generated feature length")
    return parser.parse_args(argv)


def load_bank(bank_path: Path) -> list[dict[str, Any]]:
    with bank_path.open("r", encoding="utf-8") as handle:
        bank = json.load(handle)
    if not isinstance(bank, list):
        raise ValueError(f"词库必须是数组：{bank_path}")
    return bank


def _safe_filename(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip().lower()).strip(".-")
    return value or "vocab"


def target_for_item(item: dict[str, Any], output_dir: Path) -> Path:
    media = item.get("media") or {}
    audio = str(media.get("audio") or "").replace("\\", "/")
    filename = Path(audio).name if audio else f"{_safe_filename(str(item.get('text') or item.get('id') or 'vocab'))}.mp3"
    if not filename.lower().endswith(".mp3"):
        filename = f"{Path(filename).stem}.mp3"
    return output_dir / filename


def _relative_to_project(path: Path) -> str:
    try:
        return path.resolve().relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def select_items(bank: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    wanted = {word.casefold() for word in (args.word or [])}
    selected = []
    for item in bank:
        word = str(item.get("text") or "").strip()
        if not word:
            continue
        if wanted and word.casefold() not in wanted:
            continue
        selected.append(item)
    if args.limit is not None:
        if args.limit < 0:
            raise ValueError("--limit 不能为负数")
        selected = selected[: args.limit]
    return selected


def is_duration_acceptable(text: str, duration: float, max_duration: float = DEFAULT_MAX_DURATION) -> bool:
    """Reject the long-loop failure mode that is especially common for short words."""
    del text  # kept in the signature so callers can add length-aware policy later
    return 0.08 <= float(duration) <= max_duration


def model_max_len_for_text(text: str, hard_max: int = DEFAULT_MAX_MODEL_LEN) -> int:
    """Give short inputs a small stop budget while leaving room for short phrases."""
    word_count = max(1, len(text.split()))
    return min(hard_max, max(40, word_count * 24))


def build_plan(bank: list[dict[str, Any]], args: argparse.Namespace) -> dict[str, Any]:
    output_dir = args.output_dir if args.output_dir.is_absolute() else PROJECT_ROOT / args.output_dir
    items = []
    for item in select_items(bank, args):
        target = target_for_item(item, output_dir)
        exists = target.exists() and target.stat().st_size > 100
        items.append(
            {
                "word": str(item.get("text") or "").strip(),
                "text": str(item.get("text") or "").strip(),
                "target": _relative_to_project(target),
                "status": "overwrite" if args.overwrite and exists else ("skip-existing" if exists else "pending"),
            }
        )
    skipped = sum(item["status"] == "skip-existing" for item in items)
    pending = sum(item["status"] in {"pending", "overwrite"} for item in items)
    return {
        "total": len(bank),
        "selected": len(items),
        "skippedExisting": skipped,
        "toGenerate": pending,
        "items": items,
    }


def _as_mono(samples: Any) -> Any:
    import numpy as np

    array = np.asarray(samples, dtype=np.float32)
    if array.ndim == 1:
        return array
    if array.ndim != 2:
        raise ValueError(f"VoxCPM 返回了不支持的波形形状：{array.shape}")
    if array.shape[0] <= 4 and array.shape[1] > array.shape[0]:
        return array.mean(axis=0)
    return array.mean(axis=1)


def _resample(samples: Any, source_rate: int, target_rate: int) -> Any:
    if source_rate == target_rate:
        return samples
    from scipy.signal import resample_poly

    divisor = math.gcd(source_rate, target_rate)
    return resample_poly(samples, target_rate // divisor, source_rate // divisor).astype("float32")


def save_mp3(
    samples: Any,
    source_rate: int,
    target: Path,
    target_rate: int,
    text: str = "",
    max_duration: float = DEFAULT_MAX_DURATION,
) -> dict[str, Any]:
    import numpy as np
    import soundfile as sf

    normalized = _resample(_as_mono(samples), source_rate, target_rate)
    normalized = np.clip(normalized, -1.0, 1.0).astype("float32")
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.tmp")
    try:
        sf.write(
            str(temporary),
            normalized,
            target_rate,
            format="MP3",
            subtype="MPEG_LAYER_III",
            bitrate_mode="CONSTANT",
        )
        info = sf.info(str(temporary))
        if info.format not in {"MP3", "MPEG-1/2 Audio"} or info.channels != 1:
            raise ValueError(f"输出音频格式不符合约定：{info}")
        if not is_duration_acceptable(text, float(info.duration), max_duration):
            raise ValueError(
                f"音频时长异常：{text!r} -> {float(info.duration):.2f}s，限制为 {max_duration:.2f}s"
            )
        temporary.replace(target)
        return {
            "bytes": target.stat().st_size,
            "duration": round(float(info.duration), 3),
            "sampleRate": info.samplerate,
            "channels": info.channels,
        }
    finally:
        temporary.unlink(missing_ok=True)


def load_model(model_ref: str, device: str):
    from voxcpm import VoxCPM

    model_path = Path(model_ref)
    kwargs: dict[str, Any] = {"load_denoiser": False}
    if device != "auto":
        kwargs["device"] = device
    if model_path.exists():
        kwargs["local_files_only"] = True
    return VoxCPM.from_pretrained(model_ref, **kwargs)


def generate_one(model: Any, item: dict[str, Any], target: Path, args: argparse.Namespace) -> dict[str, Any]:
    text = str(item.get("text") or "").strip()
    if not text:
        raise ValueError("词条没有 text")
    full_text = f"{args.voice_prompt}{text}" if args.voice_prompt else text
    wav = model.generate(
        text=full_text,
        cfg_value=2.0,
        inference_timesteps=args.inference_timesteps,
        max_len=model_max_len_for_text(text, args.max_model_len),
        retry_badcase_ratio_threshold=4.0,
    )
    source_rate = int(model.tts_model.sample_rate)
    return save_mp3(wav, source_rate, target, args.sample_rate, text=text, max_duration=args.max_duration)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    bank_path = args.bank if args.bank.is_absolute() else PROJECT_ROOT / args.bank
    bank = load_bank(bank_path)
    plan = build_plan(bank, args)
    if args.dry_run:
        print(json.dumps(plan, ensure_ascii=False))
        return 0

    pending = [entry for entry in plan["items"] if entry["status"] in {"pending", "overwrite"}]
    if not pending:
        print(json.dumps({**plan, "generated": [], "failed": []}, ensure_ascii=False, indent=2))
        return 0

    output_dir = args.output_dir if args.output_dir.is_absolute() else PROJECT_ROOT / args.output_dir
    by_word = {str(item.get("text") or "").strip().casefold(): item for item in select_items(bank, args)}
    model = load_model(args.model, args.device)
    generated: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    for entry in pending:
        word = entry["word"]
        target = target_for_item(by_word[word.casefold()], output_dir)
        try:
            metadata = generate_one(model, by_word[word.casefold()], target, args)
            generated.append({"word": word, "target": entry["target"], **metadata})
            print(f"[voxcpm2] {word} -> {entry['target']} ({metadata['duration']:.2f}s, {metadata['bytes']} bytes)", flush=True)
        except Exception as error:  # keep the batch moving and report exact failures
            failed.append({"word": word, "target": entry["target"], "error": str(error)})
            print(f"[voxcpm2] FAILED {word}: {error}", file=sys.stderr, flush=True)

    summary = {**plan, "generated": generated, "failed": failed}
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
