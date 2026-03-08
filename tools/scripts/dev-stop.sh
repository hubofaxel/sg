#!/usr/bin/env bash
# tools/scripts/dev-stop.sh — Stop the dev server started by dev-server.sh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PID_FILE="$PROJECT_DIR/.dev-logs/vite-dev.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" 2>/dev/null
  echo "Dev server stopped (PID $(cat "$PID_FILE"))"
  rm -f "$PID_FILE"
else
  echo "No dev server running"
fi
