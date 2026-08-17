@echo off
chcp 65001 >nul
cd /d "%~dp0"
if "%OPENAI_API_KEY%"=="" echo No OPENAI_API_KEY yet. Chat stays off unless you paste a key in 设. TTS still works if edge-tts is installed.
node tools\buddy-proxy.mjs
if errorlevel 1 pause
