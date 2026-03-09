# Mobile Adaptation — Orchestration State

## Current phase: B — COMPLETE
## Next: Phase C (PWA polish) or ship

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
| PR-5 | game-overlay | svelte-shell | ✅ | Pause/mute DOM overlay, 44px touch targets, safe area, aria |
| PR-5 | responsive-css | svelte-shell | ✅ | clamp() fonts, min() widths, 44px slider thumbs, reduced-motion |
| PR-5 | e2e-tests | test-runner | ✅ | 7 new e2e tests (21 total) |
| PR-5 | land | pr-shipper | ✅ | Merged to main at 2bb7444 |
| hotfix | touch-input + canvas bg | operator | ✅ | Auto-detect touch on default 'wasd', dark background — merged at 6003c5a |

## Phase B Acceptance Criteria

| Criterion | Delivering PR | Status |
|---|---|---|
| All interactive elements meet 44×44pt on iPhone SE | PR-5 | ✅ |
| Settings changeable at runtime without remount | PR-3 | ✅ |
| HUD text readable on iPhone SE and iPad | PR-4 | ✅ |
| Settings page usable on 320px screen | PR-5 | ✅ |
| `prefers-reduced-motion` reduces shake and transitions | PR-4 + PR-5 | ✅ |

## Real Device Testing (Pixel)

| Check | Result | Notes |
|---|---|---|
| Rotate overlay | ✅ | Correctly shown in portrait |
| Touch controls | ❌→✅ | Fixed: auto-detection was blocked by default 'wasd' scheme |
| Canvas background | ❌→✅ | Fixed: white letterbox → dark background on body + play page |
| Game rendering position | Observed off-center | 4:3 in 16:9 with FIT mode — expected letterboxing, now dark |
| Menu start (tap) | ✅ | Press space / tap to start works |

## Frame-Rate Independence

Verified clean by diagnostician. All systems safe:
- Player/enemy movement: `body.setVelocity()` + `fixedStep: true`
- Firing cooldowns: wall-clock `time - lastFired`
- Spawning/timers: `scene.time.delayedCall()`
- No frame counters, no `setInterval`/`setTimeout` in gameplay

## Type Contracts

GameMountOptions.settings: masterVolume, sfxVolume, musicVolume, showFps, touchControlsEnabled, controlScheme

RuntimeSettings (updateSettings): masterVolume (number), sfxVolume (number), musicVolume (number), showFps (boolean)

Registry keys: masterVolume, sfxVolume, musicVolume, showFps, touchControlsEnabled, controlScheme, audioVolumes (compat), eventBus

Adapter selection: controlScheme 'arrows' → force KeyboardInput; controlScheme 'touch' → force TouchInput; default/wasd + touch capability → TouchInput; else → KeyboardInput

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

## Known Issues

| Issue | Severity | Discovered | Blocking? | Tracking |
|---|---|---|---|---|
| Visibility-change pause | P0 | PR-3 | ✅ Fixed | Fixed at 8cbe442 |
| UX entry flow (two intro screens) | P2 | PR-4 triage | No | Future unification task |
| Frame-rate independence | Verified safe | PR-4 checkpoint | ✅ Resolved | fixedStep: true, all velocity-based |
| Touch input not activating | P0 | Real device test | ✅ Fixed | Fixed at 6003c5a — auto-detect on default 'wasd' |
| White canvas letterbox | P1 | Real device test | ✅ Fixed | Fixed at 6003c5a — dark body/play-page bg |

## Phase C Notes

- PWA install: Android Chrome (beforeinstallprompt) vs Safari (Home Screen guidance) vs iOS Chrome (no install prompt)
- Offline: validate in Safari installed mode (7-day eviction for non-installed)
- Performance: profile at 60Hz and 120Hz, rAF budget 8.3ms at 120Hz
- Debugging: Chrome DevTools for Android, Safari Web Inspector for iOS

## Rollback Log

| PR | Action | Reason | Date |
|---|---|---|---|
| — | — | — | — |
