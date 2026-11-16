"""本地 TTS 实时服务（FastAPI，可移植）。

为任意前端提供 HTTP TTS 接口，朗读动态文本：
  - GET  /health   健康检查（引擎可用性 + 缓存）
  - GET  /voices   音色列表
  - POST /tts      文本 → mp3（FileResponse），失败返回 fallback JSON

降级链：VoxCPM2（GPU，需独立虚拟环境）→ edge-tts（云端，需联网）→ 前端 Web Speech 兜底。

启动：python tts_server.py  （默认 127.0.0.1:9885，见 config.py）
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Literal

# 确保能 import 同级 config.py
sys.path.insert(0, str(Path(__file__).parent.resolve()))

import edge_tts  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from config import (  # noqa: E402
    CACHE_DIR,
    HOST,
    MAX_TEXT_LEN,
    PORT,
    VOICE_PRESETS,
    VOXCPM2_MODEL_PATH,
    VOXCPM2_PYTHON,
    VOXCPM2_TIMEOUT,
)

# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────
app = FastAPI(title="本地 TTS 实时服务", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# 请求模型
# ─────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str = Field(..., description="要朗读的文本（裁断到 500 字）")
    voice: Literal["mom", "grandpa", "teacher", "child"] = "mom"
    lang: Literal["zh-CN", "en-US"] = "zh-CN"
    engine: Literal["auto", "edge", "voxcpm2"] = "auto"


# ─────────────────────────────────────────────
# 工具
# ─────────────────────────────────────────────
def _cache_path(text: str, voice: str, engine: str) -> Path:
    """MD5(text|voice|engine) → 缓存文件路径"""
    key = f"{text}|{voice}|{engine}"
    h = hashlib.md5(key.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{h}.mp3"


def _media_type_by_content(path: Path) -> str:
    """按文件头判断音频格式返回 content-type。
    VoxCPM2 经 soundfile 写 RIFF WAV，edge-tts 写 MP3；缓存名统一 .mp3 但内容可能不一致，
    故按内容返回，避免 '后缀.mp3 / 实际WAV / content-type audio/mpeg' 三不一致导致播放问题。"""
    try:
        with open(path, "rb") as f:
            head = f.read(4)
        if head[:4] == b"RIFF":
            return "audio/wav"
    except Exception:
        pass
    return "audio/mpeg"


def _voxcpm2_model_ready() -> bool:
    """VoxCPM2 是否真正就绪：虚拟环境在位 + 模型权重可用。
    优先检查本地模型路径（复用已下好的权重，免下载），回退检查 HF hub 缓存（在线下载模式）。"""
    if not VOXCPM2_PYTHON.exists():
        return False
    # 1. 本地模型路径（VOXCPM2_MODEL_PATH 指向的扁平目录，如 D:/HuggingFaceCache/VoxCPM2）
    if VOXCPM2_MODEL_PATH:
        st = Path(VOXCPM2_MODEL_PATH) / "model.safetensors"
        if st.exists():
            try:
                if st.stat().st_size > 100 * 1024 * 1024:  # >100MB 才算完整权重
                    return True
            except Exception:
                pass
    # 2. 回退：HF hub 缓存（在线下载模式，排除 .incomplete）
    snaps = (
        Path.home()
        / ".cache"
        / "huggingface"
        / "hub"
        / "models--openbmb--VoxCPM2"
        / "snapshots"
    )
    if not snaps.exists():
        return False
    for snap_dir in snaps.iterdir():
        if not snap_dir.is_dir():
            continue
        for f in snap_dir.iterdir():
            name = f.name.lower()
            if name.endswith((".safetensors", ".bin", ".pt")) and not name.endswith(".incomplete"):
                try:
                    if f.stat().st_size > 1024 * 1024:
                        return True
                except Exception:
                    pass
    return False


def _fallback(error: str):
    """统一失败响应：HTTP 200 + {error, fallback:true}，让前端走 Web Speech 兜底"""
    return JSONResponse({"error": error, "fallback": True}, status_code=200)


def _edge_preset(voice_key: str, lang: str) -> dict[str, str]:
    preset = VOICE_PRESETS[voice_key]
    by_lang = preset.get("edgeByLang", {})
    if isinstance(by_lang, dict) and isinstance(by_lang.get(lang), dict):
        return by_lang[lang]
    return preset["edge"]


def _voxcpm_prompt(voice_key: str, lang: str) -> str:
    preset = VOICE_PRESETS[voice_key]
    by_lang = preset.get("voxcpmByLang", {})
    if isinstance(by_lang, dict) and by_lang.get(lang):
        return str(by_lang[lang])
    return str(preset["voxcpm"])


async def _generate_edge(text: str, voice_key: str, out_path: Path, lang: str = "zh-CN") -> None:
    """edge-tts 异步生成（在 async 路由里直接 await，禁止 asyncio.run 嵌套）"""
    preset = _edge_preset(voice_key, lang)
    comm = edge_tts.Communicate(
        text,
        voice=preset["voice"],
        rate=preset["rate"],
        pitch=preset["pitch"],
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    await comm.save(str(out_path))


def _generate_voxcpm2(text: str, voice_key: str, out_path: Path, lang: str = "zh-CN") -> None:
    """VoxCPM2 子进程生成（独立 GPU 虚拟环境）。失败抛异常由调用方降级。"""
    if not VOXCPM2_PYTHON.exists():
        raise FileNotFoundError(f"VOXCPM2_PYTHON 不存在: {VOXCPM2_PYTHON}")

    voice_desc = _voxcpm_prompt(voice_key, lang)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_posix = out_path.as_posix()
    # 模型路径：优先本地（复用已下好的权重，免下载），回退在线名（需联网下载）
    model_path = VOXCPM2_MODEL_PATH or "openbmb/VoxCPM2"

    # 内联脚本在 VoxCPM2 环境中执行（参考 services/tts_service.py）
    script = f'''
import sys
sys.stdout.reconfigure(encoding="utf-8")
from voxcpm import VoxCPM
import soundfile as sf
from pathlib import Path

model_ref = {model_path!r}
model = VoxCPM.from_pretrained(
    model_ref,
    load_denoiser=False,
    local_files_only=Path(model_ref).exists(),
)
# text-based 声线设计：声线描述（带括号）拼到文本前作为音色指令（本地 voxcpm 已验证，非 voice_description）
full_text = {voice_desc!r} + {text!r}
wav = model.generate(
    text=full_text,
    cfg_value=2.0,
    inference_timesteps=10,
)
sample_rate = model.tts_model.sample_rate
sf.write(
    r"{out_posix}",
    wav,
    sample_rate,
    format="MP3",
    subtype="MPEG_LAYER_III",
)
print("OK")
'''
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(script)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [str(VOXCPM2_PYTHON), tmp_path],
            capture_output=True,
            text=True,
            timeout=VOXCPM2_TIMEOUT,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode != 0 or "OK" not in (result.stdout or ""):
            raise RuntimeError(f"VoxCPM2 子进程失败: {(result.stderr or '')[:200]}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ─────────────────────────────────────────────
# 路由
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    """健康检查：voxcpm2=环境是否存在；edge=始终 True（导入即说明依赖在）；gpu 简化为环境存在性"""
    vox_ready = _voxcpm2_model_ready()
    return {"ok": True, "voxcpm2": vox_ready, "edge": True, "gpu": vox_ready}


@app.get("/voices")
def voices():
    """音色列表（前端面板展示）"""
    return {
        "voices": [
            {"key": k, "label": v["label"]} for k, v in VOICE_PRESETS.items()
        ]
    }


@app.post("/tts")
async def tts(req: TTSRequest):
    """文本 → mp3。成功返回 audio/mpeg；失败返回 {error, fallback:true}。"""
    # 1. 文本清洗 + 裁断
    text = (req.text or "").strip()
    if not text:
        return _fallback("text 为空")
    if len(text) > MAX_TEXT_LEN:
        text = text[:MAX_TEXT_LEN]

    voice = req.voice
    engine = req.engine

    # 2. 命中缓存直接返回
    mp3_path = _cache_path(text, voice, engine)
    if mp3_path.exists() and mp3_path.stat().st_size > 100:
        return FileResponse(mp3_path, media_type=_media_type_by_content(mp3_path))

    # 3. 引擎选择与降级
    #    - engine=edge       → 强制 edge
    #    - engine=voxcpm2    → 强制 VoxCPM2（失败则 error）
    #    - engine=auto       → VoxCPM2（若环境可用）→ 失败降级 edge
    try:
        if engine == "edge":
            await _generate_edge(text, voice, mp3_path, req.lang)
        elif engine == "voxcpm2":
            _generate_voxcpm2(text, voice, mp3_path, req.lang)
        else:  # auto
            if _voxcpm2_model_ready():
                try:
                    _generate_voxcpm2(text, voice, mp3_path, req.lang)
                except Exception as e:
                    # VoxCPM2 失败 → 降级 edge（写日志，前端无感）
                    print(f"[tts] VoxCPM2 失败，降级 edge-tts: {e}", flush=True)
                    await _generate_edge(text, voice, mp3_path, req.lang)
            else:
                await _generate_edge(text, voice, mp3_path, req.lang)
    except Exception as e:
        return _fallback(str(e))

    # 4. 返回音频
    return FileResponse(mp3_path, media_type=_media_type_by_content(mp3_path))


# ─────────────────────────────────────────────
# 入口
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    print(f"[tts] VOXCPM2_PYTHON = {VOXCPM2_PYTHON} (exists={VOXCPM2_PYTHON.exists()})")
    print(f"[tts] CACHE_DIR = {CACHE_DIR}")
    print(f"[tts] 启动 http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT)
