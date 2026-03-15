# Delivery Plan

Single source of planning truth for the ship-game repo.

## Current State (March 2026)

- Phase 9 complete (gameplay loop, boss encounters, drops/currency, stage progression)
- Mobile Phase B + V2 complete (edge-to-edge canvas, safe area insets, dynamic world sizing, relative touch input, HUD scaling, orientation overlay)
- Documentation consolidated — single planning doc, all CLAUDE.md files verified, no stale references
- 382 unit tests, 22 e2e tests — all green
- 31 asset keys cataloged, all on disk (0 validation errors)
- 2-stage campaign (6 levels, 19 waves, 2 bosses)
- `pnpm validate` green on trunk
- App is purely client-side (no SSR, no API routes, no server load functions)

## Near-Term Priorities

### 1. Agent state and task infrastructure

The agentic dev framework has orchestration protocols (HANDOFF blocks), observability (audit log hook), and staleness detection (`pnpm agents:sync`). What's missing is persistent state between agent sessions and structured task tracking. Full infrastructure plan and implementation sequence: `docs/agentic-infra.md`. Gap summary below.

**Inter-agent state management:**
Currently there is no shared state between agent sessions. Each session starts fresh, reading CLAUDE.md and memory files for context. The HANDOFF protocol requires a human to copy-paste output from one agent into the next. There is no persistent workflow state — if a multi-step command like `/vertical-slice` is interrupted, progress tracking is lost.

Concrete gaps:
- No shared task queue agents can read/write across sessions
- No way for an agent to check "what did the last agent do?" without human relay
- No persistent record of in-flight work beyond git branch existence
- Audit log (`.dev-logs/agent-audit.jsonl`) is append-only, not queryable by agents

**Task and roadmap tracking:**
Planning lives in `docs/DELIVERY_PLAN.md` — a flat markdown file with prose descriptions. There are no structured task objects, no status fields, no dependency tracking, no assignment to agents.

Concrete gaps:
- No machine-readable task format (priorities are prose paragraphs)
- No task lifecycle (created → assigned → in-progress → blocked → done)
- No way to break a priority into subtasks with tracked completion
- No integration between task state and `/check` or `/land` commands
- Backlog items have no size estimates, dependencies, or acceptance criteria

**Agent-to-agent messaging:**
Communication is human-routed. Agent A outputs a HANDOFF block, human pastes it to Agent B. There is no direct channel, no event bus, no shared inbox.

Concrete gaps:
- Multi-agent workflows (e.g. `/vertical-slice`) require human to be the message bus
- No way for diagnostician to notify phaser-integrator of a runtime error
- No mechanism for `/check` to automatically dispatch failures to the right agent
- HANDOFF protocol is well-defined but not machine-consumable (no file-based relay)

### 2. Responsive test infrastructure

Current unit tests cover HudScale (9 devices), SafeZone (8 aspect ratios), and SafeAreaInsets (iPhone/Pixel profiles). E2e tests use ad-hoc viewports. No systematic device matrix.

**Concrete next steps:**
- Add Playwright `devices` profiles to `playwright.config.ts` (iPhone 13, Pixel 8, iPad Pro)
- Add e2e viewport matrix test: HUD readable at scale extremes (0.6x floor, 1.5x ceiling)
- Add `mountGame()` resize handler test (debounce, registry update, safe zone recompute)

### 3. Ongoing maintenance

- Keep `pnpm validate` green on trunk
- Keep CLAUDE.md files and agentic config accurate after changes
- Update this plan after each shipped priority

## Completed

### Agentic dev architecture upgrade (shipped f5df028)

Orchestration protocols, staleness detection, observability. Shipped: HANDOFF protocol for inter-agent delegation with failure recovery, `gen-agents-md.sh` + `pnpm agents:sync` for auto-generated AGENTS.md, PostToolUse audit log hook (`.dev-logs/agent-audit.jsonl`), context budget table, GitHub MCP server, stale `.agents/` directory cleanup. Remaining gaps (persistent state, task tracking, agent messaging) tracked as new priority #1 above.

### GitHub Pages hosting (shipped cf63924)

Live at https://hubofaxel.github.io/sg/. `@sveltejs/adapter-static`, `BASE_PATH` from CI, `404.html` SPA fallback, auto-deploy on push to main (`.github/workflows/deploy.yml`).

## Backlog

### Stage presentation polish
Intro cards, transitions, scene pacing. Currently: MenuScene has fade transitions, GameScene has `cameras.main.fadeIn()` and brief text banners. Missing: per-stage intro card system, choreographed entry sequences.

### Audio polish
Boss music crossfade, low-health warning. Currently: AudioManager does stop/start only — no crossfade, no fade-out. `music-boss` and `sfx-low-health` are on disk but zero game code references them. Missing: crossfade in AudioManager, boss music trigger in BossManager, low-health threshold check.

### PWA polish
Offline install, low-end performance profiling. Currently: no service worker, no `@vite-pwa/sveltekit`. `pwa-delivery` skill has setup code ready. Missing: Vite PWA plugin integration, service worker registration, Lighthouse baseline.

### VFX sprites
Generated hit/death effects. Currently: all effects are code-drawn tweens (flash, shake, scale-up). `sprite-telegraph` is on disk but never instantiated. See `docs/vfx-prompt-library.md` for prompt templates.

### Deferred gameplay
`beam` attack type (in schemas, no `case 'beam'` in EnemyAttack.ts), weak point damage multiplier (no implementation), VFX sprite pools (no pooling for effects).

## Deferred Assets (cataloged, not yet wired)

| Key | Phase | Status |
|-----|-------|--------|
| `music-boss` | 10 | On disk, composition plan ready |
| `sfx-low-health` | 10 | On disk |
| `sfx-telegraph` | 12 | On disk |
| `sprite-telegraph` | 12 | On disk |

## Planning Rules

- `main` is always releasable
- Feature work ships in small, reviewable branches
- Stale planning docs get archived or removed, not left active
- Runtime behavior wins over doc claims — update docs immediately after behavior changes
- One canonical doc per concern: this plan (planning), `agentic-infra.md` (agent infrastructure), `RESPONSIVE_GAMEPLAY.md` (mobile/responsive), `asset-contracts.md` (assets), `branding.md` (brand)
