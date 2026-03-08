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
- `pnpm validate` — check + lint + test

## Rules

- Phaser 4 is RC — pin exact version, never auto-bump
- All content validates against `@sg/contracts` schemas at startup
- Save schema has a `version` field from day one — no exceptions
- Investigate before implementing: read first, code second
- Never `--no-verify`
- Commits: `type(scope): description` — scopes: web, game, contracts, content, ui, repo
- Biome for formatting/linting (NOT Prettier, NOT ESLint) — tabs, single quotes, 100 char width
