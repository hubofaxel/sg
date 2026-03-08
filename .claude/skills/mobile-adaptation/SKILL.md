---
name: mobile-adaptation
description: Mobile adaptation architecture context — three size domains, input intent, settings bridge, pause model, HUD scaling, orientation. Load when working on any mobile-related task.
---

# Mobile Adaptation — Architecture Context

Load this skill when working on any mobile-related task. Source documents:
- `docs/mobile-adaptation.md` — full plan (sections referenced as §N below)
- `docs/mobile-decisions.md` — resolved open decisions

## Three Size Domains (§ Architectural Foundation)

| Domain | Owner | Definition |
|---|---|---|
| World size | Phaser | Fixed 800x600. All gameplay logic operates here. Never changes. |
| Display size | Phaser Scale Manager | Physical pixel dimensions. FIT mode scales 800x600 into parent container preserving 4:3. Access via `scale.displaySize`, `scale.getViewPort()`. |
| Shell size | SvelteKit / CSS | Browser viewport and DOM layout. Owns safe areas, orientation overlays, fullscreen container. |

**Key rule:** Svelte sizes the container. Phaser fits the world into it. `setGameSize()` is never called — it changes the world, which we don't do.

## Input Intent Adapter Pattern (§3)

All input sources feed a single contract consumed by GameScene:

```typescript
interface InputIntent {
  moveVector: { x: number; y: number }; // normalized -1..1
  fireHeld: boolean;        // always true (auto-fire is unconditional)
  secondaryHeld: boolean;   // future: bomb/ability
  pausePressed: boolean;    // pause toggle
}
```

Two adapters: `KeyboardInput` (wraps existing cursor+WASD), `TouchInput` (floating joystick, pointer capture). Both emit `fireHeld: true` unconditionally — the game already auto-fires every frame, there is no player fire input.

Adapter lifecycle: `create(scene)` → `update(): InputIntent` → `clear()` → `destroy()`. Call `clear()` on every pause, blur, orientation change, and scene transition.

Activation: capability check at mount (`'ontouchstart' in window || navigator.maxTouchPoints > 0`), gated by `touchControlsEnabled`, overridden by `controlScheme: 'touch'`. No UA sniffing. No runtime hot-swap in Phase A.

## Runtime Settings Transport (§8, Decision 3)

`GameHandle.updateSettings(partial)` writes to Phaser registry via `registry.set(key, value)`. Systems subscribe to `registry.events.on('changedata-<key>', callback)` in `create()`. No new GameEventMap entries. GameEventBus remains game→shell only.

## Shell-Authoritative Pause (Decision 4)

Shell owns all pause state. All triggers (visibility, orientation, overlay button) call `GameHandle.pause()` from Svelte. Game never self-pauses. GameScene listens for its own `pause` lifecycle event and calls `adapter.clear()`. No bidirectional sync. No pause query API.

## HUD Scaling (§4, Decision 6)

Scale factor: `Math.min(displayWidth / 800, displayHeight / 600)`, clamped to `[0.6, 1.5]`.

Per-element pixel floors after clamping:
- Persistent HUD (score, lives, currency, wave indicator): `Math.max(scaled, 10)`
- Boss health bar label: `Math.max(scaled, 9)`
- Titles/banners (40px, 36px, 22px base): no floor needed
- Debug overlay: do not scale

Recompute on Scale Manager `resize` event.

## Orientation Strategy (Decision 7)

Three layers — manifest is advisory only:
1. Manifest: `"orientation": "landscape"` (hint for future PWA installs)
2. Shell overlay: `RotateOverlay.svelte` shown in portrait (real enforcement)
3. Game pause: GameScene auto-pauses on portrait, clears adapter

No `screen.orientation.lock()` anywhere. iOS Safari doesn't support it.

## Boundary Rules

- `phaser-integrator` owns `packages/game/` — never touches `apps/web/` or `packages/ui/`
- `svelte-shell` owns `apps/web/` and `packages/ui/` — never imports Phaser types
- Schema changes go through `schema-validator` in `packages/contracts/` and must land before consumers
- Settings type in `GameMountOptions` is derived from or mapped to `@sg/contracts` shape
- `touch-action: none` on game container (shell responsibility)
- No `user-scalable=no` in viewport meta
