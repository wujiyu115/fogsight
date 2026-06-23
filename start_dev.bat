@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Fogsight Dev Server

set SCRIPT_DIR=%~dp0
set RENDERER_DIR=%SCRIPT_DIR%renderer

:: Install renderer dependencies if needed
if not exist "%RENDERER_DIR%\node_modules" (
    echo [setup] Installing renderer dependencies...
    cd /d "%RENDERER_DIR%"
    call npm install
    cd /d "%SCRIPT_DIR%"
)

:: Start renderer sidecar (with hot reload)
echo [renderer] Starting on port 3001 (hot reload)...
start /b "renderer" cmd /c "cd /d "%RENDERER_DIR%" && npm run dev"

:: Wait for renderer to be ready
echo [renderer] Waiting for bundle (this may take a minute on first run)...
set READY=0
for /l %%i in (1,1,120) do (
    if !READY!==1 goto :renderer_ready
    curl -s http://localhost:3001/health | findstr /c:"status" >nul 2>&1
    if !errorlevel!==0 (
        set READY=1
        goto :renderer_ready
    )
    timeout /t 2 /nobreak >nul
)
echo [renderer] Timed out waiting for renderer.
goto :eof

:renderer_ready
echo [renderer] Ready.

:: Start Python backend in foreground
echo [backend] Starting on port 8001 (hot reload)...
echo.
echo =========================================
echo   Fogsight running at http://localhost:8001
echo   Renderer sidecar at http://localhost:3001
echo   Press Ctrl+C to stop
echo =========================================
echo.

cd /d "%SCRIPT_DIR%"
set HOT_RELOAD=1
python app.py
