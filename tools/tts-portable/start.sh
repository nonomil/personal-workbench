#!/usr/bin/env bash
# ============================================================
# 本地 TTS 实时服务 - Linux/Mac/Git Bash 一键启动
# 用法：bash start.sh  （或 chmod +x start.sh && ./start.sh）
# ============================================================
set -u

# 关键：设 HF 镜像，避免 VoxCPM2 在线下载卡死（即便用本地模型，留作保险）
export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"

# 切到脚本所在目录（保证 cache/ 和 config.py 在同目录）
cd "$(dirname "$0")" || exit 1

# 端口（默认 9885，避开常见 LLM 代理端口 8765）
TTS_PORT="${TTS_PORT:-9885}"

echo "[start] 检查端口 ${TTS_PORT} ..."
PORT_OK=1
if command -v ss >/dev/null 2>&1; then
    if ss -ltn 2>/dev/null | grep -q ":${TTS_PORT} "; then PORT_OK=0; fi
elif command -v netstat >/dev/null 2>&1; then
    if netstat -ltn 2>/dev/null | grep -q ":${TTS_PORT} "; then PORT_OK=0; fi
else
    echo "[start] [警告] 未找到 ss/netstat，跳过端口检查。"
fi
if [ "${PORT_OK}" -eq 0 ]; then
    echo "[start] [错误] 端口 ${TTS_PORT} 已被占用。"
    echo "[start] 请用 \`TTS_PORT=新端口 bash start.sh\` 改端口后重试，或关闭占用该端口的程序。"
    exit 1
fi
echo "[start] 端口 ${TTS_PORT} 空闲。"

echo "[start] 检查 VoxCPM2 本地模型 ..."
MODEL_PATH="${VOXCPM2_MODEL_PATH:-D:/HuggingFaceCache/VoxCPM2}"
MODEL_FILE="${MODEL_PATH}/model.safetensors"
if [ ! -f "${MODEL_FILE}" ]; then
    echo "[start] [提示] 未找到 ${MODEL_FILE}"
    echo "[start] VoxCPM2 将不可用，服务会自动降级到 edge-tts（云端，需联网）。"
    echo "[start] 如需启用 VoxCPM2：下好模型后设环境变量 VOXCPM2_MODEL_PATH 指向模型目录。"
else
    echo "[start] VoxCPM2 本地模型就绪：${MODEL_FILE}"
fi

echo "[start] 启动 TTS 服务 http://127.0.0.1:${TTS_PORT} ..."
# 优先用 python3，回退 python
if command -v python3 >/dev/null 2>&1; then
    python3 tts_server.py
else
    python tts_server.py
fi
