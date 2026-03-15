#!/usr/bin/env bash
# Query the agent audit log (.dev-logs/agent-audit.jsonl)
# Usage:
#   bash tools/scripts/audit-query.sh --last 20
#   bash tools/scripts/audit-query.sh --agent phaser-integrator
#   bash tools/scripts/audit-query.sh --file packages/game/
#   bash tools/scripts/audit-query.sh --since "1 hour ago"
#   bash tools/scripts/audit-query.sh --branch feat/stage-3
#   Flags can be combined.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
LOG=".dev-logs/agent-audit.jsonl"

if [[ ! -f "$LOG" ]]; then
  echo "No audit log found at $LOG"
  exit 0
fi

last=0
agent=""
file_pattern=""
since=""
branch=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --last) last="$2"; shift 2 ;;
    --agent) agent="$2"; shift 2 ;;
    --file) file_pattern="$2"; shift 2 ;;
    --since) since="$2"; shift 2 ;;
    --branch) branch="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: audit-query.sh [--last N] [--agent NAME] [--file PATTERN] [--since DATE] [--branch NAME]"
      exit 0
      ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# Build a jq filter chain
filter="."

if [[ -n "$agent" ]]; then
  filter="$filter | select(.agent == \"$agent\" or (.agent == null and \"$agent\" == \"main\"))"
fi

if [[ -n "$file_pattern" ]]; then
  filter="$filter | select(.file | contains(\"$file_pattern\"))"
fi

if [[ -n "$branch" ]]; then
  filter="$filter | select(.branch // \"\" | contains(\"$branch\"))"
fi

if [[ -n "$since" ]]; then
  since_ts=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$(date -u -v-"${since// /}" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || true)
  if [[ -n "$since_ts" ]]; then
    filter="$filter | select(.ts >= \"$since_ts\")"
  else
    echo "Warning: could not parse --since \"$since\", showing all entries" >&2
  fi
fi

if [[ "$last" -gt 0 ]]; then
  tail -"$last" "$LOG" | jq -c "$filter" 2>/dev/null || tail -"$last" "$LOG"
else
  jq -c "$filter" "$LOG" 2>/dev/null || cat "$LOG"
fi
