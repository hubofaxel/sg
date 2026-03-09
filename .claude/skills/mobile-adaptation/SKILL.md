---
name: mobile-adaptation
description: Mobile adaptation architecture context — four size domains, input intent, settings bridge, pause model, HUD scaling, orientation. Load when working on any mobile-related task.
---

# Mobile Adaptation — Architecture Context

Load this skill when working on any mobile-related task. Source documents:
- `docs/RESPONSIVE_GAMEPLAY.md` — rendering pipeline, safe-zone model, aspect-ratio behavior
- `docs/DELIVERY_PLAN.md` — current status and priorities
- `docs/archive/mobile-migration-2026/` — historical implementation docs (for reference only)

## Four Size Domains

| Domain | Owner | Definition |
|---|---|---|
| World size | Phaser | Dynamic: height fixed at 600, width computed from container aspect ratio (800-1200). `computeWorldSize()` in `systems/SafeZone.ts`. |
| Display size | Phaser Scale Manager | Physical pixel dimensions. FIT mode scales the dynamic world into the container. Access via `scale.displaySize`. |
| Shell size | SvelteKit / CSS | Browser viewport and DOM layout. Owns safe areas, orientation overlays, fullscreen container. |
| Margin size | Phaser (safe zone math) | Space between safe zone edges and world edges. On 20:9 phones ~200px per side. On 4:3 devices, zero. Touch control zones on wide screens. |

**World sizing:** `mountGame.ts` measures the container, calls `computeWorldSize()` to get width (800-1200), creates the Phaser game at that size, and calls `setGameSize()` on resize. A centered `SafeZone` (800x600) defines the gameplay density area — all spawning, wave patterns, and boss encounters are authored against this rectangle.

## SafeZone Architecture

`systems/SafeZone.ts` exports pure functions (no Phaser dependency):
- `computeWorldSize(containerW, containerH, minWidth?, maxWidth?)` — returns `{ width, height }`
- `createSafeZone(worldWidth, worldHeight)` — returns `SafeZone` (x, y, width, height, centerX, centerY, right, bottom)

Registry keys set by mountGame: `worldWidth`, `worldHeight`, `safeZone`. Updated on resize.

Systems use safe zone for spawning (WaveManager), boss positioning (BossManager). Systems use gameSize for player bounds, physics bounds, HUD anchoring, projectile cleanup, background fill.

## Input Intent Adapter Pattern

All input sources feed a single contract consumed by GameScene:

```typescript
interface InputIntent {
  moveVector: { x: number; y: number };
  isPositionDelta: boolean; // true = position offset, false = velocity normalized -1..1
  fireHeld: boolean;
  secondaryHeld: boolean;
  pausePressed: boolean;
}
```

Three adapters:
- `KeyboardInput` — cursor + WASD, `isPositionDelta: false`, velocity-based
- `TouchInput` — floating joystick, `isPositionDelta: false`, velocity-based
- `RelativeTouchInput` — 1:1 finger tracking (Pew Pew style), `isPositionDelta: true`, position delta

All use DOM pointer events on the canvas (not Phaser's input system) for reliable touch in Phaser 4 RC. All emit `fireHeld: true` unconditionally (auto-fire). Touch adapters restrict activation to left half of canvas (`x < width / 2`).

**`isPositionDelta` branching in GameScene:** When true, `handleMovement()` applies moveVector as `player.x += delta` (clamped to world bounds). When false, applies as `body.setVelocity(vx, vy)`.

**`touchStyle` setting:** `'relative' | 'joystick'`, default `'relative'`. Selects which touch adapter instantiates. Separate from `controlScheme` (which selects keyboard vs touch).

Adapter lifecycle: `create(scene)` → `update(): InputIntent` → `clear()` → `destroy()`. Call `clear()` on every pause, blur, orientation change, and scene transition.

Activation: capability check at mount (`'ontouchstart' in window || navigator.maxTouchPoints > 0`), gated by `touchControlsEnabled`, overridden by `controlScheme: 'touch'`.

## Margin-Based Controls

On wide screens, the safe zone margins serve as touch control zones:
- **Left margin:** Movement input (RelativeTouchInput). Touch anywhere in the left half activates tracking.
- **Right margin:** GameOverlay buttons (pause, mute) positioned in top-right. On 4:3 where margins are zero, buttons fall back to canvas corner.

No DOM gutters — margins are inside the Phaser canvas. GameOverlay uses `pointer-events: none` on its container with `pointer-events: auto` on buttons only.

## Runtime Settings Transport

`GameHandle.updateSettings(partial)` writes to Phaser registry via `registry.set(key, value)`. Systems subscribe to `registry.events.on('changedata-<key>', callback)` in `create()`.

## Shell-Authoritative Pause

Shell owns all pause state. All triggers (visibility, orientation, overlay button) call `GameHandle.pause()` from Svelte. Game never self-pauses. GameScene listens for game-level `pause` event and calls `adapter.clear()`.

## HUD Scaling

Scale factor: `displayHeight / 600` (height is the fixed axis), clamped to `[0.6, 1.5]`.

Per-element pixel floors after clamping:
- Persistent HUD (score, lives, currency, wave indicator): `Math.max(scaled, 10)`
- Boss health bar label: `Math.max(scaled, 9)`
- Titles/banners: no floor needed
- Debug overlay: do not scale, repositions to `gameSize.width - 10` on resize

## Orientation Strategy

Three layers:
1. Manifest: `"orientation": "landscape"` (advisory for PWA installs)
2. Shell overlay: `RotateOverlay.svelte` shown when portrait AND touch device
3. Game pause: adapter cleared on portrait

No `screen.orientation.lock()`. iOS Safari doesn't support it.

## Boundary Rules

- `phaser-integrator` owns `packages/game/` — never touches `apps/web/` or `packages/ui/`
- `svelte-shell` owns `apps/web/` and `packages/ui/` — never imports Phaser types
- Schema changes go through `schema-validator` in `packages/contracts/`
- `touch-action: none` on game container (shell responsibility)
- No `user-scalable=no` in viewport meta
