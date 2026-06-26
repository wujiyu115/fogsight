@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Fogsight Dev Server

set "SCRIPT_DIR=%~dp0"
set "RENDERER_DIR=%SCRIPT_DIR%renderer"

:: ── Remotion renderer ──
if not exist "%RENDERER_DIR%\node_modules" (
    echo [remotion] Installing dependencies...
    cd /d "%RENDERER_DIR%" && call npm install && cd /d "%SCRIPT_DIR%"
)
echo [remotion] Starting on port 3001...
start "" /b cmd /c "cd /d %RENDERER_DIR% && npm run dev"

:: ── Wait for Remotion renderer ──
echo [remotion] Waiting for bundle (this may take a minute on first run)...
set READY=0
for /l %%i in (1,1,120) do (
    if !READY!==1 goto renderer_ready
    curl -s http://localhost:3001/health | findstr /c:"status" >nul 2>&1
    if !errorlevel!==0 (
        set READY=1
        goto renderer_ready
    )
    timeout /t 2 /nobreak >nul
)
echo [remotion] Timed out waiting for renderer.
goto end

:renderer_ready
echo [remotion] Ready.

:: ── Start Python backend ──
echo.
echo =========================================
echo   Fogsight running at http://localhost:8001
echo   Remotion          at http://localhost:3001
echo   Press Ctrl+C to stop
echo =========================================
echo.

cd /d "%SCRIPT_DIR%"
set HOT_RELOAD=1
python app.py

:end
