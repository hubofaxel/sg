# ship-game

Arcade shooter — SvelteKit app shell + Phaser 4 RC game engine in pnpm monorepo.

## Boundaries

- SvelteKit owns the app (routes, menus, settings, persistence UI)
- Phaser owns only the play surface (scenes, rendering, input, physics)
- `@sg/game` exposes ONE public API: `mountGame(element, options): GameHandle`
- No Phaser types leak outside `packages/game`

## Commands

- `pnpm check` — typecheck all packages
- `pnpm dev` — SvelteKit dev server
- `pnpm test` — Vitest
- `pnpm test:e2e` — Playwright
- `pnpm format` — Biome format
- `pnpm lint` — Biome check
- `pnpm lint:fix` — Biome check --write
- `pnpm validate` — check + lint + test + asset:validate
- `pnpm asset:gen` — generate all assets (OpenAI + ElevenLabs, requires API keys via direnv)
- `pnpm asset:placeholder` — generate placeholder PNGs for all visual assets
- `pnpm asset:manifest` — rebuild asset-manifest.json from disk
- `pnpm asset:validate` — deep cross-validation of catalog, manifest, and files
- `pnpm asset:rebuild` — full pipeline: gen + assemble + manifest + validate
- Single key: `pnpm --filter @sg/asset-gen cli generate --key <key>`

## Dev Server (agent observability)

- Start: `bash tools/scripts/dev-server.sh` (logs to `.dev-logs/vite-dev.log`)
- Check errors: `tail -50 .dev-logs/vite-dev.log`
- Grep errors: `grep -i "error\|500\|failed" .dev-logs/vite-dev.log | tail -20`
- Stop: `bash tools/scripts/dev-stop.sh`
- Chrome debug: `bash tools/scripts/chrome-debug.sh` (port 9222)
- ALWAYS check the log after any code change that could affect rendering
- PostToolUse hook auto-checks vite log after .svelte/.ts/.js/.css edits

## Rules

- Phaser 4 is RC — pin exact version, never auto-bump
- All content validates against `@sg/contracts` schemas at startup
- Save schema has a `version` field from day one — no exceptions
- Investigate before implementing: read first, code second
- Never `--no-verify`
- Commits: `type(scope): description` — scopes: web, game, contracts, content, ui, asset-gen, repo
- Biome for formatting/linting (NOT Prettier, NOT ESLint) — tabs, single quotes, 100 char width
