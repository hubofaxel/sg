# Mobile Open Decisions — Context Brief

Facts-only evidence gathered from codebase, documentation, and platform constraints.
No recommendations — only data to inform decisions.

---

## Decision 1: Touch Auto-Fire Policy

### Current Firing Mechanism

The game **already auto-fires continuously**. There is no player input for firing.

- `GameScene.ts:224,238` — `update(time)` calls `handleFiring(time)` every frame
- `GameScene.ts:280-282` — fires whenever `time - this.lastFired >= cooldownMs`
- No pointer or keyboard event triggers firing; it is unconditional

### Weapon Fire Rates and Behaviors

All 4 weapons use cooldown-based firing (`primary.json`):

| Weapon | Type | Cooldown Range | Notes |
|--------|------|----------------|-------|
| Pulse Laser | `basic-laser` | 0.15-0.25s | 1-3 projectiles; standard cooldown |
| Scatter Cannon | `spread-shot` | 0.28-0.4s | 3-7 fan projectiles; standard cooldown |
| Seeker Missile | `missile` | 0.8-1.2s | 1-3 homing projectiles; standard cooldown |
| Plasma Beam | `beam` | 1.2-2.0s | Beam lasts 0.8-2.0s; cooldown starts on **expiry** not fire |

The beam weapon (`primary.json:182-248`) has `"startOn": "expiry"` — cooldown resets after the beam finishes, not after firing. This is the only non-standard pattern.

### Schema Fire Patterns

`weapon.schema.ts:30-52` — Schema supports only:
- `cooldown` with `startOn` property (fire or expiry)
- `projectileCount`, `spreadAngle` (spread patterns)
- `beamWidth`, `beamDuration` (beam-specific)
- `homingStrength` (missile-specific)

**No charge, burst, or toggle-fire patterns exist in the schema.**

### Future Fire Patterns

`ROADMAP.md:260` — "Expanded weapon behavior" lists **"Fire patterns: burst, charge, continuous"** as explicitly deferred to post-launch. No implementation exists or is planned for current phases.

### Hard Constraints

- Auto-fire is the current and only behavior — adding optional manual fire would be a new feature, not a policy choice
- Beam weapon's cooldown-on-expiry semantics are compatible with auto-fire (fires once, waits for beam to end, cooldown, fires again)

---

## Decision 2: Input Adapter Activation

### Current Settings Schema

`settings.schema.ts:7-8,27`:
- `controlScheme`: Enum `'wasd' | 'arrows'` — keyboard layout only
- `touchControlsEnabled`: Boolean, defaults `true` — gate for touch UI visibility

**These are complementary, not redundant.** `controlScheme` selects keyboard layout; `touchControlsEnabled` gates touch UI appearance.

### Settings Persistence

`settings.svelte.ts:5-15,29-30`:
- Loaded from `localStorage` via `GameSettingsSchema.parse()`
- Stored as JSON under key `'sg-settings'`
- `settings.update(partial)` does shallow merge + immediate localStorage persist
- **Read once at mount time** — no runtime sync to game

### Current Input Handling

`GameScene.ts:105-114,254-277`:
- Both cursor keys AND WASD are created and active simultaneously
- `handleMovement()` reads both: `const left = this.cursors.left.isDown || this.wasd.A.isDown`
- **`controlScheme` setting is completely unwired** — both layouts always work
- No touch input, no device detection, no conditional activation

### Settings Flow to Game

`types.ts:11-16` — `GameMountOptions.settings` carries only: `masterVolume`, `sfxVolume`, `musicVolume`, `showFps`

**Missing from mount options:** `controlScheme`, `touchControlsEnabled`, `zoom`, `screenShake`

### Device Detection

**Zero device detection anywhere in the game package.** No references to:
- `game.device` or `Phaser.device`
- `input.touch` or `activePointer`
- User-agent sniffing or capability queries

### Gaps

- Phaser 4 RC device detection API surface is undocumented in the project; would need Phaser source inspection to confirm `game.device.input.touch` availability

---

## Decision 3: Runtime Settings Transport

### Current Registry Usage

`mountGame.ts:39,43-47` — Registry stores two values at mount time:
- `'eventBus'` — `GameEventBus` instance
- `'audioVolumes'` — `{master, sfx, music}` object

### How Scenes Read Registry

| File | Line | Key | When |
|------|------|-----|------|
| PreloadScene.ts | 18 | eventBus | `init()` |
| MenuScene.ts | 13 | eventBus | `init()` |
| GameScene.ts | 65 | eventBus | `init()` |
| GameScene.ts | 81-84 | audioVolumes | `create()` |

All reads are **one-time at scene init/create**. No change subscriptions.

### AudioManager.setVolumes()

`AudioManager.ts:53-65` — Method exists, is fully implemented (recomputes effective volume, applies to playing music), but **is never called** after construction. No code path invokes it at runtime.

### GameEventBus and GameEventMap

`events.ts:9-36`, `types.ts:20-27` — Custom typed event emitter with events:

| Event | Args | Direction |
|-------|------|-----------|
| `score` | `[number]` | game -> shell |
| `death` | `[]` | game -> shell |
| `stage-clear` | `[stageIndex, score, currency]` | game -> shell |
| `scene-change` | `[string]` | game -> shell |
| `ready` | `[]` | game -> shell |
| `error` | `[Error]` | game -> shell |

**All events flow game-to-shell only.** No shell-to-game events exist.

### GameHandle Public API

`types.ts:30-37` — Exposes: `destroy()`, `pause()`, `resume()`, `emit()`, `on()`, `off()`

**No `updateSettings()` method.** Settings can only enter the game at mount time.

### Shell Integration

`GameCanvas.svelte:22-30` — Reads `settings.value` once at mount, passes audio subset to `mountGame()`. No post-mount sync.

### Registry Change Events

**No `changedata` listeners anywhere in the codebase.** The registry is treated as a static key-value store. Phaser's registry does support `changedata` events (available since Phaser 3, likely present in RC), but this capability is unused.

---

## Decision 4: Pause Ownership

### Current Pause Flow

Pause is **entirely shell-owned**:

1. `GameCanvas.svelte:9-16,41` — `visibilitychange` listener calls `handle.pause()` on tab hide, `handle.resume()` on tab show
2. `mountGame.ts:55-60` — `GameHandle.pause()/resume()` proxy to `game.pause()/game.resume()` (Phaser global pause)
3. **No game-side pause triggers exist** — GameScene, BossManager, WaveManager never call `scene.pause()` or `game.pause()`

### Pause-Like Behaviors (Not Actual Pause)

| System | Mechanism | Duration | What Pauses | Lines |
|--------|-----------|----------|-------------|-------|
| CombatFeedback | `scene.physics.pause()` | 30ms (hit-stop) | Physics only (tweens/time continue) | CombatFeedback.ts:68,70 |
| BossManager | `scene.tweens.add()` + `delayedCall()` | Variable | Nothing paused; delays via timers | BossManager.ts:70-155 |
| WaveManager | `scene.time.delayedCall()` | Per wave predelay | Nothing paused; delays via timers | WaveManager.ts:148,170-175 |

### Pause State Events

**GameEventMap has no pause-related events.** The shell cannot query or observe pause state — it can only send pause/resume commands.

### Hard Constraints

- Game never self-pauses (no boss-intro pause, no wave-transition pause)
- Hit-stop is physics-only and too brief (30ms) to conflict with a user-facing pause
- A mobile pause button would need to either: (a) call `GameHandle.pause()` from the shell, or (b) add a new shell-to-game event

---

## Decision 5: Touch Target Strategy for In-Canvas Prompts

### All Pointer Listeners in Game Package

Exactly 3 `pointerdown` listeners exist, all **scene-wide**:

| Location | Line | Trigger | Delay | Purpose |
|----------|------|---------|-------|---------|
| MenuScene.ts | 56 | `this.input.once('pointerdown')` | None | Start game |
| HudManager.ts | 134 | `scene.input.once('pointerdown')` | 500ms | Restart after game-over |
| HudManager.ts | 203 | `scene.input.once('pointerdown')` | 500ms | Continue after stage-clear |

**No other pointer listeners.** No `pointerup`, `pointermove`, or `setInteractive()` calls anywhere in the game package.

### Hit Zone Strategy

All prompts use the **entire canvas as the tap target**:
- Text elements are display-only (no `setInteractive()`)
- Tapping anywhere on the canvas triggers the action
- 500ms delay on game-over/stage-clear prevents accidental re-triggers

### Planned Future Interactive Elements

From `mobile-adaptation.md`:
- **Floating joystick** (Phase A) — touch adapter, not a UI button
- **DOM overlay buttons** (pause, mute) — intentionally outside canvas, in Svelte DOM layer (`mobile-adaptation.md:368-373`)
- **Shop/upgrade UI** — deferred to Phase C, no design exists

### Hard Constraints

- Scene-wide `pointerdown` inherently exceeds 44x44pt minimum touch target (entire canvas)
- All current prompts are single-action ("tap anywhere to continue") — no multi-option screens
- Future multi-option screens (shop, upgrades) would require localized hit zones but are not in scope

---

## Decision 6: HUD Scaling Envelope

### Game World Dimensions

`mountGame.ts:10-11,23-26`:
- World: **800x600** (4:3 aspect ratio)
- Scale mode: `Phaser.Scale.FIT` with `Phaser.Scale.CENTER_BOTH`
- FIT mode scales the canvas to fit within the container while preserving aspect ratio

### All Font Sizes in HUD System

| Element | Size | Position | File:Line |
|---------|------|----------|-----------|
| Score text | 16px | (10, 10) | HudManager.ts:19-23 |
| Lives text | 16px | (10, 30) | HudManager.ts:24-28 |
| Credits text | 16px | (10, 50) | HudManager.ts:29-33 |
| Wave indicator | 14px | (w/2, 12) | HudManager.ts:34-40 |
| Wave banner | 22px | (w/2, h*0.2) | HudManager.ts:71-75 |
| Boss warning | 36px | (w/2, h*0.35) | BossManager.ts:116-120 |
| Boss name (warning) | 20px | (w/2, h*0.45) | BossManager.ts:126-130 |
| Boss name (health bar) | 12px | (barX, barY-14) | BossManager.ts:280-284 |
| Game over title | 40px | (w/2, h*0.35) | HudManager.ts:93-97 |
| Game over score | 24px | (w/2, h*0.45) | HudManager.ts:101-105 |
| Game over credits | 18px | (w/2, h*0.52) | HudManager.ts:109-113 |
| Game over prompt | 16px | (w/2, h*0.6) | HudManager.ts:117-121 |
| Stage clear title | 40px | (w/2, h*0.28) | HudManager.ts:148-152 |
| Stage clear score | 24px | (w/2, h*0.4) | HudManager.ts:156-160 |
| Stage clear credits | 18px | (w/2, h*0.48) | HudManager.ts:164-168 |
| Stage clear bonus | 16px | (w/2, h*0.54) | HudManager.ts:173-177 |
| Stage clear prompt | 16px | (w/2, h*0.63) | HudManager.ts:186-190 |
| Debug overlay | 11px | (w-10, 10) | DebugOverlay.ts:42-47 |

### Scale Factor Calculations

Scale factor = `min(viewportWidth/800, viewportHeight/600)`

#### iPhone SE Landscape (568x320)
- Factor: `min(568/800, 320/600) = min(0.71, 0.533) = 0.533`
- 16px HUD text -> **8.5px** (below 10px readability threshold)
- 14px wave text -> **7.5px** (likely unreadable)
- 12px boss health label -> **6.4px** (unreadable)
- 40px titles -> **21.3px** (fine)
- 11px debug -> **5.9px** (unreadable, but debug-only)

#### iPhone 15 Landscape (844x390)
- Factor: `min(844/800, 390/600) = min(1.055, 0.65) = 0.65`
- 16px HUD text -> **10.4px** (borderline readable)
- 12px boss health label -> **7.8px** (marginal)

#### iPad Landscape (1024x768)
- Factor: `min(1024/800, 768/600) = min(1.28, 1.28) = 1.28`
- 40px title -> **51.2px** (oversized but acceptable)
- 16px HUD text -> **20.5px** (comfortable)

### Mobile Landscape Viewport Reference (CSS Pixels)

| Device | Width | Height | Scale Factor | 16px Becomes | 12px Becomes |
|--------|-------|--------|--------------|--------------|--------------|
| iPhone SE | 568 | 320 | 0.533 | 8.5px | 6.4px |
| iPhone 15 | 844 | 390 | 0.65 | 10.4px | 7.8px |
| iPhone 15 Pro Max | 932 | 430 | 0.717 | 11.5px | 8.6px |
| Samsung Galaxy S24 | 968 | 439 | 0.732 | 11.7px | 8.8px |
| Google Pixel 8 | 960 | 432 | 0.72 | 11.5px | 8.6px |
| iPad mini | 1024 | 683 | 1.0 | 16.0px | 12.0px |
| iPad Air | 1366 | 1024 | 1.28 | 20.5px | 15.4px |

### Hard Constraints

- iPhone SE (smallest common phone) scales to 0.533x — persistent HUD text (14-16px) falls below 10px readable threshold
- All phones with <600px landscape height will scale below 1.0x, shrinking all text
- Tablets at or above 600px height get 1.0x+ scaling — no readability concern
- Note: device pixel ratio (2x-3x on phones) means physical pixels are finer, but CSS pixel size determines perceived readability

---

## Decision 7: Manifest Orientation Strictness

### Current Manifest

`apps/web/static/manifest.webmanifest`:
- `"display": "standalone"`
- **No `"orientation"` field** (absent entirely)
- Three icons (192, 512, maskable-512)

### Existing Orientation Code

**None.** No `screen.orientation`, orientation lock, or orientation media queries exist anywhere in `apps/web/src/`.

### Current Viewport Configuration

- `app.html:5` — `<meta name="viewport" content="width=device-width, initial-scale=1" />`
- **Missing:** `viewport-fit=cover` (needed for notch/safe-area handling)
- Play page uses `100vw/100vh` (legacy), not `100dvw/100dvh` (dynamic viewport units)

### PWA Status

- **No PWA plugin integrated** — `vite.config.ts` contains only `@sveltejs/kit/vite` and `@tailwindcss/vite`
- **No service worker** — deferred to Phase C per `mobile-adaptation.md:465-468`
- PWA skill template exists (`.claude/skills/pwa-delivery/SKILL.md`) but is not activated

### Platform Facts: Manifest `orientation` Field

- **Preference hint only** — not a hard lock in browser tabs
- **Enforced only for installed PWAs** (Add to Home Screen) in some browsers
- Valid values: `"landscape"`, `"landscape-primary"`, `"portrait"`, `"portrait-primary"`, `"natural"`, etc.

### Platform Facts: `screen.orientation.lock()`

- Requires fullscreen API context OR installed PWA context
- Very limited browser support in regular browser tabs
- **iOS Safari does NOT support `screen.orientation.lock()` at all** — even installed PWAs
- Classified as "experimental/deferred" in `mobile-adaptation.md:62-67`

### Planned Three-Layer Strategy

From `mobile-adaptation.md:118-124`:

1. **Manifest** — `"orientation": "landscape"` as launch default (soft hint)
2. **Shell overlay** — Svelte renders "rotate your device" prompt when viewport is portrait
3. **Game pause** — GameScene auto-pauses when orientation is portrait, clears input state

The overlay (layer 2) and game pause (layer 3) exist specifically because the manifest field alone is insufficient — it cannot enforce orientation in browser tabs or on iOS.

### Hard Constraints

- iOS Safari ignores `screen.orientation.lock()` entirely — programmatic locking is not viable cross-platform
- Manifest `orientation` only works for installed PWAs, and even then inconsistently
- The rotate-device overlay is the only reliable cross-platform mechanism
- Without PWA plugin integration (Phase C), manifest orientation is purely advisory
