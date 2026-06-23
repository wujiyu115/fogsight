#!/bin/bash

# Fogsight Development Startup Script
# Starts both the Python backend and Node.js renderer sidecar

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RENDERER_DIR="$SCRIPT_DIR/renderer"

cleanup() {
    echo ""
    echo "Shutting down..."
    kill $RENDERER_PID $BACKEND_PID 2>/dev/null
    wait $RENDERER_PID $BACKEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Install renderer dependencies if needed
if [ ! -d "$RENDERER_DIR/node_modules" ]; then
    echo "[setup] Installing renderer dependencies..."
    cd "$RENDERER_DIR" && npm install
    cd "$SCRIPT_DIR"
fi

# Start renderer sidecar (with hot reload)
echo "[renderer] Starting on port 3001 (hot reload)..."
cd "$RENDERER_DIR" && npm run dev &
RENDERER_PID=$!
cd "$SCRIPT_DIR"

# Wait for renderer to be ready
echo "[renderer] Waiting for bundle (this may take a minute on first run)..."
for i in $(seq 1 120); do
    if curl -s http://localhost:3001/health | grep -q '"status"'; then
        echo "[renderer] Ready."
        break
    fi
    if ! kill -0 $RENDERER_PID 2>/dev/null; then
        echo "[renderer] Failed to start. Check logs above."
        exit 1
    fi
    sleep 2
done

# Start Python backend (with hot reload)
echo "[backend] Starting on port 8001 (hot reload)..."
HOT_RELOAD=1 python "$SCRIPT_DIR/app.py" &
BACKEND_PID=$!

echo ""
echo "========================================="
echo "  Fogsight running at http://localhost:8001"
echo "  Renderer sidecar at http://localhost:3001"
echo "  Press Ctrl+C to stop"
echo "========================================="
echo ""

wait
