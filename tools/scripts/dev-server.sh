#!/usr/bin/env bash
# tools/scripts/dev-server.sh — Agent-friendly dev server launcher
# Starts Vite dev server with output logged to .dev-logs/vite-dev.log
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="$PROJECT_DIR/.dev-logs"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/vite-dev.log"
PID_FILE="$LOG_DIR/vite-dev.pid"

# Kill previous instance if running
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Stopping previous dev server (PID $(cat "$PID_FILE"))..."
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  sleep 1
fi

# Clear previous log
: > "$LOG_FILE"

# Start dev server, tee to log file
cd "$PROJECT_DIR/apps/web"
npx vite dev --port 5173 --host 127.0.0.1 2>&1 | tee "$LOG_FILE" &
DEV_PID=$!
echo "$DEV_PID" > "$PID_FILE"

# Wait for ready signal
for i in $(seq 1 30); do
  if grep -q "Local:" "$LOG_FILE" 2>/dev/null; then
    echo "Dev server ready (PID $DEV_PID, log at .dev-logs/vite-dev.log)"
    exit 0
  fi
  sleep 1
done

echo "Dev server failed to start within 30s"
tail -20 "$LOG_FILE"
exit 1
