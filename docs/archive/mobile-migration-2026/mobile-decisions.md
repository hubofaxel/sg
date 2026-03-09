# Mobile Open Decisions — Resolution Directive

Addendum to `MOBILE-ORCHESTRATION-DIRECTIVE.md`. Resolves all seven open decisions from `mobile-adaptation.md` §16 with binding outcomes. The planning agent must treat these as settled — do not re-surface these decisions to the operator.

**Evidence source:** `mobile-open-decisions-brief.md` (codebase audit, platform facts, schema inspection).

---

## Decision 1: Touch Auto-Fire Policy

### Resolution: No decision required. Auto-fire is the existing and only behavior.

**Evidence:** `GameScene.ts:224,238,280-282` fires unconditionally every frame when cooldown expires. There is no player input for firing — no key binding, no pointer event, no toggle. All four weapons use cooldown-based firing with no charge, burst, or toggle patterns in the schema. The roadmap explicitly defers expanded fire patterns ("burst, charge, continuous") to post-launch.

**What this means for the planning agent:**

- Remove `autoFire` from the candidate schema additions. The field is meaningless when firing is already unconditional. Adding a boolean that defaults to the only existing behavior creates a settings ghost — a toggle that does nothing.
- The `InputIntent.fireHeld` field is still useful as a **future hook** for when manual fire patterns ship post-launch. Define it in the interface, but `KeyboardInput` and `TouchInput` should both emit `fireHeld: true` unconditionally in their current implementation. This preserves the adapter contract without pretending player-controlled firing exists today.
- Update the PR-2 task prompt for `schema-validator`: do NOT add `autoFire` to `GameSettingsSchema`. The only schema change needed is extending `ControlSchemeSchema` to include `'touch'`.

**Downstream impact:** Simplifies PR-2. One fewer schema field, one fewer setting to wire, one fewer UI element in the settings page. The `TouchInput` adapter no longer needs "auto-fire as default on touch" logic — it just emits `fireHeld: true` like everything else.

---

## Decision 2: Input Adapter Activation

### Resolution: Capability detection at mount time, with `controlScheme: 'touch'` as the explicit user override. No UA sniffing.

**Evidence:**

- Zero device detection exists in the codebase today. The plan's anti-patterns (§ Platform Capability Policy) explicitly prohibit UA sniffing.
- `controlScheme` is currently `'wasd' | 'arrows'` but is **completely unwired** — both layouts are always active simultaneously (`GameScene.ts:254-277` reads both cursor keys AND WASD regardless of the setting).
- `touchControlsEnabled` exists as a boolean gate for touch UI visibility, separate from the control scheme enum.
- Phaser's `game.device` API availability in RC is unconfirmed by project documentation.

**Activation strategy — two layers:**

1. **Mount-time heuristic:** At `mountGame()`, check `'ontouchstart' in window || navigator.maxTouchPoints > 0`. If true AND `controlScheme` is not explicitly set to `'wasd'` or `'arrows'` by the user, activate `TouchInput`. Otherwise activate `KeyboardInput`. This is a capability check, not UA sniffing.

2. **User override via settings:** Extending `ControlSchemeSchema` to `'wasd' | 'arrows' | 'touch'` allows explicit selection. If a user on a touch device sets `'wasd'` (e.g., using a Bluetooth keyboard with a tablet), the heuristic is overridden. If a user on a desktop sets `'touch'` (for testing or accessibility), they get the joystick.

**What this means for the planning agent:**

- PR-2 `schema-validator` task: extend `ControlSchemeSchema` to `'wasd' | 'arrows' | 'touch'`. Default remains `'wasd'` (existing persisted settings must still parse).
- PR-2 `phaser-integrator` task: `GameScene.create()` selects adapter using: (a) if `controlScheme === 'touch'`, use `TouchInput`; (b) if `controlScheme` is `'wasd'` or `'arrows'` but touch capability is detected and `touchControlsEnabled` is true, use `TouchInput`; (c) otherwise use `KeyboardInput`. This means `touchControlsEnabled` acts as the heuristic gate and `controlScheme: 'touch'` acts as the explicit force.
- Both `KeyboardInput` adapters (`wasd` and `arrows`) should remain a single adapter that reads both layouts simultaneously — matching current behavior. The `controlScheme` distinction between `'wasd'` and `'arrows'` remains unwired for now (it was unwired before mobile work and fixing that is out of scope for mobile adaptation).
- No runtime adapter hot-swapping in Phase A. Changing `controlScheme` in settings takes effect on next game mount. Runtime hot-swap is a Phase B concern if it proves necessary.

---

## Decision 3: Runtime Settings Transport

### Resolution: Phaser registry `changedata` events. No custom event bus.

**Evidence:**

- The registry already exists and stores values (`mountGame.ts:39,43-47`). It is read at scene init/create by all major systems.
- Phaser's registry supports `changedata` and `changedata-<key>` events (inherited from Phaser 3, present in RC). This capability exists but is completely unused — zero `changedata` listeners in the codebase.
- `GameEventBus` flows game→shell only. Adding shell→game events would repurpose a unidirectional channel, muddying its semantics.
- `AudioManager.setVolumes()` exists and is fully implemented but never called at runtime — it is waiting for exactly this transport.

**Implementation contract:**

- `GameHandle.updateSettings(partial)` writes each changed key to the Phaser registry via `game.registry.set(key, value)`.
- Systems that need runtime updates subscribe to `game.registry.events.on('changedata-<key>', callback)` in their `create()` method.
- Initial subscription list: `AudioManager` subscribes to `audioVolumes`. `TouchInput` subscribes to `touchDeadZone`, `touchMaxRadius`, `touchHandedness` (Phase B fields — subscribe defensively, no-op if values absent).
- `GameEventBus` remains game→shell only. Do not add settings events to `GameEventMap`.

**What this means for the planning agent:**

- PR-3 `phaser-integrator` task: implement `updateSettings()` on `GameHandle` as a registry write loop. Each key in the partial gets `registry.set()`. Systems subscribe to specific keys they care about.
- PR-3 `svelte-shell` task: when settings store changes, call `handle.updateSettings(changedFields)`. Use Svelte 5 `$effect` to react to store changes and push the delta.
- No new event types on `GameEventMap`. No custom event bus. The registry is the transport.

---

## Decision 4: Pause Ownership

### Resolution: Shell-authoritative. Game never self-pauses. This is already the architecture — formalize it, don't change it.

**Evidence:**

- Pause is 100% shell-initiated today (`GameCanvas.svelte:9-16,41` → `handle.pause()/resume()`).
- Game-side "pause-like" behaviors (hit-stop physics pause at 30ms, timed delays in BossManager/WaveManager) are not user-facing pauses — they are gameplay timing mechanisms that should continue regardless of pause state.
- `GameEventMap` has no pause events. The shell sends commands; the game does not notify.
- Adding bidirectional pause sync would require new events, new state reconciliation, and new edge cases — all for a problem that doesn't exist.

**Formalized contract:**

- **Shell owns pause state.** All pause triggers (visibility change, orientation change, DOM overlay pause button, notification shade) originate in the shell and call `GameHandle.pause()`.
- **Game never calls `game.pause()` or `scene.pause()` on its own.** If a future game-side pause need arises (e.g., dialogue system, cutscene), it should use scene-local time scaling or physics pause — not global game pause.
- **The mobile DOM overlay pause button** calls `handle.pause()` from Svelte. When the player taps resume, the shell calls `handle.resume()`. The game does not need to know the pause source.
- **Adapter `clear()` is called by `GameScene` when it receives a pause signal** (the scene's `pause` event). This is game-side behavior triggered by the shell's pause command — not the game deciding to pause.

**What this means for the planning agent:**

- PR-5 `svelte-shell` task (GameOverlay): the pause button calls `handle.pause()` directly. On resume, calls `handle.resume()`. No new events needed on `GameEventMap`.
- PR-2 `phaser-integrator` task: `GameScene` listens for its own `pause` event (Phaser scene lifecycle) and calls `adapter.clear()`. It does not need to know whether the pause came from visibility change, orientation change, or a button tap.
- No bidirectional sync. No pause state query API. The shell knows it paused the game because it sent the command.

---

## Decision 5: Touch Target Strategy for In-Canvas Prompts

### Resolution: Maintain full-scene `pointerdown` as the standard pattern. No localized hit zones.

**Evidence:**

- Exactly 3 pointer listeners exist in the game package, all scene-wide `input.once('pointerdown')`.
- Text elements are display-only (no `setInteractive()`) — the tap target is the entire canvas, which inherently exceeds any minimum touch target requirement.
- The 500ms delay on game-over/stage-clear prevents accidental double-triggers.
- Future interactive elements that need localized targeting (shop, upgrades) are deferred to Phase C with no design yet.
- The mobile DOM overlay (pause, mute) lives in the Svelte DOM layer, not in canvas — its touch targets are CSS-governed and separate from this decision.

**Formalized pattern:**

- All in-canvas prompts ("tap to start", "tap to continue", "tap to restart") use scene-wide `this.input.once('pointerdown')`.
- Prompt text is display-only with no `setInteractive()`.
- Maintain the 500ms delay guard on state-transition prompts.
- If a future feature requires in-canvas multi-option UI (shop, upgrade selection), that feature's design must define its own hit zone strategy — it is not pre-decided here.

**What this means for the planning agent:**

- No changes to existing pointer listeners in PR-2 or PR-4.
- The `TouchInput` adapter's pointer handling is separate from prompt handling — the adapter manages joystick pointers, prompts manage scene-wide taps, and these do not conflict because prompts appear during game-over/stage-clear states when the joystick is inactive.
- PR-4 acceptance criteria for "44pt tap regions on all interactive elements" is automatically satisfied for in-canvas prompts (full scene > 44pt). The criterion applies to DOM elements (buttons, sliders, overlay controls).

---

## Decision 6: HUD Scaling Envelope

### Resolution: Non-uniform scaling with a raised floor for persistent HUD text. Clamp range `[0.6, 1.5]` with a per-element minimum pixel size of 10px.

**Evidence — the problem is specific:**

The uniform `min(dW/800, dH/600)` factor drops to **0.533** on iPhone SE landscape. At that factor:
- 16px persistent HUD (score, lives, currency) → 8.5px — **below readable threshold**
- 14px wave indicator → 7.5px — **unreadable**
- 12px boss health label → 6.4px — **unreadable**
- 40px titles (game over, stage clear) → 21.3px — fine
- 11px debug overlay → 5.9px — acceptable (debug-only)

On mid-range phones (iPhone 15 class, factor ~0.65), persistent HUD text at 16px → 10.4px — borderline. On tablets (factor 1.28), 40px titles → 51.2px — oversized but acceptable.

**The issue is not titles or overlays — it is the small persistent text that lives on screen during gameplay.**

**Scaling rules:**

1. **Base scale factor:** `Math.min(displayWidth / 800, displayHeight / 600)` — same formula from the plan.
2. **Clamp range:** `Math.max(0.6, Math.min(scaleFactor, 1.5))` — floor at 0.6 prevents the extreme 0.533 case on iPhone SE; ceiling at 1.5 prevents oversized text on large tablets.
3. **Per-element pixel floor:** After applying the clamped scale factor, enforce `Math.max(computedSize, 10)` on persistent HUD text (score, lives, currency, wave indicator) and `Math.max(computedSize, 9)` on the boss health bar label. This catches edge cases where even the 0.6 clamp produces sub-readable sizes.
4. **Titles and banners** (40px game over, 36px boss warning, 22px wave banner): apply the clamped factor without a per-element floor — they are large enough that even 0.6x keeps them well above readable thresholds.
5. **Debug overlay** (11px): do not scale. It is developer-facing and readability on small phones is not a requirement.

**Concrete outcomes at key devices:**

| Device | Raw Factor | Clamped Factor | 16px HUD → | 14px Wave → | 12px Boss Label → | 40px Title → |
|--------|-----------|---------------|-----------|------------|-------------------|-------------|
| iPhone SE | 0.533 | 0.6 | 10px (floor) | 10px (floor) | 9px (floor) | 24px |
| iPhone 15 | 0.65 | 0.65 | 10.4px | 10px (floor) | 9px (floor) | 26px |
| Pixel 8 | 0.72 | 0.72 | 11.5px | 10.1px | 9px (floor) | 28.8px |
| iPad mini | 1.0 | 1.0 | 16px | 14px | 12px | 40px |
| iPad Air | 1.28 | 1.28 | 20.5px | 17.9px | 15.4px | 51.2px |

**What this means for the planning agent:**

- PR-4 `phaser-integrator` task: `HudManager` computes the clamped scale factor on create and on resize. Each text element stores its base font size. On scale update: `fontSize = Math.max(baseSize * clampedFactor, minPixels)`. The `minPixels` value is 10 for persistent HUD, 9 for boss health label, and absent (no floor) for titles/banners.
- Store the scale factor and min-pixel constants as named constants in `HudManager`, not as magic numbers.
- `BossManager` receives the same scale factor (either via a shared utility function or by subscribing to the same resize event). Apply to warning text (36px base) and boss name (20px base) with no pixel floor needed.
- Do not scale debug overlay.
- PR-4 `test-runner` task: unit test the scale factor computation at the five device sizes above, verifying clamping and per-element floors.

---

## Decision 7: Manifest Orientation Strictness

### Resolution: Preference only. `"orientation": "landscape"` in manifest as an advisory hint. No programmatic locking. The rotate overlay is the real enforcement.

**Evidence:**

- iOS Safari does not support `screen.orientation.lock()` at all — programmatic locking is not viable cross-platform.
- Manifest `orientation` is enforced only for installed PWAs, and inconsistently across browsers. The game has no PWA plugin, no service worker, and no install flow until Phase C.
- The plan already defines a three-layer strategy (manifest + overlay + game pause) specifically because the manifest alone is insufficient.
- `display_override` is marked experimental by MDN and excluded from the critical path.

**Implementation contract:**

1. **Manifest:** Add `"orientation": "landscape"` to `manifest.webmanifest`. This is a one-line change with zero behavioral impact in browser tabs — it is purely advisory for future PWA installs.
2. **Shell overlay (the real enforcement):** `RotateOverlay.svelte` renders when viewport is portrait. This is the user-facing mechanism.
3. **Game pause (the safety net):** `GameScene` auto-pauses on orientation change to portrait and calls `adapter.clear()`. This prevents gameplay in an unsupported orientation even if the overlay fails to render.
4. **No `screen.orientation.lock()` anywhere.** Not in Phase A, not in Phase C. It is unreliable and the overlay strategy makes it unnecessary.

**What this means for the planning agent:**

- PR-1 `svelte-shell` task: add `"orientation": "landscape"` to manifest. Build `RotateOverlay.svelte` as the primary orientation enforcement.
- PR-2 `phaser-integrator` task: subscribe to `Phaser.Scale.Events.ORIENTATION_CHANGE` in `GameScene`. On portrait: pause scene, clear adapter. On landscape: resume. This is the safety net behind the overlay.
- No `screen.orientation.lock()` in any task prompt. If an agent proposes it, reject.
- Phase C PWA work: when the PWA install flow ships, the manifest `orientation` field will start having real effect for installed instances. No additional work needed — it is already set.

---

## Summary of Amendments to Orchestration Directive

These decisions change the orchestration plan in the following concrete ways:

### PR-2 schema changes (simplified)

- **Add** `'touch'` to `ControlSchemeSchema` — unchanged from original plan.
- **Remove** `autoFire` from schema additions — Decision 1 eliminated it.
- Default for `controlScheme` remains `'wasd'` — existing persisted data must parse.

### PR-2 adapter activation logic (new specificity)

- Mount-time capability check: `'ontouchstart' in window || navigator.maxTouchPoints > 0`.
- `touchControlsEnabled` gates the heuristic. `controlScheme: 'touch'` forces it.
- No runtime hot-swap in Phase A. Setting change takes effect on next mount.

### PR-3 transport mechanism (confirmed)

- Registry `changedata-<key>` events. No new `GameEventMap` entries. No custom bus.

### PR-5 pause button (simplified)

- Calls `handle.pause()` / `handle.resume()` directly. No bidirectional sync protocol.

### PR-4 scaling implementation (new specificity)

- Clamped factor `[0.6, 1.5]` with per-element pixel floors (10px HUD, 9px boss label).
- Five-device test matrix for scale factor verification.

### All PRs — orientation handling

- No `screen.orientation.lock()` in any task. Overlay + game pause is the enforcement.

---

The planning agent should incorporate these resolutions into its task prompts and state log. All seven decisions are now resolved. The `Decisions pending` table in the state log should be empty.
