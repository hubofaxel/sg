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

| Agent | Model | Memory | Description |
|---|---|---|---|
HEADER

# Parse agent frontmatter
for f in .claude/agents/*.md; do
  name="" model="" desc="" memory="-"
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
        memory:*) memory="${line#memory: }" ;;
        description:*) desc="${line#description: }" ;;
      esac
    fi
  done < "$f"
  printf '| %s | %s | %s | %s |\n' "$name" "$model" "$memory" "$desc" >> "$OUT"
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
      else if (cmd.includes('agent-sessions') && cmd.includes('start')) desc = 'Log subagent start to .dev-logs/agent-sessions.jsonl';
      else if (cmd.includes('agent-sessions') && cmd.includes('stop')) desc = 'Log subagent stop to .dev-logs/agent-sessions.jsonl';
      const matcher = m.matcher || '*';
      console.log('| ' + event + ' | ' + matcher + ' | ' + desc + ' |');
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

# Context budget (computed from actual file word counts)
cat >> "$OUT" <<'BUDGET_HEADER'

## Context Budget

Estimated instruction tokens loaded per agent session (~0.75 tokens/word). Root CLAUDE.md is always loaded.

| Agent | Agent def | Skills | Est. tokens |
|---|---|---|---|
BUDGET_HEADER

root_words=$(wc -w < CLAUDE.md 2>/dev/null || echo 0)
root_tokens=$(( root_words * 3 / 4 ))

for f in .claude/agents/*.md; do
  name=""
  skills=()
  in_frontmatter=false
  in_skills=false
  while IFS= read -r line; do
    if [[ "$line" == "---" ]]; then
      if $in_frontmatter; then break; fi
      in_frontmatter=true
      continue
    fi
    if $in_frontmatter; then
      case "$line" in
        name:*) name="${line#name: }" ;;
        skills:*) in_skills=true ;;
        "  - "*)
          if $in_skills; then
            skills+=("${line#  - }")
          fi
          ;;
        *) in_skills=false ;;
      esac
    fi
  done < "$f"

  agent_words=$(wc -w < "$f" 2>/dev/null || echo 0)
  agent_tokens=$(( agent_words * 3 / 4 ))

  skill_parts=""
  skill_tokens=0
  for s in "${skills[@]}"; do
    sf=".claude/skills/$s/SKILL.md"
    if [[ -f "$sf" ]]; then
      sw=$(wc -w < "$sf" 2>/dev/null || echo 0)
      st=$(( sw * 3 / 4 ))
      skill_tokens=$(( skill_tokens + st ))
      if [[ -n "$skill_parts" ]]; then skill_parts+=", "; fi
      skill_parts+="$s ($st)"
    fi
  done
  [[ -z "$skill_parts" ]] && skill_parts="(none)"

  total=$(( root_tokens + agent_tokens + skill_tokens ))
  # Round to nearest 100, format as X.Yk
  rounded=$(( (total + 50) / 100 * 100 ))
  major=$(( rounded / 1000 ))
  minor=$(( (rounded % 1000) / 100 ))
  printf '| %s | %d | %s | ~%d.%dk |\n' "$name" "$agent_tokens" "$skill_parts" "$major" "$minor" >> "$OUT"
done

cat >> "$OUT" <<'BUDGET_FOOTER'

**Guideline:** Avoid loading more than 2 skills simultaneously. If a task spans multiple skill domains, break it into sequential steps.
BUDGET_FOOTER

echo "Generated $OUT"
