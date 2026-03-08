# Ship Game — Development Roadmap

**Current phase: Phase 7 — Drop System + Currency**

Phases are ordered by dependency and leverage. Each phase ships as one PR.

## Completed

### Stage 1 — Monorepo + Contracts + Content
Scaffolding, Zod 4 schemas, content JSON, asset pipeline.

### Stage 2 — Phaser Integration Seam
mountGame API, SSR safety, event bus, PreloadScene manifest loading.

### Stage 3 — Vertical Slice
Menu, GameScene, WaveManager, data-driven waves, game over/stage clear, AI sprites.

### Stage 4a — Game Systems (basic)
Data-driven weapon stats, enemy movement patterns, AudioManager, per-level backgrounds.

### Phase 4b — Enemy Attack Patterns + Combat Feedback
`EnemyAttackSystem`, `CombatFeedbackSchema`, data-driven feedback timing, enemy projectile groups.

### Phase 5 — Boss Framework
`BossManager`, Iron Sentinel fight, phase transitions, minion spawns, health bar, chain explosion death.

### Phase 5+ — Sprite Frame Support
`SpriteFrames` system: ship banking (3 frames), enemy idle animation (2-frame oscillation), boss phase frame switching via `spriteFrame` on `BossPhaseSchema`.

### Phase 6 — Object Pooling + Performance
`BulletPool` for player+enemy projectiles (30+60 pre-allocated), debug overlay (backtick toggle), `deathBurst` active-state guards, `releaseAll` on game-over/stage-clear.

---

## Phase 4b — Enemy Attack Patterns + Combat Feedback ✓

**Goal**: Enemies shoot back. Hits feel impactful.

### Enemy attacks ✓
- `EnemyAttackSystem` reads `attackType`, `fireInterval`, `projectileDamage` from content
- Attack patterns: `aimed-shot`, `spread-shot`, `contact-only`, `ram`
- Enemy projectile group + player-vs-enemy-bullet collision
- `fireInterval` respected from content data per enemy

### Combat feedback system ✓
- `CombatFeedbackSchema` in contracts: `hitFlashMs`, `hitPauseMs`, `screenShake`, `screenShakeMs`, `deathBurstMs`, `spawnInMs`
- White tint-on-hit for enemies (flash duration from data)
- Hit-stop: brief physics pause on kills (configurable ms)
- Screen shake: camera shake on player damage
- Enemy death burst: scale-up + fade-out (duration from data)
- Spawn-in: enemies scale+fade in with Back.easeOut curve

### Contracts changes ✓
- `CombatFeedbackSchema` added to `common/base.schema.ts`
- `combatFeedback` optional field on `EnemySchema`, `BossSchema`, and `WeaponLevelStatsSchema`
- Bruiser and Iron Sentinel boss have explicit feedback overrides in content

---

## Phase 5 — Boss Framework ✓

**Goal**: Iron Sentinel boss fight at end of Stage 1.

### Boss encounter system ✓
- `BossManager` system: phase transitions, health thresholds, attack rotation
- Boss intro sequence: warning banner, alarm SFX, boss entry animation
- Per-phase behavior: movement pattern, attack pattern, speed multiplier
- Minion spawns during boss phases (from `minionSpawns` in BossPhaseSchema)
- Boss death sequence: chain explosions, score burst, stage clear
- Boss health bar with color-coded fill (green→yellow→red)
- WaveManager fires `onBossEncounter` after all waves cleared
- Boss survives player contact (doesn't die on collision), excluded from offscreen cleanup

### Not yet implemented (future polish)
- Weak point system: damage multiplier on exposed core. Frame switching (`spriteFrame` on `BossPhaseSchema`) is already implemented — only the hitbox-check + multiplier logic remains.
- Music override: boss alarm stinger plays, but no crossfade to boss-specific music track
- `beam` attack type: exists in `AttackTypeSchema` but not yet handled in `EnemyAttack.ts` (silently falls through to no-op)

### Content already exists
- `bosses.json` has Iron Sentinel with 3 phases and combatFeedback overrides
- `boss-iron-sentinel` sprite has shields-up / core-exposed frames
- `sfx-boss-alarm` audio exists

---

## Phase 6 — Object Pooling + Performance

**Goal**: Stable frame rate as content grows.

### Pooling ✓
- Projectile pool (player bullets + enemy bullets) — `BulletPool` in `ObjectPool.ts`
- Pre-allocated: 30 player bullets, 40 enemy bullets, grows on demand
- `acquire/release` instead of `create/destroy` — zero GC pressure from projectiles
- Hit effect pool (sparks, flashes) — deferred: current effects reuse dying game object (no separate sprites yet)
- Death effect pool (explosions) — deferred: same reason, `deathBurst` animates the dying enemy directly
- Drop pickup pool (currency, tokens) — deferred to Phase 7 when drops exist

### Debug overlay ✓
- Toggle with backtick key
- Shows: FPS, player/enemy bullet pool stats, enemy count, active tweens
- Zero overhead when hidden

---

## Phase 7 — Drop System + Currency

**Goal**: Enemies drop things. Player accumulates currency.

### Drop logic
- `DropManager` reads `drops` array from enemy content data
- Currency drops: floating number sprites that drift toward player
- Pity timer: after N kills with no drop, increase chance
- Boss guaranteed drops
- Currency HUD counter
- Run-total tracking in GameScene state

### Contracts changes
- Add `pityBucketContribution` to `DropEntrySchema`
- Add `guaranteedDropOnDeath` boolean to `BossSchema`

---

## Phase 8 — Stage Presentation

**Goal**: Levels feel authored, not procedural.

### Stage intro card
- Brief title card: stage name + level name, fade in/out
- Music fade-in with level start

### Level transitions
- Background crossfade between levels
- Scroll speed from content data (`scrollSpeed`)
- Calm window before boss (no spawns, music shifts)

### Boss arena
- Darker background variant or tint overlay
- Reduced visual clutter during boss fight
- ~~Boss health bar at top of screen~~ ✓ (shipped in Phase 5)

---

## Phase 9 — Player Ship Visual State

**Goal**: Ship communicates state visually.

### Banking frames
- Ship sprite already has 3 frames: bank-left, neutral, bank-right
- Switch frame based on horizontal velocity direction
- Smooth transition (don't snap instantly)

### Engine intensity
- Brighter engine glow when moving or firing
- Dim when idle

### Weapon tier visuals
- Bullet color/size changes per weapon level
- Muzzle flash variant per weapon type

---

## Phase 10 — Audio Polish

**Goal**: Audio feels responsive, not repetitive.

### Variation system
- Pitch variation on SFX (random +/- 5%)
- Volume variation on repeated hits
- No-repeat cooldown for rapid-fire SFX (prevent stacking)

### Music system
- Fade in/out on scene transitions
- Boss music override with crossfade
- Low-health warning pulse (filter or volume duck)

### Bus structure
- Master, music, SFX volume buses
- Settings-driven volume control (reads from GameSettings)

---

## Phase 11 — Save/Load + Settings

**Goal**: Progress persists. Settings work.

### localStorage persistence
- `SaveManager` using `createNewSave()` / `migrateSave()` from contracts
- Auto-save after stage clear, manual save from menu
- Load on boot, create new save if none exists

### Settings UI
- Volume sliders (master, music, SFX)
- Control scheme toggle (WASD vs arrows)
- Screen shake intensity
- FPS counter toggle

### Routes
- `/settings` page in SvelteKit
- Settings changes emit through GameHandle to Phaser

---

## Phase 12 — Encounter Director

**Goal**: Spawning feels paced, not dumped.

### Director concepts
- Threat budget per wave: limits simultaneous danger
- Recovery windows: enforced breathing room after intense bursts
- Formation variety: mirrored pairs, circle entry, staggered lines
- Telegraph: warning indicator before strong attacks or fast enemies
- Entry side variation: top, sides, diagonal

### Content model additions
- `threatBudget` per wave
- `recoveryWindowMs` after wave clear
- `entrySide` per spawn entry
- `telegraphMs` per spawn entry

---

## Future (post-launch polish)

### Expanded weapon behavior
- Fire patterns: burst, charge, continuous
- Projectile behavior: homing, piercing, bouncing
- Impact effects: explosion radius, chain lightning
- Muzzle flash sprites, trail effects

### Difficulty shaping
- Per-encounter danger rating (not global scaling)
- Spatial pressure from formation design
- Attack overlap from enemy combination
- Fewer recovery windows in later levels

### Testing infrastructure
- Weapon DPS sanity tests
- Spawn schedule validity tests
- Drop probability simulation
- Boss phase transition tests
- Enemy movement bounds tests
