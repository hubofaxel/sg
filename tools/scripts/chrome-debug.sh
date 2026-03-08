#!/usr/bin/env bash
# tools/scripts/chrome-debug.sh — Launch Chrome with remote debugging for agent access
set -euo pipefail

PORT="${1:-5173}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -f "$CHROME" ]; then
  echo "Chrome not found at $CHROME"
  exit 1
fi

"$CHROME" \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/sg-chrome-debug" \
  --no-first-run \
  --no-default-browser-check \
  "http://localhost:$PORT/play" &

echo "Chrome debug launched on port 9222 → http://localhost:$PORT/play"
