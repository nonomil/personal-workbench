@echo off
chcp 65001 >nul
set "ROOT=%~dp0..\..\.."
cd /d "%ROOT%"
start "blocklegend" /min python -m http.server 4196 --bind 127.0.0.1
if errorlevel 1 start "blocklegend" /min py -m http.server 4196 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:4196/prj/games/blocklegend/index.html"
