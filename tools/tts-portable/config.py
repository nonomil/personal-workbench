"""TTS 配置：路径、服务参数、音色预设。

被 tts_server.py（实时服务）和 services/tts_service.py（引擎工具）共用。
所有路径/端口均可被同名环境变量覆盖。
"""

import os
from pathlib import Path

# VoxCPM2 Python 路径（独立虚拟环境，需 NVIDIA GPU）。
# 用途：实时服务通过 subprocess 调用这个 python 执行内联脚本，避免在主服务进程加载 torch（省内存、隔离依赖）。
# 默认：D:/PythonEnvs/tts-voxcpm/Scripts/python.exe（Windows）；Linux/Mac 改成对应 venv 的 python 路径。
# 如何改：设环境变量 VOXCPM2_PYTHON，或在 .env / start 脚本里覆盖。留空或路径不存在 → 自动降级 edge-tts。
VOXCPM2_PYTHON = Path(
    os.environ.get("VOXCPM2_PYTHON", "D:/PythonEnvs/tts-voxcpm/Scripts/python.exe")
)

# VoxCPM2 模型本地路径：复用已下好的权重（如 D:/HuggingFaceCache/VoxCPM2，约 4.7GB），避免重新下载。
# 该目录是扁平结构（model.safetensors + audiovae.pth + config.json + tokenizer.json 等），
# 直接传给 VoxCPM.from_pretrained。
# 用途：免联网下载、加速冷启动；_voxcpm2_model_ready() 会检查 model.safetensors 是否 >100MB 判断是否就绪。
# 如何改：设环境变量 VOXCPM2_MODEL_PATH。留空 → 回退在线名 openbmb/VoxCPM2（需联网下载，国内建议配 HF_ENDPOINT 镜像）。
VOXCPM2_MODEL_PATH = os.environ.get("VOXCPM2_MODEL_PATH", "D:/HuggingFaceCache/VoxCPM2")

# FastAPI 服务监听地址。
# 用途：默认 127.0.0.1 仅本机访问（安全）；如需局域网/容器外访问，设 TTS_HOST=0.0.0.0。
HOST = os.environ.get("TTS_HOST", "127.0.0.1")

# FastAPI 服务监听端口。
# 默认 9885，刻意避开 8765（常见 LLM 代理端口，避免冲突）。
# 如何改：设环境变量 TTS_PORT；start.bat / start.sh 也会检查端口占用并提示。
PORT = int(os.environ.get("TTS_PORT", "9885"))

# 实时服务音频缓存目录（按 MD5(text|voice|engine) 命名，命中缓存直接返回，省重复合成）。
# 默认与本文件同级的 cache/，启动时自动创建。已在 .gitignore 忽略。
CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 单次请求文本上限（裁断到该长度，避免长文本拖慢合成 / 滥用）。
# 默认 500 字，覆盖大多数短句朗读场景；如需更长，直接改此常量。
MAX_TEXT_LEN = 500

# VoxCPM2 子进程超时（秒）。冷启动 import torch + 加载模型 + generate 常 >120s，故默认 300。
# 国内首次还需从 HuggingFace 下载模型（数 GB），建议启动前设镜像加速：
#   Windows CMD:  set HF_ENDPOINT=https://hf-mirror.com
#   Git Bash:     export HF_ENDPOINT=https://hf-mirror.com
# （子进程继承父进程环境变量；亦可设 HF_TOKEN 解除匿名限速）
VOXCPM2_TIMEOUT = int(os.environ.get("VOXCPM2_TIMEOUT", "300"))

# 音色预设：
#   edge   —— edge-tts 用 voice name + rate + pitch
#   voxcpm —— VoxCPM2 用 text 前缀声线指令（括号描述拼到文本前，本地包已验证；非 voice_description）
#   label  —— 前端展示名
VOICE_PRESETS = {
    "mom": {
        "label": "温柔妈妈",
        "edge": {"voice": "zh-CN-XiaoxiaoNeural", "rate": "-8%", "pitch": "+4Hz"},
        "edgeByLang": {
            "zh-CN": {"voice": "zh-CN-XiaoxiaoNeural", "rate": "-8%", "pitch": "+4Hz"},
            "en-US": {"voice": "en-US-JennyNeural", "rate": "-8%", "pitch": "+2Hz"},
        },
        "voxcpm": "(年轻女性，声音温柔甜美，讲故事的语调)",
        "voxcpmByLang": {
            "zh-CN": "(年轻女性，声音温柔甜美，讲故事的语调)",
            "en-US": "(warm clear female teacher voice, gentle story-telling tone)",
        },
    },
    "grandpa": {
        "label": "温暖爷爷",
        "edge": {"voice": "zh-CN-YunjianNeural", "rate": "-10%", "pitch": "-2Hz"},
        "edgeByLang": {
            "zh-CN": {"voice": "zh-CN-YunjianNeural", "rate": "-10%", "pitch": "-2Hz"},
            "en-US": {"voice": "en-US-GuyNeural", "rate": "-10%", "pitch": "-2Hz"},
        },
        "voxcpm": "(老年男性，声音慈祥缓慢，像爷爷讲故事)",
        "voxcpmByLang": {
            "zh-CN": "(老年男性，声音慈祥缓慢，像爷爷讲故事)",
            "en-US": "(warm older male storyteller voice, calm and clear)",
        },
    },
    "teacher": {
        "label": "活泼老师",
        "edge": {"voice": "zh-CN-XiaoyiNeural", "rate": "+0%", "pitch": "+6Hz"},
        "edgeByLang": {
            "zh-CN": {"voice": "zh-CN-XiaoyiNeural", "rate": "+0%", "pitch": "+6Hz"},
            "en-US": {"voice": "en-US-AriaNeural", "rate": "-2%", "pitch": "+4Hz"},
        },
        "voxcpm": "(年轻女性，声音清晰温柔，老师上课的语调)",
        "voxcpmByLang": {
            "zh-CN": "(年轻女性，声音清晰温柔，老师上课的语调)",
            "en-US": "(clear friendly female teacher voice, lively classroom tone)",
        },
    },
    "child": {
        "label": "可爱童声",
        "edge": {"voice": "zh-CN-XiaoyiNeural", "rate": "-15%", "pitch": "+8Hz"},
        "edgeByLang": {
            "zh-CN": {"voice": "zh-CN-XiaoyiNeural", "rate": "-15%", "pitch": "+8Hz"},
            "en-US": {"voice": "en-US-JennyNeural", "rate": "-15%", "pitch": "+8Hz"},
        },
        "voxcpm": "(小女孩，六岁左右，活泼可爱)",
        "voxcpmByLang": {
            "zh-CN": "(小女孩，六岁左右，活泼可爱)",
            "en-US": "(young child voice, cheerful and playful)",
        },
    },
}
