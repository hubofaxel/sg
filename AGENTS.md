# ship-game — Agentic Configuration

## Agents

| Agent | Purpose |
|---|---|
| schema-validator | Zod schema creation, content validation, schema-first enforcement |
| phaser-integrator | Phaser 4 RC game features within isolation boundary |
| svelte-shell | SvelteKit app shell, routes, settings, persistence UI |
| test-runner | Vitest + Playwright test suite maintenance |
| pr-shipper | Trunk-based shipping: branch, commit, land |
| asset-pipeline | Asset generation, manifests, placeholder pipeline |
| diagnostician | Runtime error triage via dev server logs and browser console |

## Skills (`.agents/skills/`)

| Skill | Trigger Context |
|---|---|
| phaser4-rc | Working in packages/game/ |
| sveltekit-phaser-seam | Working on GameCanvas or mountGame |
| zod4-content-schemas | Creating/modifying schemas in contracts |
| asset-generation | Asset generation, adding new assets, modifying pipeline |
| browser-debugging | 500 errors, blank pages, UI issues |
| monorepo-conventions | Scaffolding packages, workspace config |
| trunk-based-dev | Committing, branching, shipping |
| pwa-delivery | Service worker, manifest, install UX |

## Hooks

| Hook | Matcher | Action |
|---|---|---|
| SessionStart | cli | Load direnv env vars via `CLAUDE_ENV_FILE` (`.claude/hooks/load-env.sh`) |
| SessionStart | cli | Warn if dev server is not running |
| PreToolUse | Edit/Write | Block edits on `main` branch |
| PostToolUse | Edit/Write | Auto-format with Biome |
| PostToolUse | Edit/Write | Check vite dev log for errors after .svelte/.ts/.js/.css edits |

## Commands (`.claude/commands/`)

| Command | Purpose |
|---|---|
| /bootstrap | Full monorepo scaffold from scratch |
| /add-schema `<name>` | New Zod schema + test + sample content |
| /add-scene `<name>` | New Phaser scene + wiring |
| /add-asset `<key>` | Add new asset key to pipeline |
| /vertical-slice | Stage 3 full gameplay loop buildout |
| /land | Trunk-based merge to main |
| /check | Full quality gate sweep with diagnostics |

Note: `/commit` is a built-in skill, not a custom command file.
