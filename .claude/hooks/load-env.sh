#!/usr/bin/env bash
# Load project env vars into Claude Code session via CLAUDE_ENV_FILE.
# Runs on SessionStart — direnv exports are available to all Bash commands.

[ -z "$CLAUDE_ENV_FILE" ] && exit 0

if command -v direnv &>/dev/null && [ -f .envrc ]; then
  direnv export bash 2>/dev/null >> "$CLAUDE_ENV_FILE"
fi
