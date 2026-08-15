# CliproxAPI gpt-image-2 · blocklegend UI refs
# Key only from cliprox.local.env / env vars. Never print the token.
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ENV_FILE = Path(r"G:\StudyCode\宠物积分系统\docs\生图\生图接口资源key\cliprox.local.env")
OUT = Path(__file__).resolve().parent
PROMPTS = OUT / "prompts"


def load_env(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip())


def generate(name: str, prompt: str, size: str = "1024x1024") -> Path:
    base = (os.environ.get("CLIPROX_API_BASE") or "").rstrip("/")
    key = os.environ.get("CLIPROX_API_KEY") or ""
    if not base or not key:
        raise SystemExit("CLIPROX_API_BASE / CLIPROX_API_KEY missing")
    body = json.dumps({
        "model": "gpt-image-2",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "response_format": "b64_json",
    }).encode("utf-8")
    req = urllib.request.Request(
        base + "/images/generations",
        data=body,
        headers={
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")[:400]
        ray = err.headers.get("cf-ray") or err.headers.get("CF-RAY") or "-"
        print("HTTP", err.code, "cf-ray", ray, "url", req.full_url, file=sys.stderr)
        raise SystemExit("HTTP %s %s" % (err.code, detail))
    if payload.get("error"):
        raise SystemExit("API error: %s" % payload["error"])
    rows = payload.get("data") or []
    if not rows or not rows[0].get("b64_json"):
        raise SystemExit("missing data[0].b64_json")
    raw = base64.b64decode(rows[0]["b64_json"])
    ext = ".jpg" if raw[:3] == b"\xff\xd8\xff" else ".png"
    dest = OUT / (name + ext)
    dest.write_bytes(raw)
    print("wrote", dest.name, dest.stat().st_size, "bytes")
    return dest


def main() -> None:
    load_env(ENV_FILE)
    names = sys.argv[1:] or ["quiz-tablet", "look-nametag", "hud-diegetic"]
    for name in names:
        prompt_path = PROMPTS / (name + ".txt")
        if not prompt_path.is_file():
            raise SystemExit("missing prompt " + str(prompt_path))
        print("generating", name)
        generate(name, prompt_path.read_text(encoding="utf-8").strip())


if __name__ == "__main__":
    main()
