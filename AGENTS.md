# ship-game -- Agentic Configuration

> Auto-generated from `.claude/` source files. Do not edit manually.
> Run `pnpm agents:sync` to regenerate.

## Agents

| Agent | Model | Memory | Description |
|---|---|---|---|
| asset-pipeline | opus | project | Manages asset generation, manifests, and placeholder pipeline |
| diagnostician | sonnet | project | Diagnoses runtime errors by reading dev server logs, browser console, and network state. Delegate when something renders wrong or crashes. |
| phaser-integrator | opus | project | Implements Phaser 4 RC game features within the isolation boundary |
| pr-shipper | sonnet | - | Atomic trunk-based shipping — branch, commit, land |
| schema-validator | sonnet | - | Validates content JSON against Zod 4 contracts and enforces schema-first development |
| svelte-shell | sonnet | - | Builds and maintains the SvelteKit app shell around the Phaser game |
| test-runner | sonnet | - | Runs and maintains the test suite across Vitest and Playwright |

## Skills (`.claude/skills/`)

| Skill | Trigger |
|---|---|
| asset-generation | Asset Generation Patterns |
| browser-debugging | Browser Debugging Workflow |
| mobile-adaptation | Mobile Adaptation — Architecture Context |
| monorepo-conventions | Monorepo Conventions |
| phaser4-rc | Phaser 4 RC — Working Notes |
| pwa-delivery | PWA Delivery with @vite-pwa/sveltekit |
| sveltekit-phaser-seam | SvelteKit <-> Phaser Integration Seam |
| trunk-based-dev | Trunk-Based Development |
| zod4-content-schemas | Zod 4 Content Schema Patterns |

## Hooks

| Hook | Matcher | Action |
|---|---|---|
| SessionStart | cli | Load direnv env vars via CLAUDE_ENV_FILE |
| SessionStart | cli | Warn if dev server is not running |
| PreToolUse | Edit|MultiEdit|Write | Block edits on main branch |
| PostToolUse | Edit|MultiEdit|Write | Auto-format with Biome |
| PostToolUse | Edit|MultiEdit|Write | Check vite dev log for errors after .svelte/.ts/.js/.css edits |
| PostToolUse | Edit|MultiEdit|Write | Append to session audit log (.dev-logs/agent-audit.jsonl) |

## Commands (`.claude/commands/`)

| Command | Purpose |
|---|---|
| /add-asset | Add a new asset key to the asset pipeline. |
| /add-scene | Create a new Phaser 4 scene and wire it into the game runtime. |
| /add-schema | Create a new Zod 4 schema, its tests, and sample content. |
| /bootstrap | Scaffold the complete ship-game monorepo from scratch. |
| /check | Run the full quality gate sweep and report results. |
| /land | Ship current changes to main using trunk-based workflow. |
| /vertical-slice | Build the Stage 3 vertical slice — one complete playable loop. |

Note: `/commit` is a built-in skill, not a custom command file.

## Context Budget

Estimated instruction tokens loaded per agent session (~0.75 tokens/word). Root CLAUDE.md is always loaded.

| Agent | Agent def | Skills | Est. tokens |
|---|---|---|---|
| asset-pipeline | 518 | asset-generation (594), monorepo-conventions (165) | ~1.7k |
| diagnostician | 239 | browser-debugging (474) | ~1.1k |
| phaser-integrator | 300 | phaser4-rc (505), sveltekit-phaser-seam (418) | ~1.6k |
| pr-shipper | 159 | trunk-based-dev (142) | ~0.7k |
| schema-validator | 117 | zod4-content-schemas (211) | ~0.7k |
| svelte-shell | 180 | monorepo-conventions (165), sveltekit-phaser-seam (418) | ~1.1k |
| test-runner | 126 | (none) | ~0.5k |

**Guideline:** Avoid loading more than 2 skills simultaneously. If a task spans multiple skill domains, break it into sequential steps.
