# ship-game

Arcade shooter — SvelteKit app shell + Phaser 4 RC game engine in pnpm monorepo.

## Planning

Current priorities, backlog, and project status: `docs/DELIVERY_PLAN.md`
Agentic infrastructure plan and implementation sequence: `docs/agentic-infra.md`
Agent roster, skills, hooks, commands: `AGENTS.md` (auto-generated — run `pnpm agents:sync`)

## Boundaries

- SvelteKit owns the app (routes, menus, settings, persistence UI)
- Phaser owns only the play surface (scenes, rendering, input, physics)
- `@sg/game` exposes one entry point: `mountGame(element, options): GameHandle` (plus types)
- No Phaser types leak outside `packages/game`

## Commands

- `pnpm check` — typecheck all packages
- `pnpm dev` — SvelteKit dev server
- `pnpm test` — Vitest
- `pnpm test:e2e` — Playwright
- `pnpm format` — Biome format
- `pnpm lint` — Biome check
- `pnpm lint:fix` — Biome check --write
- `pnpm validate` — check + lint + build + test + e2e + asset:validate + boundary checks
- `pnpm asset:gen` — generate all assets to staging (OpenAI + ElevenLabs, requires API keys via direnv)
- `pnpm asset:placeholder` — generate placeholder PNGs for all visual assets (bypasses staging)
- `pnpm asset:manifest` — rebuild asset-manifest.json from runtime files
- `pnpm asset:validate` — deep cross-validation of catalog, manifest, and files
- `pnpm asset:rebuild` — full pipeline: gen + assemble + manifest + validate
- Single key: `pnpm --filter @sg/asset-gen cli generate --key <key>` (writes to staging)
- Review staged: `pnpm --filter @sg/asset-gen cli staging --key <key>`
- Promote to runtime: `pnpm --filter @sg/asset-gen cli promote --key <key>`

## Dev Server (agent observability)

- Start: `bash tools/scripts/dev-server.sh` (logs to `.dev-logs/vite-dev.log`)
- Check errors: `tail -50 .dev-logs/vite-dev.log`
- Grep errors: `grep -i "error\|500\|failed" .dev-logs/vite-dev.log | tail -20`
- Stop: `bash tools/scripts/dev-stop.sh`
- Chrome debug: `bash tools/scripts/chrome-debug.sh` (port 9222)
- ALWAYS check the log after any code change that could affect rendering
- PostToolUse hook auto-checks vite log after .svelte/.ts/.js/.css edits
- Audit log query: `bash tools/scripts/audit-query.sh --last 20` (also: `--agent`, `--file`, `--branch`)
- Session log: `.dev-logs/agent-sessions.jsonl` (SubagentStart/Stop hooks log agent lifecycle)
- Handoff files: `.dev-logs/handoffs/<branch>.json` (written by agents, read by next agent in workflow)

## Agent Handoff Protocol

When an agent completes a delegated step in a multi-agent workflow (e.g. `/vertical-slice`), it writes a handoff file:

```bash
# File path: .dev-logs/handoffs/<branch-name>.json
{
  "agent": "phaser-integrator",
  "branch": "feat/stage-3-loop",
  "status": "done | blocked | partial",
  "files": ["path/to/changed-file.ts", "path/to/another.ts"],
  "blockers": null,
  "notes": "context for the next agent",
  "timestamp": "2026-03-14T12:00:00Z"
}
```

The next agent in the workflow reads this file directly — no human copy-paste needed. `pr-shipper` reads the file list from the handoff file for staging.

Agents also write a lightweight console HANDOFF block (for human visibility):
```
HANDOFF
status: done
files: (see .dev-logs/handoffs/<branch>.json)
```

## Rules

- Phaser 4 is RC — pin exact version, never auto-bump
- All content validates against `@sg/contracts` schemas at startup
- Save schema has a `version` field from day one — no exceptions
- Investigate before implementing: read first, code second
- Never `--no-verify`
- Commits: `type(scope): description` — scopes: web, game, contracts, content, ui, asset-gen, repo
- Biome for formatting/linting (NOT Prettier, NOT ESLint) — tabs, single quotes, 100 char width
- Asset generation writes to staging, not runtime — see `docs/asset-contracts.md` for full policy
- Assets <32px shipped size default to code-drawn (Phaser drawing API), not AI-generated
- CI runs the same gate chain as local `pnpm validate` — see `.github/workflows/ci.yml`
- Architecture boundaries enforced: no Phaser outside `packages/game/`, no `@sg/game` internal imports
