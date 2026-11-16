"""TTS 配音服务（离线批量生成工具，非实时服务链路）。

降级链：VoxCPM2（GPU） → edge-tts（云端） → Web Speech API（浏览器兜底）
VoxCPM2 环境路径由环境变量 VOXCPM2_PYTHON 配置（默认 D:/PythonEnvs/tts-voxcpm）。
实时 HTTP 服务见 tts_server.py；本模块供 generate_all_tts.py 批量预生成配音使用。
"""

import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# 优先从 config 模块导入（与 tts_server.py 共用）；失败则回退到环境变量/默认值。
try:
    # 当作为 prj/tts 包内的模块被导入时（如 `from services.tts_service import ...`）
    from config import VOXCPM2_MODEL_PATH, VOXCPM2_PYTHON  # type: ignore
except Exception:
    # VoxCPM2 Python 路径（独立虚拟环境）：可被环境变量 VOXCPM2_PYTHON 覆盖
    VOXCPM2_PYTHON = Path(
        os.environ.get("VOXCPM2_PYTHON", "D:/PythonEnvs/tts-voxcpm/Scripts/python.exe")
    )
    VOXCPM2_MODEL_PATH = os.environ.get("VOXCPM2_MODEL_PATH", "D:/HuggingFaceCache/VoxCPM2")

# 声线预设（VoxCPM2 自然语言描述；edge-tts 的 voice/rate/pitch 见 config.VOICE_PRESETS）
VOICE_PRESETS = {
    "gentle_mom": "温柔的女声，语速缓慢，充满关怀，像妈妈在给孩子讲睡前故事",
    "kind_grandpa": "低沉温暖的男声，语速舒缓，带着一丝微笑，像爷爷讲老故事",
    "lively_teacher": "明亮活泼的女声，语速适中，带着鼓励和热情，像幼儿园老师",
    "child": "稚嫩可爱的童声，语速较慢，字正腔圆，天真无邪",
}


def generate_tts(
    text: str,
    output_path: Path,
    voice_preset: str = "gentle_mom",
) -> tuple[Path, float]:
    """生成 TTS 音频。

    优先使用 VoxCPM2，失败时降级为 edge-tts。

    Args:
        text: 要朗读的文本。
        output_path: 输出音频路径（.wav 或 .mp3）。
        voice_preset: 声线预设名称。

    Returns:
        (音频路径, 时长秒数)
    """
    voice_desc = VOICE_PRESETS.get(voice_preset, VOICE_PRESETS["gentle_mom"])

    # 尝试 VoxCPM2
    if VOXCPM2_PYTHON.exists():
        try:
            return _generate_voxcpm2(text, output_path, voice_desc)
        except Exception as e:
            print(f"  VoxCPM2 失败，降级 edge-tts: {e}")

    # 降级 edge-tts
    return _generate_edge_tts(text, output_path)


def _generate_voxcpm2(
    text: str, output_path: Path, voice_description: str
) -> tuple[Path, float]:
    """通过子进程调用 VoxCPM2 环境生成音频。"""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 内联脚本在 VoxCPM2 环境中执行
    script = f'''
import sys
sys.stdout.reconfigure(encoding="utf-8")
from voxcpm import VoxCPM
import soundfile as sf

model_ref = {str(VOXCPM2_MODEL_PATH)!r}
model = VoxCPM.from_pretrained(
    model_ref,
    load_denoiser=False,
    local_files_only=__import__("pathlib").Path(model_ref).exists(),
)
# VoxCPM2 当前 Python API 不接受 voice_description 参数；声线设计使用正文前的括号提示。
full_text = {f'({voice_description})'!r} + {text!r}
wav = model.generate(
    text=full_text,
    cfg_value=2.0,
    inference_timesteps=10,
)
sample_rate = model.tts_model.sample_rate
sf.write(
    r"{output_path.as_posix()}",
    wav,
    sample_rate,
    format="MP3" if r"{output_path.suffix.lower()}" == ".mp3" else None,
    subtype="MPEG_LAYER_III" if r"{output_path.suffix.lower()}" == ".mp3" else None,
)
duration = len(wav) / sample_rate
print(f"OK|{{duration:.2f}}")
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
            timeout=120,
            encoding="utf-8",
        )
        if result.returncode != 0:
            raise RuntimeError(f"VoxCPM2 子进程失败: {result.stderr[:200]}")

        # 解析输出
        for line in result.stdout.strip().split("\n"):
            if line.startswith("OK|"):
                duration = float(line.split("|")[1])
                return output_path, duration

        raise RuntimeError("VoxCPM2 未返回有效输出")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _generate_edge_tts(text: str, output_path: Path) -> tuple[Path, float]:
    """使用 edge-tts 生成音频（降级方案）。"""
    import edge_tts

    output_path.parent.mkdir(parents=True, exist_ok=True)
    mp3_path = output_path.with_suffix(".mp3")

    async def _run():
        voice = "zh-CN-XiaoyiNeural"
        communicate = edge_tts.Communicate(text, voice=voice, rate="-10%", pitch="+6Hz")
        await communicate.save(str(mp3_path))

    asyncio.run(_run())

    # 获取时长
    try:
        import soundfile as sf

        info = sf.info(str(mp3_path))
        duration = info.duration
    except Exception:
        duration = len(text) * 0.3  # 粗估

    return mp3_path, duration
