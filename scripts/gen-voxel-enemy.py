# -*- coding: utf-8 -*-
"""Generate one voxel-adventure enemy sprite via rn6.nonom.top image API.

Usage:
    set VOXEL_IMG_KEY=<key>
    python scripts/gen-voxel-enemy.py <name> --prompt "<prompt>" [--model gpt-image-2] [--out DIR]
        [--endpoint URL] [--key-env NAME] [--quality low|medium|high]

Saves b64 image to <out>/<name>.png (default cursor assets dir).
Reads API key from env VOXEL_IMG_KEY by default (--key-env to override).
"""
import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

import requests

ENDPOINT = "https://rn6.nonom.top/v1/images/generations"
DEFAULT_OUT = Path(r"C:\Users\No'mi'l\.cursor\projects\g-StudyCode\assets")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--model", default="gpt-image-2")
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--endpoint", default=ENDPOINT)
    ap.add_argument("--key-env", default="VOXEL_IMG_KEY")
    ap.add_argument("--quality", default=None)
    ap.add_argument("--no-response-format", action="store_true",
                    help="omit response_format field (e.g. Agnes rejects it)")
    args = ap.parse_args()

    key = os.environ.get(args.key_env)
    if not key:
        print(f"error: {args.key_env} not set", file=sys.stderr)
        return 2

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    payload = {
        "model": args.model,
        "prompt": args.prompt,
        "n": 1,
        "size": "1024x1024",
    }
    if not args.no_response_format:
        payload["response_format"] = "b64_json"
    if args.quality:
        payload["quality"] = args.quality
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    t0 = time.time()
    try:
        resp = requests.post(args.endpoint, headers=headers, json=payload, timeout=180)
    except requests.Timeout:
        print("error: request timed out after 180s", file=sys.stderr)
        return 3
    except requests.RequestException as exc:
        print(f"error: request failed: {exc}", file=sys.stderr)
        return 4

    print(f"http {resp.status_code} in {time.time() - t0:.1f}s")
    if resp.status_code != 200:
        print(resp.text[:500], file=sys.stderr)
        return 1

    data = resp.json().get("data") or []
    if not data:
        print("error: no data[0] in response", file=sys.stderr)
        return 5
    item = data[0]
    raw = None
    if item.get("b64_json"):
        raw = base64.b64decode(item["b64_json"])
    elif item.get("url"):
        img = requests.get(item["url"], timeout=120)
        img.raise_for_status()
        raw = img.content
    if not raw:
        print("error: no b64_json or url in data[0]", file=sys.stderr)
        return 6

    if not (raw.startswith(b"\x89PNG") or raw.startswith(b"\xff\xd8")):
        print(f"error: not PNG/JPEG header ({raw[:8]})", file=sys.stderr)
        return 7

    dest = out_dir / f"{args.name}.png"
    dest.write_bytes(raw)
    print(f"saved {dest} ({len(raw)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
