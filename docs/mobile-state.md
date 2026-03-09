# Mobile Adaptation — Orchestration State

## Current phase: A (Input-valid) → transitioning to B (Physically usable)
## Current PR: PR-3 (Runtime Settings Bridge)
## Branch: feat/mobile-settings-bridge

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | ✅ | All 10 fixes applied |
| PR-1 | shell-foundation | svelte-shell | ✅ | viewport-fit, dvh, safe area, touch-action, rotate overlay |
| PR-1 | e2e-verification | test-runner | ✅ | 6 new tests |
| PR-1 | land | pr-shipper | ✅ | FF-merged to main at 6e46104 |
| PR-2 | schema-extension | schema-validator | ✅ | ControlScheme + 'touch', 15 tests |
| PR-2 | input-intent-system | phaser-integrator | ✅ | InputIntent, KeyboardInput, TouchInput, GameScene refactor |
| PR-2 | adapter-tests | test-runner | ✅ | 23 adapter tests (11 keyboard + 12 touch) |
| PR-2 | desktop-parity-check | operator | ✅ | Manual gameplay verification — confirmed identical |
| PR-2 | land | pr-shipper | ✅ | FF-merged to main at d523c12 |
| PR-3 | runtime-settings-bridge | phaser-integrator | ✅ | updateSettings(), AudioManager + DebugOverlay subscriptions |
| PR-3 | settings-store-bridge | svelte-shell | ✅ | $effect pushes volume + showFps to game |

## In Progress

| PR | Task | Agent | Status | Blocker |
|---|---|---|---|---|
| — | — | — | — | — |

## Blocked

| PR | Task | Agent | Blocker |
|---|---|---|---|
| — | — | — | — |

## Type Contracts

GameMountOptions.settings: masterVolume, sfxVolume, musicVolume, showFps, touchControlsEnabled, controlScheme

RuntimeSettings (updateSettings): masterVolume (number), sfxVolume (number), musicVolume (number), showFps (boolean)

Registry keys: masterVolume, sfxVolume, musicVolume, showFps, touchControlsEnabled, controlScheme, audioVolumes (compat), eventBus

Adapter selection: controlScheme 'touch' → force TouchInput; touchEnabled !== false AND device touch AND controlScheme not 'wasd'/'arrows' → TouchInput; else → KeyboardInput

## Decisions Resolved

| # | Decision | Outcome | Date |
|---|---|---|---|
| 1 | Touch auto-fire policy | No decision needed — auto-fire is existing behavior | 2026-03-08 |
| 2 | Input adapter activation | Capability detection at mount + controlScheme override | 2026-03-08 |
| 3 | Runtime settings transport | Phaser registry changedata events | 2026-03-08 |
| 4 | Pause ownership | Shell-authoritative | 2026-03-08 |
| 5 | Touch target strategy | Full-scene pointerdown | 2026-03-08 |
| 6 | HUD scaling envelope | Clamped [0.6, 1.5] + pixel floors | 2026-03-08 |
| 7 | Manifest orientation | Preference only, overlay enforces | 2026-03-08 |

## Decisions Pending

None — all seven resolved.

## Rollback Log

| PR | Action | Reason | Date |
|---|---|---|---|
| — | — | — | — |
