# Mobile Adaptation — Orchestration State

## Current phase: B (Physically usable)
## Current PR: PR-5
## Branch: feat/mobile-overlay-responsive

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | ✅ | All 10 fixes applied |
| PR-1 | shell-foundation | svelte-shell | ✅ | viewport-fit, dvh, safe area, touch-action, rotate overlay |
| PR-1 | e2e-verification | test-runner | ✅ | 6 new tests |
| PR-1 | land | pr-shipper | ✅ | Merged to main |
| PR-2 | schema-extension | schema-validator | ✅ | ControlScheme + 'touch', 15 tests |
| PR-2 | input-intent-system | phaser-integrator | ✅ | InputIntent, KeyboardInput, TouchInput, GameScene refactor |
| PR-2 | adapter-tests | test-runner | ✅ | 23 adapter tests |
| PR-2 | desktop-parity-check | operator | ✅ | Manual gameplay verification |
| PR-2 | land | pr-shipper | ✅ | Merged to main |
| PR-3 | runtime-settings-bridge | phaser-integrator | ✅ | updateSettings(), registry changedata |
| PR-3 | settings-store-bridge | svelte-shell | ✅ | $effect wiring |
| PR-3 | cross-tab-sync | svelte-shell | ✅ | storage event listener |
| PR-3 | bridge-verification | operator | ✅ | Runtime update verified |
| PR-3 | land | pr-shipper | ✅ | Merged to main at 3a06e46 |
| hotfix | visibility-pause fix | diagnostician + phaser-integrator | ✅ | Game-level PAUSE event, removed double-pause — merged at 8cbe442 |
| PR-4 | hud-scaling | phaser-integrator | ✅ | Clamped [0.6,1.5], pixel floors, reduced motion |
| PR-4 | scaling-tests | test-runner | ✅ | 19 new tests (345 total) |
| PR-4 | land | pr-shipper | ✅ | Merged to main at c0fa010 |

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

## Known Issues

| Issue | Severity | Discovered | Blocking? | Tracking |
|---|---|---|---|---|
| Visibility-change pause unsteadiness | P0 | PR-3 | ✅ Fixed | Fixed at 8cbe442 — game-level PAUSE event + removed double-pause |
| UX entry flow (two intro screens) | P2 | PR-4 triage | No | Future unification task |
| Frame-rate independence unverified | TBD | PR-4 checkpoint | Diagnostician dispatched | Parallel check — likely safe (fixedStep: true) |

## Phase C Notes

- PWA install: Android Chrome (beforeinstallprompt) vs Safari (Home Screen guidance) vs iOS Chrome (no install prompt)
- Offline: validate in Safari installed mode (7-day eviction for non-installed)
- Performance: profile at 60Hz and 120Hz, rAF budget 8.3ms at 120Hz
- Debugging: Chrome DevTools for Android, Safari Web Inspector for iOS

## Rollback Log

| PR | Action | Reason | Date |
|---|---|---|---|
| — | — | — | — |
