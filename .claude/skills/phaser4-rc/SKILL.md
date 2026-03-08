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
