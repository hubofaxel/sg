#!/usr/bin/env bash
# check-boundaries.sh — enforce architecture boundaries
# Phaser imports must only appear inside packages/game/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
violations=0

# Rule 1: Phaser imports only in packages/game/
phaser_outside=$(grep -rn "from ['\"]phaser['\"]" \
	--include='*.ts' --include='*.svelte' \
	"$ROOT/apps" "$ROOT/packages/contracts" "$ROOT/packages/content" "$ROOT/packages/ui" \
	2>/dev/null || true)

if [ -n "$phaser_outside" ]; then
	echo "BOUNDARY VIOLATION: Phaser imported outside packages/game/"
	echo "$phaser_outside"
	violations=$((violations + 1))
fi

# Rule 2: @sg/game internals not imported (only barrel export allowed)
game_internals=$(grep -rn "from ['\"]@sg/game/src" \
	--include='*.ts' --include='*.svelte' \
	"$ROOT/apps" "$ROOT/packages" \
	2>/dev/null || true)

if [ -n "$game_internals" ]; then
	echo "BOUNDARY VIOLATION: @sg/game internals imported (use barrel export)"
	echo "$game_internals"
	violations=$((violations + 1))
fi

if [ "$violations" -gt 0 ]; then
	echo ""
	echo "$violations boundary violation(s) found."
	exit 1
fi

echo "Boundary checks passed."
