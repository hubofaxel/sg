#!/usr/bin/env bash
# Generate AGENTS.md from .claude/ source files.
# Run: pnpm agents:sync
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OUT="AGENTS.md"

cat > "$OUT" <<'HEADER'
# ship-game -- Agentic Configuration

> Auto-generated from `.claude/` source files. Do not edit manually.
> Run `pnpm agents:sync` to regenerate.

## Agents

| Agent | Model | Description |
|---|---|---|
HEADER

# Parse agent frontmatter
for f in .claude/agents/*.md; do
  name="" model="" desc=""
  in_frontmatter=false
  while IFS= read -r line; do
    if [[ "$line" == "---" ]]; then
      if $in_frontmatter; then break; fi
      in_frontmatter=true
      continue
    fi
    if $in_frontmatter; then
      case "$line" in
        name:*) name="${line#name: }" ;;
        model:*) model="${line#model: }" ;;
        description:*) desc="${line#description: }" ;;
      esac
    fi
  done < "$f"
  printf '| %s | %s | %s |\n' "$name" "$model" "$desc" >> "$OUT"
done

cat >> "$OUT" <<'SKILLS_HEADER'

## Skills (`.claude/skills/`)

| Skill | Trigger |
|---|---|
SKILLS_HEADER

# Parse skill trigger from first non-empty line of each SKILL.md
for d in .claude/skills/*/; do
  skill_name="$(basename "$d")"
  trigger=""
  if [[ -f "$d/SKILL.md" ]]; then
    # Read the description line (first line after any frontmatter)
    in_fm=false
    while IFS= read -r line; do
      if [[ "$line" == "---" ]]; then
        if $in_fm; then in_fm=false; continue; fi
        in_fm=true; continue
      fi
      if ! $in_fm && [[ -n "$line" ]]; then
        trigger="${line#\#* }"
        break
      fi
    done < "$d/SKILL.md"
  fi
  printf '| %s | %s |\n' "$skill_name" "$trigger" >> "$OUT"
done

# Hooks from settings.json
cat >> "$OUT" <<'HOOKS_HEADER'

## Hooks

| Hook | Matcher | Action |
|---|---|---|
HOOKS_HEADER

# Parse hooks from settings.json using node (avoids jq dependency)
node -e "
const s = require('./.claude/settings.json');
for (const [event, matchers] of Object.entries(s.hooks || {})) {
  for (const m of matchers) {
    for (const h of m.hooks || []) {
      const cmd = h.command || '';
      // Extract a short description from the command
      let desc = cmd;
      if (cmd.includes('load-env')) desc = 'Load direnv env vars via CLAUDE_ENV_FILE';
      else if (cmd.includes('agent-audit')) desc = 'Append to session audit log (.dev-logs/agent-audit.jsonl)';
      else if (cmd.includes('vite-dev.log')) desc = 'Check vite dev log for errors after .svelte/.ts/.js/.css edits';
      else if (cmd.includes('curl') && cmd.includes('localhost')) desc = 'Warn if dev server is not running';
      else if (cmd.includes('branch') && cmd.includes('main')) desc = 'Block edits on main branch';
      else if (cmd.includes('biome')) desc = 'Auto-format with Biome';
      console.log('| ' + event + ' | ' + m.matcher + ' | ' + desc + ' |');
    }
  }
}
" >> "$OUT"

# Commands
cat >> "$OUT" <<'CMD_HEADER'

## Commands (`.claude/commands/`)

| Command | Purpose |
|---|---|
CMD_HEADER

for f in .claude/commands/*.md; do
  cmd_name="$(basename "$f" .md)"
  # First line is the description
  purpose="$(head -1 "$f")"
  printf '| /%s | %s |\n' "$cmd_name" "$purpose" >> "$OUT"
done

echo "" >> "$OUT"
echo "Note: \`/commit\` is a built-in skill, not a custom command file." >> "$OUT"

# Context budget (static section — update manually when agent definitions change significantly)
cat >> "$OUT" <<'BUDGET'

## Context Budget

Estimated instruction tokens loaded per agent session (~0.75 tokens/word). Root CLAUDE.md (~360 tokens) is always loaded.

| Agent | Package CLAUDE.md | Agent def | Likely skills | Est. total |
|---|---|---|---|---|
| phaser-integrator | game (790) | 260 | phaser4-rc (505), mobile-adaptation (570), sveltekit-phaser-seam (420) | ~2.9k max |
| svelte-shell | web (120) | 180 | sveltekit-phaser-seam (420), browser-debugging (475) | ~1.6k max |
| schema-validator | contracts (185) | 120 | zod4-content-schemas (210) | ~0.9k |
| asset-pipeline | asset-gen (575) | 475 | asset-generation (595) | ~2.0k |
| test-runner | (varies) | 125 | (none typical) | ~0.5k base |
| pr-shipper | (none) | 160 | trunk-based-dev (145) | ~0.7k |
| diagnostician | (varies) | 200 | browser-debugging (475) | ~1.0k |

**Guideline:** Avoid loading more than 2 skills simultaneously. If a task spans multiple skill domains, break it into sequential steps.
BUDGET

echo "Generated $OUT"
