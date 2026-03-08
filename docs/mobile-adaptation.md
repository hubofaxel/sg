# Mobile Adaptation Plan

Planning document for adapting Ship Game to mobile devices. Covers current state, architectural decisions, gap analysis, implementation phases, and execution governance.

This document is the implementation authority for mobile adaptation work. Any mobile-related task should reference this file and the acceptance criteria within.

---

## Reality Check (Repository State)

Before implementation, anchor to current repo reality:

- Local gate: `pnpm validate` currently passes (check/lint/build/test/asset/boundaries)
- Routes `/`, `/play`, `/settings` are live and SSR-rendered
- Content parsing is schema-validated in `packages/content/src/index.ts` (Zod 4 `Schema.parse()`)
- Settings store uses Svelte 5 `$state` runes in a `.svelte.ts` module (`apps/web/src/lib/stores/settings.svelte.ts`), which is the correct SSR-safe pattern for rune-based state — Svelte compiles `.svelte.ts` files through its rune transform
- E2e tests exist (`apps/web/tests/smoke.spec.ts`) covering route navigation and basic element presence
- Boundary checks exist (`tools/scripts/check-boundaries.sh`) enforcing Phaser isolation

**Implementation implication:** mobile work must not rely only on `pnpm validate`; it must also include e2e checks for mobile-facing paths. `pnpm validate` does not run `pnpm test:e2e`.

---

## Architectural Foundation: Three Size Domains

Mobile adaptation requires separating three distinct concepts that must not be conflated:

| Domain | Owner | Definition |
|---|---|---|
| **World size** | Phaser | Fixed 800x600 game coordinate space. All gameplay logic, spawning, movement, collision, and content data operate in this space. Never changes at runtime. |
| **Display size** | Phaser Scale Manager | The physical pixel dimensions of the rendered canvas. Phaser's `FIT` mode automatically scales the 800x600 world to fit the parent container while preserving 4:3 aspect ratio. Accessible via `scale.displaySize`, `scale.parentSize`, `scale.getViewPort()`. |
| **Shell size** | SvelteKit / CSS | The browser viewport and DOM layout. Owns safe areas, orientation overlays, fullscreen parent container, and any DOM-based UI chrome. |

**Key principle:** The Svelte shell sizes the parent container. Phaser fits the fixed world into that container. HUD and input systems adapt using Phaser's display size and viewport APIs — not by changing the world size. `setGameSize()` is for changing the underlying game world, which we do not do. Container measurement is for the shell and overlay math, not for Phaser config.

---

## Platform Capability Policy

Mobile work must follow a capability-tiered approach. Features are classified as **baseline** (may depend on), **progressive enhancement** (use when available, degrade without), or **experimental/deferred** (not on critical path).

### Baseline — the game may depend on these

- **`requestAnimationFrame()`** for render loop timing (Phaser uses this internally)
- **Pointer Events** as the unified input model for touch, mouse, and pen — no separate mouse/touch codepaths
- **`touch-action: none`** on the game surface to prevent browser gesture interception and `pointercancel`
- **Page Visibility API** (`visibilitychange`) for pause/resume lifecycle
- **Safe area environment variables** (`env(safe-area-inset-*)`) with `viewport-fit=cover`
- **Modern viewport units** (`dvw`/`dvh`) for shell layout
- **User-gesture-gated audio** — first audio play must follow a user interaction; Phaser handles audio unlock internally, and the MenuScene "click to start" flow provides the required gesture

### Progressive enhancement — use when available, degrade gracefully without

- **Screen Wake Lock API** — prevents screen dimming during play sessions; must be requested after user intent, reacquired on resume (can be revoked by OS on visibility change or low-power mode)
- **`navigator.hardwareConcurrency`** — advisory signal for worker/quality heuristics (broadly available)
- **`navigator.deviceMemory`** — secondary hint for adaptive quality (limited availability; missing values must not degrade experience)
- **Vibration API** (`navigator.vibrate()`) — optional haptic feedback; unsupported devices simply no-op
- **`pagehide`** event — complementary lifecycle signal alongside `visibilitychange`
- **`prefers-reduced-motion`** media query — honor for non-essential screen shake, flash intensity, and transition effects
- **Persistent storage** (`navigator.storage.persist()`) — request defensively for settings/progress durability; browser may decline

### Experimental/deferred — not on critical path

- **`screen.orientation.lock()`** — not Baseline, inconsistent across browsers; orientation preference via manifest + shell overlay instead
- **`display_override`** in manifest — MDN marks as experimental
- **WebGPU** — limited availability; default renderer remains WebGL/canvas
- **OffscreenCanvas worker rendering** — `transferControlToOffscreen()` is broadly available but should be a targeted optimization, not a day-one rewrite

### Anti-patterns to avoid

- No UA sniffing for feature decisions — use runtime capability checks
- No assumption that Wake Lock persists forever
- No assumption that autoplay succeeds
- No blanket `user-scalable=no` — MDN warns this hurts accessibility and modern browsers may ignore it
- No input correctness tied to legacy touch events — use Pointer Events exclusively

---

## 1. Canvas Scaling and Viewport

### Current state

`mountGame.ts:16-17` — fixed world size:
```
DEFAULT_WIDTH  = 800
DEFAULT_HEIGHT = 600
```

`mountGame.ts:22-26` — scale config:
```
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
}
```

This is already correct for the fixed-world approach. FIT preserves 4:3 and letterboxes into whatever parent container Svelte provides.

`GameCanvas.svelte:23` — `mountGame()` is called without `width`/`height`. The optional `width`/`height` on `GameMountOptions` (`types.ts:7-8`) exist but are unused. **This is fine** — under the fixed-world model, the Svelte shell should not be passing dimensions to change the game world size.

`play/+page.svelte:14-18` — uses `100vw`/`100vh`. Legacy viewport units map to the "large viewport" and can mis-measure when mobile browser UI expands or retracts.

### What needs to change

The Svelte shell must provide a correct fullscreen parent. The game must listen for orientation and resize events via Phaser's Scale Manager.

**Shell (SvelteKit):**
- `app.html:5` — add `viewport-fit=cover` to enable safe area inset variables. Do **not** add `user-scalable=no`
- `play/+page.svelte` — switch from `100vw/100vh` to `100dvw/100dvh` (dynamic viewport units)
- `play/+page.svelte` — apply `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` on the game container parent
- `GameCanvas.svelte` — add `touch-action: none` to `.game-container`

**Game (Phaser):**
- Subscribe to `scale.on('resize')` and `scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE)` in GameScene
- On orientation change to portrait: pause game, clear input state, emit event to shell for rotate-device overlay
- On resize: systems that reference display size (HUD, touch input) re-read from `scale.displaySize`

### Orientation strategy

Three layers — manifest alone is insufficient because runtime behavior varies by browser/device:

1. **Manifest** — `"orientation": "landscape"` as launch default
2. **Shell overlay** — Svelte renders a "rotate your device" prompt when viewport is portrait
3. **Game pause** — GameScene auto-pauses when orientation is portrait, clears input state

### Files to modify

- `apps/web/src/app.html` — viewport meta: add `viewport-fit=cover`
- `apps/web/src/routes/play/+page.svelte` — `100dvw/100dvh`, safe area padding
- `apps/web/src/lib/components/GameCanvas.svelte` — `touch-action: none`, orientation event handling
- `apps/web/static/manifest.webmanifest` — add `"orientation": "landscape"`
- `packages/game/src/scenes/GameScene.ts` — subscribe to Scale Manager `resize` and `ORIENTATION_CHANGE` events

### What does NOT change

- `mountGame.ts` — world size stays 800x600, no container dimensions passed in
- `GameMountOptions.width/height` — remain optional overrides for non-standard embeddings, not for mobile adaptation

### Non-goals (to prevent architectural drift)

- No adaptive gameplay world per device class (phone/tablet/desktop)
- No split codepaths for collision/spawn logic by viewport size
- No shell-driven remount loop on every orientation or settings change
- No touch logic directly embedded into unrelated gameplay systems

---

## 2. Foundation Contracts and Schema Coupling

Mobile work touches contracts. Treat schema changes as first-class architecture work, not UI tweaks.

### Current contract anchor

- `GameSettingsSchema` in `packages/contracts/src/settings/settings.schema.ts` includes:
  - `controlScheme` (`'wasd' | 'arrows'`), `touchControlsEnabled`, `masterVolume`, `sfxVolume`, `musicVolume`, `zoom`, `screenShake`, `showFps`
- `GameMountOptions.settings` in `packages/game/src/types.ts` carries only `masterVolume`, `sfxVolume`, `musicVolume`, `showFps` — a subset
- Shell store (`settings.svelte.ts`) and game runtime are not aligned for runtime updates — settings only flow at mount time

### Required coupling rules

1. `@sg/contracts` remains the source of truth for settings shape
2. `@sg/game` runtime settings type must be derived from or explicitly mapped to contracts shape
3. Web store, settings page UI, and runtime bridge must all consume the same canonical keys
4. Any new mobile setting must include: schema field, default value, persistence behavior, runtime application path, test coverage (schema + behavior)

### Candidate mobile settings (phase-aware)

- Phase A: `controlScheme: 'touch'`, `touchControlsEnabled` (already exists)
- Phase B: `touchDeadZone`, `touchMaxRadius`, `touchHandedness`, `touchUiScale`
- Phase C: `hapticsEnabled`, `hapticsIntensity`

Keep advanced fields gated by phase; do not front-load full tuning matrix before Phase A input validity is proven.

---

## 3. Input Intent System

### Current state

`GameScene.ts:105-114` — keyboard only:
```
this.cursors = keyboard.createCursorKeys();  // arrow keys
this.wasd = { W, A, S, D };                  // WASD
```

`GameScene.ts:254-277` — `handleMovement()` reads cursor/WASD keys, normalizes diagonal velocity. No touch input.

Pointer events exist only for menu/UI interactions:
- `MenuScene.ts:56` — `pointerdown` to start game
- `HudManager.ts:134` — `pointerdown` for game-over restart
- `HudManager.ts:203` — `pointerdown` for stage-clear continue

`settings.schema.ts:27` — `touchControlsEnabled: z.boolean().default(true)` exists in the contract but is completely unwired. `controlScheme` only offers `'wasd' | 'arrows'` — both keyboard-only.

### Architecture: input-intent adapter

Do not build "a joystick widget." Build an **input-intent adapter** that emits a stable contract consumed by GameScene. All input sources (keyboard, touch, future gamepad) feed the same gameplay layer:

```
InputIntent {
  moveVector: Vec2       // normalized (-1..1, -1..1)
  fireHeld: boolean      // primary weapon firing
  secondaryHeld: boolean // bomb/ability (future)
  pausePressed: boolean  // pause toggle
}
```

**`KeyboardInput.ts`** — adapter wrapping existing cursor/WASD logic, emitting InputIntent.

**`TouchInput.ts`** — adapter managing pointer ownership per finger via Pointer Events API, emitting InputIntent. Handles:
- Floating virtual joystick (appears at touch point on left half of screen)
- Dead zone and max radius on joystick
- Pointer capture rules so joystick doesn't swap owners when another finger enters
- Right-side touch zone for secondary ability (future)

**`GameScene.ts`** — reads `InputIntent` from the active adapter each frame. Selects adapter based on device detection + `touchControlsEnabled` setting.

### Adapter lifecycle requirements

- `create`: initialize pointer/key listeners and internal state
- `update`: emit one deterministic intent snapshot per frame
- `clear`: hard-reset state on pause, blur, orientation change, scene transition
- `destroy`: unregister listeners and release pointer ownership

If lifecycle is not explicit, mobile regressions appear as stuck movement, ghost inputs, or pointer ownership leaks after app backgrounding.

### Firing behavior

Firing is already unconditional — `GameScene.ts:224,238,280-282` fires every frame when cooldown expires. There is no player input for firing (no key binding, no pointer event, no toggle). All four weapons use cooldown-based firing with no charge, burst, or toggle patterns in the schema. The roadmap defers expanded fire patterns ("burst, charge, continuous") to post-launch.

The `InputIntent.fireHeld` field exists as a **future hook** for when manual fire patterns ship. Both `KeyboardInput` and `TouchInput` emit `fireHeld: true` unconditionally in their current implementation. This preserves the adapter contract without pretending player-controlled firing exists today.

### Adapter activation

Capability detection at mount time, with `controlScheme: 'touch'` as explicit user override:

1. **Mount-time heuristic:** Check `'ontouchstart' in window || navigator.maxTouchPoints > 0`. If true AND `controlScheme` is not explicitly `'wasd'` or `'arrows'`, activate `TouchInput`. Otherwise activate `KeyboardInput`.
2. **User override via settings:** `controlScheme: 'touch'` forces touch adapter regardless of device. A tablet user with Bluetooth keyboard can set `'wasd'` to override the heuristic.
3. **No runtime hot-swap in Phase A.** Control scheme change takes effect on next game mount. Runtime swap is a Phase B concern if needed.

`touchControlsEnabled` gates the heuristic. `controlScheme: 'touch'` forces it. Both `KeyboardInput` adapters (`wasd` and `arrows`) remain a single adapter reading both layouts simultaneously — matching current unwired behavior.

### Schema changes

- `ControlSchemeSchema` — add `'touch'` option (default remains `'wasd'` for migration safety)
- Add touch tuning fields in Phase B only (dead zone, radius, handedness), not in Phase A

### Acceptance criteria

- [ ] Touch movement works with floating joystick (dead zone, max radius, pointer capture)
- [ ] Firing works unconditionally on both adapters (fireHeld: true always)
- [ ] Pause/resume correctly clears all touch state (no stuck movement after backgrounding)
- [ ] Tab switch / orientation change / app background clears touch pointers
- [ ] Keyboard input unaffected when touch adapter is not active
- [ ] `touch-action: none` prevents browser gesture interference
- [ ] Adapter lifecycle hooks are exercised by tests (`clear` on pause/blur/orientation)

### Files to modify

- New: `packages/game/src/systems/InputIntent.ts` — shared InputIntent type
- New: `packages/game/src/systems/KeyboardInput.ts` — keyboard adapter
- New: `packages/game/src/systems/TouchInput.ts` — touch adapter with floating joystick
- `packages/game/src/scenes/GameScene.ts` — consume InputIntent instead of raw key checks
- `packages/contracts/src/settings/settings.schema.ts` — extend ControlSchemeSchema with `'touch'`
- `apps/web/src/lib/components/GameCanvas.svelte` — `touch-action: none` on container

---

## 4. HUD and In-Game UI

### Current state

`HudManager.ts` renders all HUD as Phaser text objects with fixed pixel font sizes:

| Element | Font size | Position logic |
|---|---|---|
| Score, Lives, Currency | 16px | Fixed offsets from top-left (10px x, 10/30/50px y) |
| Wave indicator | 14px | `width / 2`, y=12 (centered top) |
| Wave banner | 22px | `width / 2`, `height * 0.2` |
| Game over title | 40px | `width / 2`, `height * 0.35` |
| Game over score/credits | 24px, 18px | `width / 2`, `height * 0.45, 0.52` |
| Game over prompt | 16px | `width / 2`, `height * 0.6` |
| Stage clear title | 40px | `width / 2`, `height * 0.28` |
| Stage clear score/credits | 24px, 18px | `width / 2`, `height * 0.4, 0.48` |
| Stage clear prompt | 16px | `width / 2`, `height * 0.63` |

Y-positions use percentage-based placement (already responsive). Font sizes and X-margins are fixed px (not responsive).

`BossManager.ts:116-133` — warning banner and boss name text also use fixed font sizes (36px, 20px) with percentage-based Y positioning.

### Scaling approach

Non-uniform scaling with a raised floor for persistent HUD text:

**Base scale factor:**
```
scaleFactor = Math.min(displayWidth / 800, displayHeight / 600)
```

**Clamp range:** `Math.max(0.6, Math.min(scaleFactor, 1.5))` — floor at 0.6 prevents extreme shrinkage on iPhone SE; ceiling at 1.5 prevents oversized text on large tablets.

**Per-element pixel floor:** After applying the clamped factor, enforce minimum pixel sizes:
- Persistent HUD text (score, lives, currency, wave indicator): `Math.max(computedSize, 10)`
- Boss health bar label: `Math.max(computedSize, 9)`
- Titles and banners (40px game over, 36px boss warning, 22px wave banner): no floor needed — large enough at 0.6x
- Debug overlay (11px): do not scale — developer-facing only

**Concrete outcomes at key devices:**

| Device | Raw Factor | Clamped | 16px HUD → | 14px Wave → | 12px Boss → | 40px Title → |
|---|---|---|---|---|---|---|
| iPhone SE | 0.533 | 0.6 | 10px (floor) | 10px (floor) | 9px (floor) | 24px |
| iPhone 15 | 0.65 | 0.65 | 10.4px | 10px (floor) | 9px (floor) | 26px |
| Pixel 8 | 0.72 | 0.72 | 11.5px | 10.1px | 9px (floor) | 28.8px |
| iPad mini | 1.0 | 1.0 | 16px | 14px | 12px | 40px |
| iPad Air | 1.28 | 1.28 | 20.5px | 17.9px | 15.4px | 51.2px |

### Visual size vs. tap target size — separate concepts

Apple HIG specifies minimum **44x44 pt** hit regions. Android accessibility guidance recommends at least **48x48 dp**. The touch region is allowed to extend beyond the visible element.

"Tap to continue" and "tap to restart" prompts (`HudManager.ts:132-135, 201-204`) use `pointerdown` on the full scene — the tap target is effectively the whole screen, which is adequate. If future prompts use localized hit zones, they must meet the 44x44 minimum.

### Files to modify

- `packages/game/src/systems/HudManager.ts` — compute scale factor from display size, apply to all font sizes and margins
- `packages/game/src/systems/BossManager.ts` — scale warning/health bar text and dimensions

---

## 5. SvelteKit Shell Pages

### Current state

**Home page** (`routes/+page.svelte`): 48px heading, 240px-wide nav column, 16px button text. No media queries.

**Settings page** (`routes/settings/+page.svelte`): `max-width: 480px`, `grid-template-columns: 140px 1fr 50px`, 16px slider thumb, 13px labels.

**Play page** (`routes/play/+page.svelte`): `100vw x 100vh`. No safe area handling.

**Global CSS** (`app.css`): Only `@import "tailwindcss"` — no responsive styles.

### Gaps

- Zero media queries across entire app
- All font sizes fixed px (no `clamp()`, `rem`, or `vmin`)
- Settings grid doesn't adapt to narrow screens
- Touch targets too small (16px slider thumb vs. 44px minimum)
- No `touch-action` declarations
- `prefers-reduced-motion` not honored anywhere

### Files to modify

- `apps/web/src/app.css` — base responsive rules, safe area custom properties, `prefers-reduced-motion` defaults
- `apps/web/src/routes/+page.svelte` — responsive typography with `clamp()`, wider touch targets
- `apps/web/src/routes/settings/+page.svelte` — responsive grid, larger slider thumbs (44px minimum), `clamp()` font sizes
- `apps/web/src/routes/play/+page.svelte` — `100dvh`, safe area padding

---

## 6. UI Components (`packages/ui`)

### Current state

| Component | Mobile concern |
|---|---|
| Button | `padding: 0.5rem` (8px) — below 44px minimum touch target |
| Panel | No issues — uses relative units |
| ProgressBar | 0.75rem height, display-only — acceptable |
| Modal | `min-width: 280px` — tight on 320px screens |
| ScoreDisplay | Fixed `2rem` font — doesn't scale |

### Files to modify

- `packages/ui/src/Button.svelte` — add `min-height: 44px`, increase padding for touch
- `packages/ui/src/Modal.svelte` — change `min-width` to `min(280px, 90vw)`

---

## 7. Mobile DOM Overlay

### Rationale

Keep gameplay HUD in Phaser. But add a **thin DOM overlay** for mobile-only chrome that is easier to anchor to safe areas and make accessible than in-canvas elements:

- Pause button (top-right, safe-area aware)
- Mute toggle
- Rotate-device prompt (when portrait detected)
- Debug/FPS toggle (replaces backtick key on mobile)

This is a pragmatic hybrid — not an all-or-nothing "Phaser vs DOM" decision. The overlay renders as a Svelte component positioned absolutely over the game canvas, communicating via `GameHandle` events. The overlay must be thin and event-driven — no per-frame polling — to avoid performance impact.

### Files to modify

- New: `apps/web/src/lib/components/GameOverlay.svelte` — mobile chrome (pause, mute, rotate prompt)
- `apps/web/src/routes/play/+page.svelte` — mount overlay alongside GameCanvas
- `packages/game/src/types.ts` — add overlay-relevant events to GameEventMap if needed

---

## 8. Settings Bridge

### Current state

`GameMountOptions` (`types.ts:6-17`) passes audio volumes and `showFps` at mount time. No runtime settings updates flow from Svelte to Phaser after mount.

`AudioManager.ts:52-65` has `setVolumes()` for runtime updates, but nothing calls it from the Svelte side.

Schema fields `touchControlsEnabled`, `zoom`, and `controlScheme` exist in contracts but are not in `GameMountOptions` and cannot be passed to Phaser.

### Settings store architecture

The settings store (`apps/web/src/lib/stores/settings.svelte.ts`) uses Svelte 5 `$state` runes in a `.svelte.ts` file. This is the correct pattern — Svelte compiles `.svelte.ts` modules through its rune transform, making `$state` valid. The store guards against SSR with `typeof localStorage === 'undefined'` checks.

### Why this is P1 for mobile

For desktop, remount-time settings are tolerable. For mobile, they become a drag immediately. Players need to tune dead zone, joystick size, handedness, haptics, and audio **without remounting the game**. `TouchInput` must subscribe to runtime config changes.

### Implementation

Add `GameHandle.updateSettings(partial)` that writes to the Phaser registry and fires a registry change event. Systems that care (AudioManager, TouchInput, CombatFeedback) subscribe to the event.

### Files to modify

- `packages/game/src/types.ts` — expand `GameMountOptions.settings`, add `updateSettings()` to `GameHandle`
- `packages/game/src/mountGame.ts` — implement `updateSettings()` via registry
- `packages/game/src/scenes/GameScene.ts` — read expanded settings, subscribe to runtime changes
- `packages/game/src/systems/TouchInput.ts` — subscribe to settings changes (dead zone, handedness)
- `packages/game/src/systems/AudioManager.ts` — subscribe to volume changes via registry event

---

## 9. Game Systems: Scale Impact Assessment

Because Phaser `FIT` scales the entire canvas uniformly, the game world is always 800x600 internally, just rendered at different physical sizes. All gameplay logic (speeds, collision, spawning) operates in world coordinates and is unaffected by display size.

The real concerns are **physical usability**, not gameplay accuracy:

| Concern | Systems affected | Mitigation |
|---|---|---|
| Touch targets physically small | DropManager pickups, HudManager prompts | Enlarge game-world hit zones (minimum 44px in world coords, which maps to ~21px physical at smallest common phone scale) |
| Text physically small | HudManager, BossManager health bar label | Clamped scale factor (see Section 4) |
| Screen shake feels muted | CombatFeedback | Scale shake magnitude by inverse of display scale factor |
| Pickup magnetism radius | DropManager | Consider scaling magnetism radius up on touch devices (fingers occlude more) |

---

## 10. Audio on Mobile

### Assessment: largely mobile-ready

`AudioManager.ts` uses Phaser's sound manager. Phaser 4 handles iOS/Android audio context unlock internally (requires user gesture before first play).

`GameCanvas.svelte:9-16` handles `visibilitychange` — pauses/resumes on tab/app backgrounding.

MenuScene "click to start" naturally provides the user gesture required for audio unlock on iOS Safari.

### Architecture consideration

Audio should be treated as **resumable, not permanently initialized**. The existing `stopMusic()`/`playMusic()` pattern handles this. On mobile, audio context can be suspended by lifecycle changes (backgrounding, phone call interruption). The current `visibilitychange` handler + Phaser's internal audio management covers this adequately.

### Reduced motion

`prefers-reduced-motion` should reduce or disable screen shake intensity (via `CombatFeedback`), but audio is unaffected by this preference.

No immediate audio changes needed for mobile.

---

## 11. PWA Configuration

### Current state

**Viewport** (`app.html:5`):
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

**Manifest** (`manifest.webmanifest`): `display: "standalone"`, no `orientation`, icons at 192/512/maskable-512.

### Changes

- `app.html` — add `viewport-fit=cover` (enables safe area insets). Do **not** add `user-scalable=no`
- `manifest.webmanifest` — add `"orientation": "landscape"`
- `display_override` — MDN marks as experimental; keep out of critical path

### Service worker

Not in critical path. Implement in Phase C after core mobile gameplay is validated. Service workers provide offline-first and cache-first behavior — core game code, textures, audio, fonts, and manifest assets should be placed under an explicit caching strategy.

### Wake Lock

Progressive enhancement for Phase C. Request after user starts gameplay (clear intent signal). Must reacquire on resume after visibility change. Never assume persistence.

---

## 12. Lifecycle and State Management

### Current handling

`GameCanvas.svelte:9-16` — `visibilitychange` listener calls `handle.pause()`/`handle.resume()`.

### Mobile-specific requirements

On mobile, lifecycle events are more frequent and more varied than desktop (app backgrounding, incoming calls, notification shade, orientation changes, multitasking gestures). The lifecycle contract must be:

1. **On hide** (`visibilitychange` + `pagehide`): pause simulation, clear all input adapter state, suspend/duck audio, release Wake Lock if held
2. **On show** (`visibilitychange`): resume simulation, reacquire Wake Lock if appropriate
3. **On orientation change**: if portrait, pause and show rotate overlay; if landscape, resume
4. **On pointer cancel** (`pointercancel`): clear affected pointer ownership in touch adapter

Input state clearing on lifecycle transitions is the single most common source of mobile regressions (stuck movement, ghost inputs). The adapter lifecycle (`clear` method) must be called on every pause/blur/orientation transition.

### Files to modify

- `apps/web/src/lib/components/GameCanvas.svelte` — expand lifecycle handling (add `pagehide`)
- `packages/game/src/scenes/GameScene.ts` — call adapter `clear()` on pause
- New: `packages/game/src/systems/TouchInput.ts` — handle `pointercancel` explicitly

---

## 13. Physical Usability Risks

The hidden risk area is not gameplay logic — the fixed-world approach keeps that stable. The things most likely to fail on first mobile QA:

| Risk | Description | Mitigation |
|---|---|---|
| Thumb occlusion | Player's thumb covers action on small screens | Floating joystick with configurable offset; unconditional firing means no fire button needed |
| Stuck movement | Tab switch, background, or orientation change leaves touch state active | Adapter `clear()` on every lifecycle transition; test pause/blur/orientation sequences |
| Prompts too small to hit | "Tap to continue" text is not a real button | Current implementation uses full-scene `pointerdown` which is adequate; maintain this pattern |
| Browser gesture fight | Swipe/pinch intercepted by browser instead of game | `touch-action: none` on game container; Pointer Events API exclusively |
| Orientation flip mid-game | Game renders in portrait unexpectedly | Three-layer strategy (manifest + overlay + auto-pause) |
| Audio desync after interruption | Phone call or notification suspends audio context | Phaser handles audio context resume; `visibilitychange` ensures pause/resume |

These deserve **explicit acceptance criteria** in QA — not just "does touch work" but "does touch work after tab-switching, after rotating, after backgrounding, after pulling down notification shade."

---

## 14. Agentic Delivery Framework (Implementation Governance)

Mobile work should be executed in small vertical slices with explicit ownership and evidence, not as a single broad rewrite.

### Agent ownership map

- `svelte-shell`: shell sizing, safe area handling, overlays, settings UI/store
- `phaser-integrator`: input adapters, scene integration, runtime settings bridge, pause/orientation flow
- `schema-validator`: settings schema additions and migration-safe defaults
- `test-runner`: Vitest + Playwright coverage for lifecycle/orientation/SSR
- `diagnostician`: dev-log + browser/SSR failure triage

### Recommended PR slicing

1. **PR-1: Shell foundation** — viewport-fit, dvh usage, safe-area layout, rotate overlay scaffold, `touch-action: none`
2. **PR-2: Input intent backbone** — `InputIntent` type, `KeyboardInput` adapter (parity with current behavior), `TouchInput` adapter initial implementation
3. **PR-3: Runtime settings bridge** — `GameHandle.updateSettings()`, registry propagation, expand `GameMountOptions.settings`
4. **PR-4: HUD physical usability pass** — clamped scale factor, font size scaling, `prefers-reduced-motion` for shake
5. **PR-5: Mobile DOM overlay** — pause, mute, rotate prompt overlay component
6. **PR-6: PWA/mobile polish** (non-critical) — service worker, Wake Lock, haptics

Each PR must include:
- Updated acceptance criteria checkboxes in this doc
- Tests tied to changed behavior
- Explicit rollback note for risky behavior changes

### Gate policy for mobile work

For mobile-labeled PRs, required local checks are:

1. `pnpm validate`
2. `pnpm test:e2e`
3. Route probe sanity (`/`, `/play`, `/settings`) on preview build

Rationale: `validate` alone does not include e2e, and mobile regressions can hide in runtime route behavior.

---

## 15. Implementation Phases

### Mobile Phase A — Input-valid

Goal: game is playable on a mobile device in landscape.

Covers PR-1 and PR-2.

- Landscape shell + safe area (`viewport-fit=cover`, `100dvw/100dvh`, safe area padding)
- Rotate-device overlay (Svelte component, shown in portrait)
- `touch-action: none` on game container
- Input intent system: `InputIntent` type, `KeyboardInput` adapter, `TouchInput` adapter
- Floating virtual joystick with dead zone, max radius, pointer capture
- Both adapters emit `fireHeld: true` unconditionally (firing is already auto)
- Pause/resume clears all touch state
- Scale Manager event subscriptions (resize, orientation change)
- Wire `touchControlsEnabled` and `controlScheme: 'touch'` settings
- `prefers-reduced-motion` honored for screen shake

**Acceptance criteria:**
- [ ] Game playable on iPhone SE (375x667) in landscape
- [ ] Game playable on iPad (1024x768) in landscape
- [ ] Rotate-device overlay appears in portrait, game pauses
- [ ] Tab switch, app background, orientation change all clear touch state cleanly
- [ ] No browser zoom/scroll/gesture interference during gameplay
- [ ] Keyboard input completely unaffected on desktop
- [ ] `pnpm validate` + `pnpm test:e2e` pass

### Mobile Phase B — Physically usable

Goal: game is comfortable to play, not just technically functional.

Covers PR-3, PR-4, and PR-5.

- Runtime settings bridge: `GameHandle.updateSettings()` via registry events
- Clamped HUD scaling: `min(displayWidth/800, displayHeight/600)` scale factor
- 44pt / 48dp tap regions on all interactive elements
- Boss health bar and warning text scaled to display size
- Mobile DOM overlay: pause button, mute toggle
- Shell page responsive CSS: media queries, `clamp()` typography, 44px slider thumbs
- UI component touch target enlargement (Button min-height, Modal min-width)
- `prefers-reduced-motion` honored in shell transitions

**Acceptance criteria:**
- [ ] All interactive elements meet 44x44pt minimum touch target on iPhone SE
- [ ] Settings changeable at runtime without remounting game
- [ ] HUD text readable on both iPhone SE and iPad without being oversized on either
- [ ] Settings page usable on 320px-wide screen
- [ ] `prefers-reduced-motion` reduces shake and transition intensity

### Mobile Phase C — Product polish

Goal: mobile experience feels native-quality.

Covers PR-6.

- Haptics abstraction (Vibration API, capability-checked, settings-gated)
- Service worker for offline play and asset caching (explicit cache strategy)
- PWA install flow
- Screen Wake Lock (request on game start, release on pause, reacquire on resume)
- Low-end mobile performance profiling (CPU/GPU/battery/thermal)
- Floating joystick position memory across sessions
- Adaptive quality: reduced internal render resolution as a performance lever if needed

**Acceptance criteria:**
- [ ] Game installable as PWA and playable offline
- [ ] Haptic feedback on hits and pickups (where supported, no-op where not)
- [ ] Maintains 60fps on mid-range Android device (e.g., Pixel 6a)
- [ ] No thermal throttling warnings after 10 minutes of play
- [ ] Wake Lock keeps screen on during active gameplay
- [ ] Game remains fully playable without Wake Lock, haptics, or offline support

---

## 16. Resolved Decisions

All seven open decisions have been resolved. See [mobile-decisions.md](mobile-decisions.md) for full evidence and rationale.

| # | Decision | Outcome |
|---|---|---|
| 1 | Touch auto-fire policy | No decision needed — firing is already unconditional. No `autoFire` schema field. |
| 2 | Input adapter activation | Capability detection at mount + `controlScheme: 'touch'` as explicit override. No UA sniffing. |
| 3 | Runtime settings transport | Phaser registry `changedata-<key>` events. No custom bus. No new `GameEventMap` entries. |
| 4 | Pause ownership | Shell-authoritative. Game never self-pauses. Shell calls `handle.pause()`/`handle.resume()`. |
| 5 | Touch target strategy | Full-scene `pointerdown` for all in-canvas prompts. No localized hit zones. |
| 6 | HUD scaling envelope | Clamp `[0.6, 1.5]` with per-element pixel floors (10px HUD, 9px boss label). No debug scaling. |
| 7 | Manifest orientation | Preference only. No `screen.orientation.lock()`. Overlay + game pause is the enforcement. |

---

## 17. Anticipated Difficulties and Mitigations

| Difficulty | Why it is likely in this codebase | Mitigation |
|---|---|---|
| Input state leaks across lifecycle events | Existing keyboard path is simple; touch introduces pointer ownership complexity | Enforce adapter lifecycle (`clear/destroy`) and test pause/blur/orientation transitions |
| Divergence between contracts and runtime settings | Contracts already have settings fields not fully consumed by game runtime | Require schema + runtime + UI + tests in same PR for each setting field |
| Overgrowth in `GameScene` complexity | Scene already handles many responsibilities; mobile adds more | Keep input and HUD logic in dedicated systems/adapters; avoid adding raw touch logic inline |
| Inconsistent behavior across browsers | Orientation and safe area behavior differ across Safari/Chrome/PWA contexts | Define browser/device test matrix; keep overlay+pause strategy as fallback |
| Touch controls technically correct but physically poor | Existing UI sizes are desktop-biased | Validate on smallest target devices first (iPhone SE class); enforce 44pt/48dp minimums |
| Performance regressions from overlays and touch polling | New systems and DOM overlay add work each frame | Keep overlay thin and event-driven; profile low-end Android in Phase C |

---

## 18. Success Definition

Mobile adaptation is complete when:

1. Core routes (`/`, `/play`, `/settings`) are SSR-stable and e2e-stable
2. Touch input is reliable across orientation/background lifecycle events
3. Physical usability targets (44pt/48dp) are met on smallest supported devices
4. Settings are schema-backed, persisted, and runtime-updatable without remount
5. Desktop behavior remains unchanged unless intentionally modified
6. Game remains fully functional on devices without progressive-enhancement APIs (Wake Lock, vibration, device memory hints)
7. `prefers-reduced-motion` is honored for non-essential visual effects
