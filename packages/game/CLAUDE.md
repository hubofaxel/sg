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
| BulletPool | `ObjectPool.ts` | Recycles Rectangle projectiles instead of create/destroy (player + enemy pools) |
| DebugOverlay | `DebugOverlay.ts` | Backtick-toggled HUD: FPS, pool stats, enemy count, tween count |
| HudManager | `HudManager.ts` | Score/lives/credits/wave text, wave banners, game-over and stage-clear screens |
| WaveManager | `WaveManager.ts` | Drives spawning from campaign data; sets all enemy data keys on spawn; multi-stage support via `stageIndex` |
| BossManager | `BossManager.ts` | Boss encounter lifecycle: intro → phases → minions → death sequence |
| EnemyMovement | `EnemyMovement.ts` | Per-frame movement: linear, sine-wave, zigzag, spiral, strafe-hover |
| EnemyAttack | `EnemyAttack.ts` | Enemy ranged attacks: aimed-shot, spread-shot (reads attackType, fireInterval, projectileDamage). `beam` is in schema but not yet implemented. |
| CombatFeedback | `CombatFeedback.ts` | Visual juice: hit flash, hit-stop, screen shake, death burst, spawn-in animation |
| SpriteFrames | `SpriteFrames.ts` | Ship banking (3 frames by velocity), enemy idle animation (2-frame oscillation), boss phase frame switching |
| AudioManager | `AudioManager.ts` | SFX + music playback with graceful fallback for missing audio keys |
| DropManager | `DropManager.ts` | Drop spawning from enemy data, pity timer, magnetism, code-drawn pickups (currency/token/recipe), `sfx-pickup` on collect |

### Data flow: content → game object → system

1. `WaveManager.spawnSingleEnemy()` reads enemy definition from `@sg/content`
2. Sets data keys on the Phaser game object: `health`, `speed`, `movementPattern`, `attackType`, `fireInterval`, `projectileDamage`, `combatFeedback`, etc.
3. Systems read these keys each frame via `enemy.getData('key')`
4. `CombatFeedback` falls back to `CombatFeedbackSchema` defaults when data is absent
5. Boss game objects also get `isBoss: true` and `maxHealth` data keys
6. `SpriteFrames` reads sprite textures to animate enemies (2-frame oscillation) and reads velocity to set ship banking frame
7. `BossManager.applyPhaseData()` calls `applyBossPhaseFrame()` using `spriteFrame` from `BossPhaseSchema` content data

### Boss encounter flow

1. WaveManager clears all waves → fires `onBossEncounter(bossId)`
2. GameScene creates BossManager → `start()`
3. Warning banner + `sfx-boss-alarm` → boss entry tween to anchor position
4. Phases transition by health threshold (data-driven from `BossPhaseSchema`)
5. Each phase updates: movement pattern, attack type, speed multiplier, minion spawns, sprite frame (via `spriteFrame` on `BossPhaseSchema`)
6. Minions respect `maxConcurrent` cap per spawn definition
7. Boss death: chain explosions → `deathBurst` → minion cleanup → stage clear
8. Health bar renders at screen top with color-coded fill (green→yellow→red)

### Stage progression flow

1. GameScene.init() receives `{ stageIndex }` data (default 0)
2. WaveManager loads `campaign.stages[stageIndex]`
3. All waves clear → boss encounter → boss defeat → `handleStageClear()`
4. Stage clear: plays `sfx-stage-clear`, awards `clearReward` currency, emits `stage-clear` event
5. If `hasNextStage`: HUD shows "NEXT STAGE" → `startNextStage()` restarts GameScene with `stageIndex + 1`
6. If final stage: HUD shows "CONTINUE" → returns to menu
7. Score and lives reset between stages (fresh start per stage)

### Object pooling

Bullet pools eliminate per-frame allocation/GC pressure from rapid-fire projectiles.

- `playerBulletPool` — pre-creates 30 cyan rectangles, grows on demand
- `enemyBulletPool` — pre-creates 60 red rectangles, grows on demand
- `acquire(x, y, vx, vy)` resets to canonical state: position, velocity, alpha=1, scale=1, rotation=0, body enabled
- `release(bullet)` resets to canonical inactive state: invisible, body disabled, zero velocity/acceleration, neutral transform, stale data cleared, parked at (-200,-200)
- Release is idempotent — double-release logs warning but does not corrupt
- Pool tracks: high-water mark, growth events (acquire misses that forced new allocation)
- Collision overlaps use `pool.physicsGroup` — Phaser skips disabled bodies automatically
- All iteration over pooled groups must check `if (!obj.active) continue`
- `deathBurst()` sets `target.setActive(false)` immediately — systems skip dying enemies during animation
- Collision callbacks guard with `if (!bullet.active) return` to prevent double-release in same physics step
- `releaseAll()` called on game-over and stage-clear to flush in-flight bullets
- Pools and debug overlay destroyed on scene exit via `returnToMenu()`
- Enemies are NOT pooled (low spawn frequency, varied textures/sizes)
- Future: if bullet visuals need animation, migrate from Rectangle to Arcade.Image (Phaser docs warn about geometry in physics groups)
- DropManager uses its own pickup pool (code-drawn rectangles, separate from BulletPool)

### Debug overlay

Toggle with backtick key. Samples at ~4Hz when visible (not every frame). Shows: FPS + frame time, pool stats (active/created, high-water mark, growth events), enemy count, active tweens. When hidden, `update()` is a single boolean check.

### Collision groups

- `playerBulletPool.physicsGroup` — player projectiles (cyan rectangles, pooled)
- `enemyBulletPool.physicsGroup` — enemy projectiles (red rectangles, pooled)
- `enemies` — active enemy game objects (regular enemies + boss + minions)
- Overlaps: playerBullets↔enemies, player↔enemies, player↔enemyBullets, player↔dropPickups
- Boss-specific: survives player contact (player takes damage, boss stays), excluded from offscreen cleanup
