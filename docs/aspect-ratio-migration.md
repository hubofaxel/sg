# Aspect Ratio Migration — Foundation Plan

Replaces the fixed 4:3 world assumption with an adaptive aspect ratio system. This is foundational work — all five shipped mobile PRs remain valid but the scaling model changes underneath them.

**Status:** This work supersedes the "non-goal" statement in mobile-adaptation.md §1 ("No adaptive gameplay world per device class"). That decision was wrong for mobile. This plan corrects it.

---

## 1. The Problem

The game runs at a fixed 800×600 world (4:3 aspect ratio) with `Phaser.Scale.FIT`, which letterboxes to preserve aspect ratio. Modern phones in landscape are dramatically wider:

| Device | Landscape dims (CSS px) | Aspect ratio | Usable width at FIT 4:3 | Wasted |
|---|---|---|---|---|
| iPhone SE | 568×320 | 16:9 | 427px (75%) | 25% |
| iPhone 15 | 844×390 | ~19.5:9 | 520px (62%) | 38% |
| iPhone 17 Pro Max | 932×430 | ~19.5:9 | 573px (61%) | 39% |
| Pixel 10 | ~960×432 | ~20:9 | 576px (60%) | 40% |
| Galaxy S26 Ultra | ~968×439 | ~20:9 | 585px (60%) | 40% |
| iPad Air | 1366×1024 | 4:3 | 1366px (100%) | 0% |
| Desktop 1080p | 1920×1080 | 16:9 | 1440px (75%) | 25% |

On flagship phones, **40% of the screen is dead letterbox.** On a 6.3" display where every centimeter matters for thumb reach and visual clarity, this makes the game feel like a desktop port that doesn't understand the device.

---

## 2. Architecture: Safe Zone + Expand

### Core concept

Replace the fixed-world model with a **safe zone** model:

- **Safe zone**: 800×600 (4:3). The rectangle where all designed gameplay density lives. Enemy wave patterns, spawn positions, boss encounters, and difficulty tuning are authored against this rectangle. It is always fully visible on every device.
- **Expanded canvas**: The actual game world, which extends horizontally (and potentially vertically) beyond the safe zone to fill the device screen. The extra space shows more of the game environment (stars, nebula, distant elements) and gives the player more room to maneuver, but does not change gameplay density.
- **Camera viewport**: Equals the expanded canvas. The camera shows everything.

```
┌─────────────────────────────────────────────────────┐
│                  Expanded canvas                     │
│                 (fills device)                        │
│   ┌───────────────────────────────────┐              │
│   │                                   │              │
│   │         Safe zone 800×600         │              │
│   │     (gameplay density lives       │              │
│   │      here — spawns, waves,        │              │
│   │      boss patterns, tuning)       │              │
│   │                                   │              │
│   └───────────────────────────────────┘              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

On a 4:3 device (iPad), the expanded canvas equals the safe zone — no extra space, no behavior change. On a 20:9 phone, the canvas is wider, the player has more horizontal room, and the starfield extends to fill the screen. Gameplay is identical because spawning and difficulty are anchored to the safe zone.

### Scale mode

Switch from `Phaser.Scale.FIT` to `Phaser.Scale.FIT` with a **dynamic world size** computed at startup and on resize. The approach:

1. Measure the parent container's aspect ratio
2. Compute world dimensions that fill the container while keeping height at 600 minimum:
   - If container is wider than 4:3: `worldWidth = 600 * containerAspect`, `worldHeight = 600`
   - If container is taller than 4:3: `worldWidth = 800`, `worldHeight = 800 / containerAspect`
   - Clamp to prevent extreme aspect ratios: min width 800, max width 1200 (configurable)
3. Call `game.scale.setGameSize(worldWidth, worldHeight)` — this changes the world, which is now intentional
4. FIT mode then scales this variably-sized world into the container with zero letterbox (or near-zero, depending on clamp)

**Why not EXPAND or RESIZE mode?** `EXPAND` in Phaser 4 RC changes the canvas size but can have inconsistent behavior with physics bounds and camera management. Computing the world size explicitly and using `setGameSize()` with FIT gives deterministic control over exactly what the world dimensions are, and all systems can query `this.scale.gameSize` to get the authoritative values.

### Why height is fixed, width varies

Ship Game is a vertical-scrolling shooter. The vertical axis is the primary gameplay axis — enemies come from the top, the player is at the bottom, projectiles travel vertically. Fixing height at 600 preserves:
- Vertical timing (how long enemies are on screen)
- Vertical difficulty (reaction time from spawn to reaching the player)
- Boss encounter pacing (approach speed, pattern timing)

Width is secondary. Wider screens mean more horizontal dodge room, which slightly reduces difficulty on phones — an acceptable tradeoff since phones also have less precise input (touch vs keyboard). The safe zone ensures wave patterns maintain their designed density regardless.

### Aspect ratio clamp

Allow the world to adapt, but not infinitely. Define supported range:

```typescript
const MIN_WORLD_WIDTH = 800;   // 4:3 — iPad, square-ish
const MAX_WORLD_WIDTH = 1200;  // 2:1 — ultra-wide phone cap
const WORLD_HEIGHT = 600;      // fixed
```

A 20:9 phone at landscape would want `600 * (20/9) = 1333px` width. Clamping to 1200 means the most extreme phones get a small amount of letterbox on the sides (~10% vs 40% today). This is a design choice — 1200 can be widened if testing shows it's fine.

The safe zone is always centered in the world, regardless of world width.

---

## 3. System-by-System Migration

Every system in `packages/game/` that references world dimensions must be audited. The migration rule is simple: **does this system care about where the screen edges are, or where the gameplay area is?**

- **Screen edge** → use `this.scale.gameSize.width` / `.height` (the expanded canvas)
- **Gameplay area** → use the safe zone rect

### Safe Zone Contract

Define as a first-class game concept:

```typescript
// packages/game/src/systems/SafeZone.ts

export interface SafeZone {
  readonly x: number;      // left edge in world coords
  readonly y: number;      // top edge in world coords
  readonly width: number;  // always 800
  readonly height: number; // always 600
  readonly centerX: number;
  readonly centerY: number;
  readonly right: number;  // x + width
  readonly bottom: number; // y + height
}

export function createSafeZone(worldWidth: number, worldHeight: number): SafeZone {
  const x = (worldWidth - 800) / 2;
  const y = (worldHeight - 600) / 2;
  return {
    x, y,
    width: 800, height: 600,
    centerX: x + 400,
    centerY: y + 300,
    right: x + 800,
    bottom: y + 600,
  };
}
```

Store in the Phaser registry at startup and update on resize. All systems read it from the registry.

### System audit and migration map

| System | Current assumption | Migration | References |
|---|---|---|---|
| **mountGame.ts** | Fixed `width: 800, height: 600` | Compute dynamic world size from container. Call `setGameSize()`. Store safe zone in registry. Recompute on resize. | Config, registry |
| **GameScene.ts** | `this.scale.width` = 800 for movement bounds | Player bounds: safe zone (or expanded canvas — design choice, see §4). Read safe zone from registry. | Player clamping |
| **WaveManager / EnemySpawner** | Spawn x-positions based on 800px width | Spawn within safe zone x-range. Enemies that spawn at "random x across the top" use `safeZone.x` to `safeZone.right`, not `0` to `worldWidth`. | Spawn bounds |
| **DropManager** | Pickup boundaries based on world size | Pickups despawn at expanded canvas edges (not safe zone — let them float into the margins). Magnetism radius unchanged (world coordinates). | Cleanup bounds |
| **HudManager** | Already migrated in PR-4 to use display size for scaling | HUD anchoring must use **camera/viewport edges**, not safe zone. Score in top-left of screen, not top-left of safe zone. PR-4's `displaySize` references remain correct — but verify `gameSize` references are updated to the new dynamic values. | Positioning |
| **BossManager** | Boss health bar and warning text centered on `width/2` | Center on `worldWidth/2` (which equals `safeZone.centerX` since safe zone is centered). Boss movement patterns should reference safe zone bounds. | Positioning, patterns |
| **CombatFeedback** | Screen shake references camera | Camera shake is unaffected — camera covers the full expanded canvas. No change needed. | — |
| **Background / Starfield** | Likely fills 800×600 | Must fill the expanded canvas. If using a tiled sprite, set it to `worldWidth × worldHeight`. If using a static image, tile or stretch to fill. | Visual fill |
| **Projectiles** | Off-screen cleanup probably checks against world bounds | Cleanup should use expanded canvas bounds (destroy when off any edge of the visible area). If currently checking against 800/600 constants, update to `gameSize`. | Cleanup |
| **CollisionManager** | Physics bounds may be set to 800×600 | Physics world bounds must match expanded canvas: `this.physics.world.setBounds(0, 0, worldWidth, worldHeight)`. | Physics |
| **DebugOverlay** | Position at `(width-10, 10)` | Use `gameSize.width - 10` for right-aligned positioning. | Positioning |
| **TouchInput** | Joystick on "left half" — currently `x < 400` | Left half should be `x < gameSize.width / 2`, not `x < 400`. The expanded canvas is wider. | Input zones |
| **MenuScene** | Title and button positioning | Center on `gameSize.width / 2`, `gameSize.height / 2`. If using percentage-based positioning already, verify percentages reference the right dimensions. | Positioning |

### Systems that need NO change

- **InputIntent / KeyboardInput** — keyboard adapters emit normalized vectors, no world size reference
- **AudioManager** — audio has no spatial component
- **Content data** (packages/content) — enemy stats, weapon tables, wave definitions are authored in abstract units, not pixel positions (verify this)
- **Schemas** (packages/contracts) — no world size assumptions in schemas

---

## 4. Design Decisions

These must be resolved in the plan, not left open for agents to guess.

### Player movement bounds

**Decision: Player moves within the expanded canvas, not the safe zone.**

On a wide phone, the player should be able to use the extra horizontal space. Restricting them to the safe zone rectangle while the screen shows more space would feel like an invisible wall. The player can move to any visible edge of the screen.

Player clamping: `0 + margin` to `gameSize.width - margin` horizontally, `0 + margin` to `gameSize.height - margin` vertically. The margin prevents the sprite from being partially off-screen.

### Enemy spawning bounds

**Decision: Enemies spawn within the safe zone x-range.**

This preserves designed wave density. On a wide screen, the extra space on the sides has no enemies spawning in it — the player is safer in the margins. This is an acceptable asymmetry: the player gets more dodge room, but the threat corridor stays the same width.

If content authors later want to design wide-format waves, they can use a spawn region property per wave definition. But the default is safe zone.

### Projectile cleanup bounds

**Decision: Cleanup at expanded canvas edges.**

Player projectiles that fly past the top of the expanded canvas are destroyed. Enemy projectiles that fly past the bottom (or sides) of the expanded canvas are destroyed. Using safe zone bounds for cleanup would cause visible projectile pop-in at the margins.

### HUD anchoring

**Decision: HUD elements anchor to screen edges (gameSize), not safe zone.**

Score in the top-left of the screen. Wave indicator centered at `gameSize.width / 2`. Game-over text centered at `gameSize.width / 2, gameSize.height * 0.35`. The HUD uses the full screen because that's what the player sees.

PR-4's scaling work (clamped factor, pixel floors) remains valid — the factor formula changes slightly because the reference is now the dynamic world size, but the scaling concept is identical.

**Revised scale factor for HUD:**

```typescript
// Old (fixed world):
const factor = Math.min(displayWidth / 800, displayHeight / 600);

// New (dynamic world):
// The scale factor represents how much the display has shrunk/expanded
// relative to the design reference. Since worldHeight is always 600,
// and FIT mode means display matches world aspect ratio,
// the factor simplifies to:
const factor = displayHeight / 600;
// (displayWidth / worldWidth would give the same value under FIT)
```

Clamp and pixel floors remain: `Math.max(0.6, Math.min(factor, 1.5))`, 10px HUD floor, 9px boss label floor.

### Background fill

**Decision: Background must fill the entire expanded canvas with no visible seams or edges.**

If the current background is a static 800×600 image, it needs to be replaced with a tileable pattern or procedural generation (star particles, gradient layers). For a space shooter, a procedural starfield (Phaser particles or scattered sprites) naturally extends to any size.

---

## 5. Resize Behavior

When the window resizes (browser resize, orientation change, entering/exiting fullscreen):

1. Recompute world size from new container aspect ratio
2. Call `game.scale.setGameSize(newWidth, newHeight)`
3. Recompute and store new safe zone in registry
4. Update physics world bounds
5. Systems subscribed to registry `changedata-safeZone` reposition themselves
6. FIT mode rescales the new world into the new container — near-zero letterbox

This fires on every resize. The safe zone position changes (it's always centered), but its size never changes (always 800×600). Systems that reference safe zone bounds via the registry automatically get the updated values.

**Debounce consideration:** `setGameSize()` is not free — it may trigger internal Phaser reallocation. If resize events fire rapidly (window drag), debounce to ~100ms. Phaser's Scale Manager already batches resize events to some extent, but verify in RC.

---

## 6. Content Data Compatibility

Verify that content data in `packages/content/` uses abstract units, not pixel positions:

- **Wave definitions**: Do spawn positions use absolute x-coordinates? If a wave says "spawn enemy at x=200", that's a safe-zone-relative coordinate. The spawning system must offset by `safeZone.x`.
- **Boss patterns**: Do movement waypoints use absolute coordinates? Same offset rule.
- **Weapon data**: Projectile speeds, spread angles — these are velocity-based and aspect-ratio-independent. No change expected.

If content uses normalized coordinates (0.0-1.0 as fraction of width), the spawning system maps them to safe zone dimensions. If content uses absolute pixel values, the spawning system offsets by safe zone origin.

**The content package itself should not change.** The interpretation layer (game systems that read content) applies the safe zone mapping.

---

## 7. Implementation Sequence

This is a single PR touching `packages/game/` almost exclusively. It's `phaser-integrator` domain with one minor touch to `mountGame.ts` (which is the package's public entry point).

### Task ordering

```
1. SafeZone type + factory function (pure, testable)
   ↓
2. mountGame.ts: dynamic world sizing + safe zone registry
   ↓
3. GameScene.ts: player bounds → gameSize, read safe zone
   ↓
4. Spawning systems: spawn bounds → safe zone
   ↓
5. HUD/Boss: anchoring → gameSize
   ↓
6. Background: fill expanded canvas
   ↓
7. Projectile cleanup + physics bounds → gameSize
   ↓
8. TouchInput: joystick zones → gameSize
   ↓
9. Resize handler: recompute world + safe zone on container change
   ↓
10. Tests
```

Steps 3-8 are independent of each other (they read from the same safe zone / gameSize source but don't depend on each other's changes). They can be done in any order after steps 1-2.

### PR structure

**Single PR: `feat/adaptive-aspect-ratio`**

This is foundational — it changes how the game world is sized. It should be one atomic PR, not split across multiple, because every system must be consistent about which coordinate space it uses. A half-migrated state (some systems using 800 hardcoded, others using gameSize) would produce visible bugs.

Commit sequence:
1. `feat(game): add SafeZone type and factory`
2. `feat(game): implement dynamic world sizing in mountGame`
3. `refactor(game): migrate player bounds to expanded canvas`
4. `refactor(game): migrate spawn systems to safe zone coordinates`
5. `refactor(game): migrate HUD and boss anchoring to gameSize`
6. `refactor(game): extend background to fill expanded canvas`
7. `refactor(game): migrate projectile cleanup and physics bounds to gameSize`
8. `refactor(game): migrate touch input zones to gameSize`
9. `feat(game): add resize handler for dynamic world recomputation`
10. `test(game): add safe zone and aspect ratio tests`

### What about the shell?

The shell (`apps/web/`) requires minimal changes:

- The game container in `play/+page.svelte` already fills the viewport with `100dvw/100dvh` and safe area padding (PR-1). No change needed — Phaser reads the container size and computes world dimensions from it.
- `mountGame()` API does not change — it still takes an element and options. The dynamic sizing is internal to the game package.
- If `GameMountOptions` needs a new field (e.g., `aspectRatioClamp: { minWidth, maxWidth }`), add it as optional with defaults matching the constants.

### HUD scaling PR-4 interaction

PR-4's clamped HUD scaling is still correct in concept but the formula input changes. The scale factor should use `displayHeight / WORLD_HEIGHT` (which is always 600) since height is the fixed axis. The clamped factor, pixel floors, and all test values from the five-device table remain valid because the height relationship is unchanged.

Verify: PR-4's `HudManager` computes the factor from `displayHeight / REF_HEIGHT` (600). If it uses `displayWidth / REF_WIDTH` (800) as part of the `Math.min`, that term needs to change to `displayWidth / gameSize.width` (the dynamic width). The `Math.min` still works — it just uses the actual world width instead of a hardcoded 800.

---

## 8. Testing Strategy

### Unit tests

- `SafeZone` factory: given world (1000, 600), safe zone at (100, 0, 800, 600). Given world (800, 600), safe zone at (0, 0, 800, 600) — no offset on 4:3.
- World size computation: given container 20:9, world width = clamp(600 * 20/9, 800, 1200) = 1200. Given container 4:3, world width = 800. Given container 1:1, world height = 800 (or however you handle taller-than-wide).
- HUD scale factor: verify factor uses dynamic world size, not hardcoded 800.

### Integration tests

- Mount game in a wide container (simulated 20:9): verify physics bounds match expanded world, verify safe zone is centered, verify player can move beyond safe zone x-range.
- Mount game in a 4:3 container: verify behavior identical to pre-migration (safe zone = world = 800×600).

### Desktop parity (manual)

**Critical:** At 800×600 window (or similar 4:3 viewport), the game must look and play identically to pre-migration. The safe zone equals the world, no offsets, no behavior change. This is the regression gate.

### Wide-screen verification (manual)

At a 16:9 or wider viewport: the game fills the screen (no or minimal letterbox), the starfield extends to the edges, the player can move into the margins, enemies spawn in the center corridor, HUD is at screen edges.

---

## 9. Acceptance Criteria

- [ ] Game fills the screen on 20:9 phone viewports with no (or <5%) letterboxing
- [ ] Game fills the screen on 16:9 desktop viewports with no letterboxing
- [ ] Game is visually identical at 4:3 (iPad, square-ish monitor) — safe zone equals world
- [ ] Player can move to all visible screen edges on wide screens
- [ ] Enemies spawn within the safe zone x-range regardless of screen width
- [ ] HUD elements anchor to screen edges, not safe zone edges
- [ ] Background fills the entire expanded canvas — no visible safe zone boundary
- [ ] Projectiles are cleaned up at expanded canvas edges, not safe zone edges
- [ ] Physics world bounds match expanded canvas
- [ ] Touch joystick "left half" uses gameSize.width / 2, not 400
- [ ] Window resize recomputes world size, safe zone, and physics bounds
- [ ] Orientation change recomputes correctly (landscape → portrait → landscape)
- [ ] HUD scaling from PR-4 still works correctly with dynamic world size
- [ ] All existing unit tests pass (no regressions)
- [ ] All existing e2e tests pass
- [ ] `pnpm validate` passes

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Content data has hardcoded pixel positions | Medium | Enemies spawn in wrong locations | Audit content JSON before coding. If positions are absolute, offset by safe zone origin in spawning system. |
| Phaser 4 RC setGameSize() has edge cases | Low-Medium | Visual glitches on resize | Test resize paths thoroughly. If setGameSize() is unstable, fall back to RESIZE scale mode with manual camera management. |
| Background doesn't tile cleanly | Low | Visual seam at safe zone boundary | Use procedural starfield (particles) instead of static image. |
| HUD scale factor formula silently breaks | Medium | Text too large or too small on wide screens | Unit test the factor computation with the new formula at all five reference devices. |
| Player having more room on wide screens reduces difficulty | Intended | — | This is a deliberate tradeoff. Wide-screen players get more dodge room. If it's too easy, future wave designs can use the full canvas width. |

---

## 11. Sequencing Relative to Existing Work

This migration should be done as a **Phase B addendum** — PR-7 (or renumber as appropriate). It does not invalidate any shipped PR, but it does require small adjustments to PR-4's HUD scaling formula and PR-2's TouchInput zone calculations.

**Dependency: this PR must merge before Phase C (PWA polish).** Phase C includes performance profiling on real devices — profiling should happen against the final world-sizing model, not the deprecated 4:3 letterbox model.

**No schema changes needed.** No `packages/contracts/` changes. No `packages/content/` changes (content is interpreted, not modified). Purely `packages/game/` with one optional `GameMountOptions` field.

The orchestration directive's task prompt template and agent boundaries apply unchanged. This is `phaser-integrator` work with `test-runner` follow-up.
