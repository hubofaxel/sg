# packages/game — Phaser 4 runtime

- This package is the ONLY place Phaser is imported
- Export surface: `mountGame`, `GameHandle`, scene enum, event types
- Scenes: BootScene -> PreloadScene -> MenuScene -> GameScene
- Fixed-step game loop — do not use variable-step
- All assets referenced by key from a central manifest, not inline paths
- Pin phaser at exact RC version in package.json — caret/tilde forbidden
- Game events communicate to the Svelte shell via the GameHandle event emitter
- Clean destroy behavior required: no orphaned listeners, textures, or timers

## Asset manifest loading

- PreloadScene fetches `/assets/asset-manifest.json` at boot
- Manifest is validated against `AssetManifestSchema` from `@sg/contracts`
- Each manifest entry drives a Phaser loader call:
  - `sprite-sheet` → `this.load.spritesheet(key, path, frameConfig)`
  - `image` → `this.load.image(key, path)`
  - `audio` → `this.load.audio(key, paths)`
- Asset keys in game code must match content data keys exactly
- No hardcoded file paths in scene code — always look up from manifest

## Game systems (`src/systems/`)

ECS-style systems called from GameScene each frame. All read data from game
objects via `getData()` — values set by WaveManager from `@sg/content` definitions.

| System | File | Purpose |
|---|---|---|
| EnemyMovement | `EnemyMovement.ts` | Per-frame movement: linear, sine-wave, zigzag, spiral, strafe-hover |
| EnemyAttack | `EnemyAttack.ts` | Enemy ranged attacks: aimed-shot, spread-shot (reads attackType, fireInterval, projectileDamage) |
| CombatFeedback | `CombatFeedback.ts` | Visual juice: hit flash, hit-stop, screen shake, death burst, spawn-in animation |
| AudioManager | `AudioManager.ts` | SFX + music playback with graceful fallback for missing audio keys |
| WaveManager | `WaveManager.ts` | Drives spawning from campaign data; sets all enemy data keys on spawn |

### Data flow: content → game object → system

1. `WaveManager.spawnSingleEnemy()` reads enemy definition from `@sg/content`
2. Sets data keys on the Phaser game object: `health`, `speed`, `movementPattern`, `attackType`, `fireInterval`, `projectileDamage`, `combatFeedback`, etc.
3. Systems read these keys each frame via `enemy.getData('key')`
4. `CombatFeedback` falls back to `CombatFeedbackSchema` defaults when data is absent

### Collision groups

- `bullets` — player projectiles (cyan rectangles)
- `enemyBullets` — enemy projectiles (red rectangles)
- `enemies` — active enemy game objects
- Overlaps: bullets↔enemies, player↔enemies, player↔enemyBullets
