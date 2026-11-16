@echo off
chcp 65001 >nul
setlocal

REM ============================================================
REM 本地 TTS 实时服务 - Windows 一键启动
REM ============================================================

REM 关键：设 HF 镜像，避免 VoxCPM2 在线下载卡死（即便用本地模型，留作保险）
set HF_ENDPOINT=https://hf-mirror.com
if "%VOXCPM2_PYTHON%"=="" set VOXCPM2_PYTHON=D:\PythonEnvs\tts-voxcpm\Scripts\python.exe
if "%VOXCPM2_MODEL_PATH%"=="" set VOXCPM2_MODEL_PATH=D:\HuggingFaceCache\VoxCPM2

REM 切到脚本所在目录（保证 cache/ 和 config.py 在同目录）
cd /d "%~dp0"

echo [start] 检查端口 %TTS_PORT%（默认 9885）...
if "%TTS_PORT%"=="" set TTS_PORT=9885
netstat -ano | findstr ":%TTS_PORT% " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo [start] [错误] 端口 %TTS_PORT% 已被占用。
    echo [start] 请用 `set TTS_PORT=新端口` 改端口后重试，或关闭占用该端口的程序。
    pause
    exit /b 1
)
echo [start] 端口 %TTS_PORT% 空闲。

echo [start] 检查 VoxCPM2 本地模型...
set MODEL_FILE=%VOXCPM2_MODEL_PATH%\model.safetensors
if "%VOXCPM2_MODEL_PATH%"=="" set MODEL_FILE=D:\HuggingFaceCache\VoxCPM2\model.safetensors
if not exist "%MODEL_FILE%" (
    echo [start] [提示] 未找到 %MODEL_FILE%
    echo [start] VoxCPM2 将不可用，服务会自动降级到 edge-tts（云端，需联网）。
    echo [start] 如需启用 VoxCPM2：下好模型后设环境变量 VOXCPM2_MODEL_PATH 指向模型目录。
) else (
    echo [start] VoxCPM2 本地模型就绪：%MODEL_FILE%
)

echo [start] 启动 TTS 服务 http://127.0.0.1:%TTS_PORT% ...
python tts_server.py
pause
