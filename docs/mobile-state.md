# Mobile Adaptation — Orchestration State

## Current phase: A (Input-valid)
## Current PR: PR-2
## Branch: feat/mobile-input-intent

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | ✅ | All 10 fixes applied |
| PR-1 | viewport-and-layout | svelte-shell | ✅ | Commit 9073d44 |
| PR-1 | rotate-overlay | svelte-shell | ✅ | Commit 1f285e2 |
| PR-1 | e2e-verification | test-runner | ✅ | 6 new tests, commit b1f12d1 |
| PR-1 | land | pr-shipper | ✅ | FF-merged to main at 6e46104 |

## In Progress

| PR | Task | Agent | Status | Blocker |
|---|---|---|---|---|
| PR-2 | schema-extension | schema-validator | 🔄 | — |
| PR-2 | input-intent-system | phaser-integrator | 🔄 | — |

## Blocked

| PR | Task | Agent | Blocker |
|---|---|---|---|
| PR-2 | adapter-and-schema-tests | test-runner | Depends on Task 2.1 + 2.2 |

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
