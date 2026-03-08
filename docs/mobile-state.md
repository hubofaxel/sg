# Mobile Adaptation — Orchestration State

## Current phase: A (Input-valid)
## Current PR: PR-1 (Shell Foundation)
## Branch: feat/mobile-shell-foundation

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | ✅ | Merged to main |
| PR-1 | viewport-and-layout | svelte-shell | ✅ | viewport-fit=cover, dvh/dvw, safe-area, touch-action, manifest orientation |
| PR-1 | rotate-overlay | svelte-shell | ✅ | RotateOverlay.svelte — Svelte 5, Tailwind 4, ARIA accessible |
| PR-1 | e2e-verification | test-runner | ✅ | 6 new tests in mobile-shell.spec.ts, all passing |

## In Progress

| PR | Task | Agent | Status | Blocker |
|---|---|---|---|---|
| — | — | — | — | — |

## Blocked

| PR | Task | Agent | Blocker |
|---|---|---|---|
| — | — | — | — |

## Decisions Resolved

| # | Decision | Outcome | Date |
|---|---|---|---|
| 1 | Touch auto-fire policy | No decision needed — auto-fire is existing behavior. `autoFire` setting removed from plan. | 2026-03-08 |
| 2 | Input adapter activation | Capability detection at mount + `controlScheme: 'touch'` override. No UA sniffing. | 2026-03-08 |
| 3 | Runtime settings transport | Phaser registry `changedata` events. No custom bus. No new GameEventMap entries. | 2026-03-08 |
| 4 | Pause ownership | Shell-authoritative. Game never self-pauses. | 2026-03-08 |
| 5 | Touch target strategy | Full-scene `pointerdown` for all in-canvas prompts. No localized hit zones. | 2026-03-08 |
| 6 | HUD scaling envelope | Clamped `[0.6, 1.5]` with per-element pixel floors (10px HUD, 9px boss label). | 2026-03-08 |
| 7 | Manifest orientation | Preference only. Overlay + game pause is real enforcement. No `screen.orientation.lock()`. | 2026-03-08 |

## Decisions Pending

None — all seven resolved.

## Rollback Log

| PR | Action | Reason | Date |
|---|---|---|---|
| — | — | — | — |
