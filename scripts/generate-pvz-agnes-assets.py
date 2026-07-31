#!/usr/bin/env python3
"""Generate project-local PVZ-inspired art with the Agnes image endpoint.

The key is read from a user-supplied local markdown file and is never written
to logs, manifests, prompts, or generated project files.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import urllib.error
import urllib.request
from pathlib import Path


DEFAULT_URL = "https://apihub.agnes-ai.cn/v1/images/generations"
DEFAULT_MODEL = "agnes-image-2.1-flash"


def read_token(path: Path) -> str:
    lines = [line.strip() for line in path.read_text(encoding="utf-8").splitlines()]
    for line in lines:
        match = re.search(r"(?:AGNES_TOKEN|API_KEY|TOKEN)\s*=\s*['\"]?([^'\"\s]+)", line)
        if match:
            return match.group(1)
    candidates = [line for line in lines if line and not line.startswith("http") and not line.startswith("#")]
    for candidate in candidates:
        if len(candidate) >= 24 and " " not in candidate:
            return candidate
    raise RuntimeError(f"No Agnes token found in {path}")


def fetch_image(token: str, prompt: str, url: str, model: str, size: str) -> bytes:
    payload = json.dumps({"model": model, "prompt": prompt, "n": 1, "size": size}).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError(f"Agnes HTTP {error.code}: {detail}") from error
    parsed = json.loads(body)
    if parsed.get("error"):
        raise RuntimeError(f"Agnes API error: {parsed['error']}")
    items = parsed.get("data") or []
    if not items:
        raise RuntimeError(f"Agnes returned no image data: {body[:800]}")
    item = items[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=240) as response:
            return response.read()
    raise RuntimeError("Agnes response contained neither b64_json nor url")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--key-file", required=True, type=Path)
    parser.add_argument("--prompt-file", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--name", required=True)
    parser.add_argument("--size", default="1024x1024")
    parser.add_argument("--api-url", default=DEFAULT_URL)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    prompt = args.prompt_file.read_text(encoding="utf-8").strip()
    token = read_token(args.key_file)
    image_bytes = fetch_image(token, prompt, args.api_url, args.model, args.size)
    output = args.out / f"{args.name}.png"
    output.write_bytes(image_bytes)
    metadata = {
        "model": args.model,
        "sizeRequested": args.size,
        "promptFile": str(args.prompt_file),
        "output": str(output),
        "bytes": len(image_bytes),
    }
    (args.out / f"{args.name}.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"generated: {output} ({len(image_bytes)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
