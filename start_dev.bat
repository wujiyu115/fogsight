@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Fogsight Dev Server

set "SCRIPT_DIR=%~dp0"
set "RENDERER_DIR=%SCRIPT_DIR%renderer"
set "HF_DIR=%SCRIPT_DIR%renderer-hyperframes"
set "RV_DIR=%SCRIPT_DIR%renderer-rendervid"

:: ── Remotion renderer (required) ──
if not exist "%RENDERER_DIR%\node_modules" (
    echo [remotion] Installing dependencies...
    cd /d "%RENDERER_DIR%" && call npm install && cd /d "%SCRIPT_DIR%"
)
echo [remotion] Starting on port 3001...
start "" /b cmd /c "cd /d %RENDERER_DIR% && npm run dev"

:: ── HyperFrames renderer (optional) ──
if not exist "%HF_DIR%\package.json" goto skip_hf
if not exist "%HF_DIR%\node_modules" (
    echo [hyperframes] Installing dependencies...
    cd /d "%HF_DIR%" && call npm install && cd /d "%SCRIPT_DIR%"
)
echo [hyperframes] Starting on port 3002...
start "" /b cmd /c "cd /d %HF_DIR% && npm run dev"
:skip_hf

:: ── RenderVid renderer (optional) ──
if not exist "%RV_DIR%\package.json" goto skip_rv
if not exist "%RV_DIR%\node_modules" (
    echo [rendervid] Installing dependencies...
    cd /d "%RV_DIR%" && call npm install && cd /d "%SCRIPT_DIR%"
)
echo [rendervid] Starting on port 3003...
start "" /b cmd /c "cd /d %RV_DIR% && npm run dev"
:skip_rv

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

:: ── Check optional renderers ──
curl -s http://localhost:3002/health >nul 2>&1
if !errorlevel!==0 (
    echo [hyperframes] Ready.
) else (
    echo [hyperframes] Not available.
)
curl -s http://localhost:3003/health >nul 2>&1
if !errorlevel!==0 (
    echo [rendervid] Ready.
) else (
    echo [rendervid] Not available.
)

:: ── Start Python backend ──
echo.
echo =========================================
echo   Fogsight running at http://localhost:8001
echo   Remotion          at http://localhost:3001
echo   HyperFrames       at http://localhost:3002
echo   RenderVid         at http://localhost:3003
echo   Press Ctrl+C to stop
echo =========================================
echo.

cd /d "%SCRIPT_DIR%"
set HOT_RELOAD=1
python app.py

:end
