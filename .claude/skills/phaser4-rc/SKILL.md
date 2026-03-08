---
name: phaser4-rc
description: Phaser 4 RC API patterns, known issues, and migration notes from Phaser 3. Load when working on any file in packages/game/.
---

## Phaser 4 RC — Working Notes

### Critical differences from Phaser 3
- Scene lifecycle: `init()` -> `preload()` -> `create()` -> `update(time, delta)`
  (same shape, but internal event order changed — always use `create()` for setup)
- Physics: Arcade Physics namespace moved — import from `phaser/physics/arcade`
- Input: pointer events use new unified input manager — check `this.input.on()` API
- Texture manager: `this.textures.addBase64()` is async in v4

### Pinning strategy
- `package.json` must use exact version: `"phaser": "4.0.0-rc.6"` (no caret, no tilde)
- Before any Phaser API call you're unsure about, grep `node_modules/phaser/types/` for the signature

### Mount/unmount contract
```typescript
export interface GameHandle {
  destroy(): void;
  pause(): void;
  resume(): void;
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

export interface GameMountOptions {
  width?: number;
  height?: number;
  pixelArt?: boolean;
  settings?: Record<string, unknown>;
}

export function mountGame(
  container: HTMLElement,
  options: GameMountOptions
): GameHandle;
```

### Known RC issues
- Hot-reload can leak WebGL contexts — always call `destroy()` in Svelte `onDestroy`
- Scene sleep/wake has edge cases with input manager — prefer stop/start
- Audio context may not resume after tab backgrounding — handle `visibilitychange`
- Check `node_modules/phaser/types/` for actual type signatures when in doubt

## Scale Manager Events (Mobile)

Phaser 4 RC Scale Manager emits events on resize and orientation change:

```typescript
// Subscribe in scene create()
this.scale.on('resize', (gameSize: Phaser.Structs.Size, baseSize: Phaser.Structs.Size, displaySize: Phaser.Structs.Size, previousWidth: number, previousHeight: number) => {
  // displaySize = physical pixel dimensions of the rendered canvas
  // gameSize = the world size (always 800x600 in this project)
  // Use displaySize for HUD scaling, touch input regions
});

this.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, (orientation: string) => {
  // orientation is 'landscape-primary', 'portrait-primary', etc.
  // Use to trigger pause + adapter clear on portrait
});
```

Display size accessors (read these, don't cache — they update on resize):
- `this.scale.displaySize.width` / `.height` — canvas display dimensions
- `this.scale.gameSize.width` / `.height` — world dimensions (800x600)
- `this.scale.getViewPort()` — returns Rectangle with canvas viewport in page coordinates

**Known RC behavior:** Scale Manager `resize` fires on window resize, fullscreen toggle, and orientation change. It may fire multiple times during a single orientation transition — debounce if doing expensive work.

## Registry Change Events

Phaser registry supports per-key change listeners (inherited from Phaser 3, present in RC):

```typescript
// Write (from GameHandle.updateSettings)
this.game.registry.set('audioVolumes', { master: 0.5, sfx: 0.8, music: 0.6 });

// Subscribe (in system create())
this.game.registry.events.on('changedata-audioVolumes', (parent: any, value: any, previousValue: any) => {
  // React to the change
  this.setVolumes(value);
});
```

The event name format is `changedata-<key>` where `<key>` is the exact string used in `registry.set()`. There is also a generic `changedata` event that fires for any key change.

**Caution:** Registry values are untyped (`any`). The subscribing system must validate or cast. Do not store complex objects with methods — use plain data (numbers, strings, simple objects).

## Pointer Events in Phaser 4 RC

Phaser 4 RC uses Pointer Events API internally when available (falls back to mouse/touch events on older browsers). Relevant for touch input:

- `this.input.on('pointerdown', callback)` — fires for all pointer types (mouse, touch, pen)
- `this.input.on('pointermove', callback)` — fires for active pointers
- `this.input.on('pointerup', callback)` — fires when pointer is released
- `this.input.on('pointercancel', callback)` — fires when pointer is cancelled (browser gesture intercept, tab switch). **Critical for mobile** — must clear touch adapter state on cancel.

Pointer object properties:
- `pointer.pointerId` — unique ID for multi-touch tracking
- `pointer.x`, `pointer.y` — position in world coordinates
- `pointer.isDown` — whether pointer is currently pressed
- `pointer.wasTouch` — whether this pointer originated from touch input

**Multi-touch:** Phaser creates a pointer object per active touch. Access via `this.input.pointer1`, `this.input.pointer2`, etc., or track by `pointerId` in event callbacks.

**Pointer capture:** To prevent a joystick from losing its pointer when another finger touches down, track the initial `pointerId` from `pointerdown` and only respond to `pointermove`/`pointerup` events matching that ID.
