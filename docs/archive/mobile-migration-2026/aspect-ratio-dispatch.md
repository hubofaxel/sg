# Aspect Ratio Migration — Dispatch Directive

**Status: EXECUTED. All tasks completed and shipped as PR-7, merged to main.**

Addendum to `MOBILE-ORCHESTRATION-DIRECTIVE.md`. Inserts PR-7 into the sequence between PR-5 (Phase B complete) and PR-6 (Phase C). All orchestration rules, verification protocols, and agent boundaries from the original directive apply.

---

## Sequencing

```
PR-1 ✅  Shell foundation
PR-2 ✅  Input intent
PR-3 ✅  Settings bridge
PR-4 ✅  HUD scaling
PR-5     Overlay + responsive CSS      ← in progress or next
PR-7     Aspect ratio migration         ← this document
PR-6     Phase C: PWA polish            ← deferred, profiles against final world model
```

PR-7 ships after PR-5 and before Phase C. Phase B signoff is amended: Phase B is not complete until the game fills the screen on wide devices.

---

## Pre-Implementation: Content Audit

Before dispatching the coding tasks, dispatch a **read-only audit** to determine how content data references positions. This determines whether the spawning migration is trivial (offset by safe zone origin) or requires content-layer interpretation changes.

```markdown
## Task: Audit content data for hardcoded position assumptions

**Agent:** diagnostician
**Branch:** main (read-only)
**Depends on:** None

### Investigation

1. In `packages/content/`, inspect wave definitions, enemy spawn data, and boss
   pattern data. Do spawn positions use:
   - Absolute pixel x-coordinates (e.g., `"x": 200`)? → Needs safe zone offset
   - Normalized 0-1 fractions (e.g., `"x": 0.25`)? → Maps to safe zone width
   - Named positions (e.g., `"position": "center"`)? → Interpretation layer handles it
   - No x-position (randomized by the spawning system)? → System uses safe zone bounds

2. In `packages/game/`, find every place spawn positions are read from content data
   and mapped to world coordinates. List file, line, and the mapping logic.

3. In `packages/game/`, grep for hardcoded `800` and `600` references. List every
   occurrence with file, line, and what it represents (world width, world height,
   reference constant, or something else).

4. In `packages/game/`, check how the background/starfield is rendered. Is it:
   - A static image sized to 800×600?
   - A tiled sprite?
   - Procedural particles?
   - Something else?

5. Check `packages/game/src/types.ts` — does `GameMountOptions` already have any
   aspect ratio or sizing configuration, or is it purely the settings subset?

### Done signal

Report:
- Content position format (absolute / normalized / named / randomized)
- Spawn mapping code locations (file:line for each)
- All hardcoded 800/600 references (file:line:purpose)
- Background implementation type
- GameMountOptions current shape
```

**Gate:** Do not dispatch coding tasks until this audit is complete. The audit results determine whether Tasks 7.3 and 7.5 need content interpretation changes or just coordinate offsets.

---

## Task Decomposition

### Task 7.1 — SafeZone Type and World Sizing

```markdown
## Task: SafeZone contract and dynamic world sizing

**Agent:** phaser-integrator
**Branch:** feat/adaptive-aspect-ratio (create from main after PR-5 merge)
**PR:** PR-7
**Depends on:** PR-5 merged, content audit complete

### Context

The game's fixed 800×600 world wastes 40% of the screen on modern phones.
This PR introduces adaptive world sizing: the world width varies to match
the device's aspect ratio while height stays fixed at 600. A "safe zone"
(800×600, centered) defines where designed gameplay density lives.

Read the full plan in `ASPECT-RATIO-MIGRATION.md` before starting.

### Skills to load

Load `.claude/skills/mobile-adaptation/SKILL.md`
Load `.claude/skills/phaser4-rc/SKILL.md` — Scale Manager, setGameSize()

### Files to touch

Create:
- `packages/game/src/systems/SafeZone.ts`:
  - Export `SafeZone` interface (x, y, width, height, centerX, centerY, right, bottom)
  - Export `createSafeZone(worldWidth, worldHeight): SafeZone` factory
  - Export world size computation function:
    ```typescript
    export function computeWorldSize(
      containerWidth: number,
      containerHeight: number,
      minWidth = 800,
      maxWidth = 1200,
      baseHeight = 600
    ): { width: number; height: number } {
      const containerAspect = containerWidth / containerHeight;
      const rawWidth = baseHeight * containerAspect;
      const width = Math.max(minWidth, Math.min(Math.round(rawWidth), maxWidth));
      return { width, height: baseHeight };
    }
    ```
  - These are pure functions with no Phaser dependency — fully unit testable

Modify:
- `packages/game/src/mountGame.ts`:
  - At mount time, measure parent container dimensions
  - Call `computeWorldSize()` to get initial world dimensions
  - Pass computed dimensions as `width` and `height` in the Phaser config
    (replacing hardcoded 800/600)
  - Keep `Phaser.Scale.FIT` and `Phaser.Scale.CENTER_BOTH`
  - Compute initial safe zone via `createSafeZone()` and store in registry:
    `game.registry.set('safeZone', safeZone)`
  - Store world dimensions: `game.registry.set('worldWidth', width)`,
    `game.registry.set('worldHeight', height)`
  - Subscribe to Scale Manager resize: on resize, recompute world size from
    new parent dimensions, call `game.scale.setGameSize(newWidth, newHeight)`,
    recompute safe zone, update registry values. Debounce at ~100ms if
    setGameSize() is expensive.

- `packages/game/src/types.ts`:
  - Add optional `aspectRatio?: { minWidth?: number; maxWidth?: number }` to
    `GameMountOptions` for configurability. Defaults to `{ minWidth: 800, maxWidth: 1200 }`.

### Constants

```typescript
const MIN_WORLD_WIDTH = 800;   // 4:3 — no narrower than the safe zone
const MAX_WORLD_WIDTH = 1200;  // ~2:1 — cap for ultra-wide
const WORLD_HEIGHT = 600;      // fixed — vertical axis is primary
const SAFE_ZONE_WIDTH = 800;
const SAFE_ZONE_HEIGHT = 600;
```

### Constraints

- `packages/game/` only
- SafeZone.ts must have zero Phaser imports — pure TypeScript, fully testable
- Do not modify any gameplay systems yet — that's Tasks 7.2-7.6
- The existing 800/600 default path must still work: if container is exactly 4:3,
  world is 800×600 and safe zone origin is (0,0). Zero behavior change at 4:3.
- `setGameSize()` is now intentional and correct. The old plan said "never call
  setGameSize()" — that constraint is lifted by this migration.

### Acceptance criteria

- [ ] `computeWorldSize(960, 432)` returns width ~1333, clamped to 1200
- [ ] `computeWorldSize(1024, 768)` returns width 800 (4:3 → min width)
- [ ] `computeWorldSize(1920, 1080)` returns width 1067 (16:9)
- [ ] `createSafeZone(1200, 600)` returns x=200, y=0, width=800, height=600
- [ ] `createSafeZone(800, 600)` returns x=0, y=0 (no offset at 4:3)
- [ ] Game launches with dynamic world size in dev server
- [ ] Registry contains `safeZone`, `worldWidth`, `worldHeight` after mount
- [ ] Window resize updates registry values
- [ ] `pnpm validate` passes

### Done signal

Report: files changed, the exact SafeZone interface, the world size computation
function signature, which registry keys are set, whether setGameSize() on resize
was stable or needed workarounds, any Phaser 4 RC surprises.
```

### Task 7.2 — Player Bounds and Physics Migration

```markdown
## Task: Migrate player bounds and physics world to expanded canvas

**Agent:** phaser-integrator
**Branch:** feat/adaptive-aspect-ratio
**PR:** PR-7
**Depends on:** Task 7.1 complete

### Files to touch

Modify:
- `packages/game/src/scenes/GameScene.ts`:
  - Player movement clamping: replace any hardcoded 800/600 bounds with
    `gameSize.width` / `gameSize.height` (read from `this.scale.gameSize` or
    registry). Player moves within the full expanded canvas, not the safe zone.
  - Physics world bounds: `this.physics.world.setBounds(0, 0, worldWidth, worldHeight)`
    — must match expanded canvas, not 800×600.
  - On registry change (`changedata-worldWidth`, `changedata-worldHeight`):
    update physics bounds and player clamp limits.

### Design decision (pre-resolved)

Player moves within the expanded canvas. The player can reach all visible screen
edges. This gives wide-screen players more dodge room, which is an acceptable
tradeoff — phones have less precise input (touch vs keyboard).

### Acceptance criteria

- [ ] Player can move to all visible edges on a wide viewport
- [ ] Player is correctly bounded on a 4:3 viewport (same as before)
- [ ] Physics world bounds match expanded canvas (no invisible walls)
- [ ] Resize updates physics bounds
- [ ] `pnpm validate` passes
```

### Task 7.3 — Spawning Systems Migration

```markdown
## Task: Migrate enemy spawning to safe zone coordinates

**Agent:** phaser-integrator
**Branch:** feat/adaptive-aspect-ratio
**PR:** PR-7
**Depends on:** Task 7.1 complete, content audit results

### Context

Enemy spawning must use the safe zone (800×600 centered) for spawn x-positions.
This preserves designed wave density — wider screens don't spread enemies out.

**Use the content audit results** to determine how spawn positions are mapped.
If content uses absolute pixel x-coords, offset them by `safeZone.x`.
If content uses normalized 0-1 values, map to `safeZone.x + fraction * safeZone.width`.
If randomized by the spawning system, constrain the random range to the safe zone.

### Files to touch

Modify (based on audit — likely these files):
- Enemy spawning system (WaveManager or equivalent)
- Any file that creates enemies and sets their initial position
- Read safe zone from registry for spawn boundary calculations

### Design decision (pre-resolved)

Enemies spawn within the safe zone x-range. Enemies that move horizontally during
their lifetime are NOT clamped to the safe zone — they can drift into the margins.
Only the initial spawn position is safe-zone-constrained.

### Acceptance criteria

- [ ] Enemies spawn within the center 800px corridor on a wide screen
- [ ] Enemies spawn identically on a 4:3 screen (safe zone = world)
- [ ] Enemies can drift outside the safe zone after spawning (not clamped)
- [ ] No content data files are modified — only interpretation code
- [ ] `pnpm validate` passes
```

### Task 7.4 — Background Fill

```markdown
## Task: Extend background to fill expanded canvas

**Agent:** phaser-integrator
**Branch:** feat/adaptive-aspect-ratio
**PR:** PR-7
**Depends on:** Task 7.1 complete, content audit results (background type)

### Context

**Use the content audit result** to determine the current background implementation.

If it's a static 800×600 image: replace with a tileable pattern or procedural
starfield (Phaser particles scattered across the canvas).

If it's already a tiled sprite: set dimensions to `worldWidth × worldHeight`.

If it's procedural: ensure generation bounds use `worldWidth × worldHeight`.

The background must fill the entire expanded canvas with no visible seam or
boundary at the safe zone edges.

### Acceptance criteria

- [ ] Background fills entire screen on a wide viewport — no black margins
- [ ] No visible seam or boundary at safe zone edges
- [ ] Background correct on 4:3 viewport (no regression)
- [ ] Resize updates background dimensions
- [ ] `pnpm validate` passes
```

### Task 7.5 — HUD, Boss, and UI Anchoring

```markdown
## Task: Migrate HUD and boss UI anchoring to dynamic gameSize

**Agent:** phaser-integrator
**Branch:** feat/adaptive-aspect-ratio
**PR:** PR-7
**Depends on:** Task 7.1 complete

### Context

HUD elements must anchor to screen edges (gameSize), not safe zone. The HUD
scaling from PR-4 remains — only the anchor positions and scale factor input change.

### Files to touch

Modify:
- `packages/game/src/systems/HudManager.ts`:
  - Replace any hardcoded 800 width references in positioning with `gameSize.width`
  - Verify scale factor formula: should be `displayHeight / 600` (height is fixed axis).
    If using `Math.min(displayWidth / REF_WIDTH, displayHeight / REF_HEIGHT)`, update
    `REF_WIDTH` to use dynamic `gameSize.width` so the formula is
    `Math.min(displayWidth / worldWidth, displayHeight / 600)`.
  - Score/lives/currency: anchor to top-left of screen (`margin, y`)
  - Wave indicator: center at `gameSize.width / 2`
  - Game over / stage clear text: center at `gameSize.width / 2`
  - On registry change (`changedata-worldWidth`): reposition elements

- `packages/game/src/systems/BossManager.ts`:
  - Center boss warning and health bar on `gameSize.width / 2`
  - Boss movement patterns: if boss x-movement references world width, decide
    whether boss uses safe zone (stays in center corridor) or expanded canvas.
    **Recommendation: safe zone for boss patterns** — bosses are designed encounters,
    their movement should feel consistent regardless of screen width.

### Acceptance criteria

- [ ] HUD at screen edges on wide viewport (not floating in the middle)
- [ ] HUD at correct positions on 4:3 viewport (no regression)
- [ ] Boss centered on screen on wide viewport
- [ ] HUD scale factor still produces correct sizes at all five reference devices
- [ ] `pnpm validate` passes
```

### Task 7.6 — Projectile Cleanup, TouchInput, and Remaining Systems

```markdown
## Task: Migrate projectile cleanup, touch zones, and remaining hardcoded dimensions

**Agent:** phaser-integrator
**Branch:** feat/adaptive-aspect-ratio
**PR:** PR-7
**Depends on:** Task 7.1 complete

### Files to touch

Modify:
- Projectile cleanup system: destroy projectiles at expanded canvas edges
  (`gameSize.width`, `gameSize.height`), not at 800/600. This prevents visible
  projectile pop-in at the margins.

- `packages/game/src/systems/TouchInput.ts`:
  - "Left half of screen" for joystick activation: `x < gameSize.width / 2`
    (not `x < 400`)
  - Read gameSize from scene's scale manager or registry

- `packages/game/src/scenes/MenuScene.ts`:
  - Title and UI centering: `gameSize.width / 2`, `gameSize.height / 2`

- `packages/game/src/systems/DebugOverlay.ts`:
  - Right-align position: `gameSize.width - 10` (not `790`)

- **Grep results from content audit:** any remaining hardcoded 800/600 references
  found by the audit that haven't been addressed by Tasks 7.2-7.5. Fix them here.

### Acceptance criteria

- [ ] No hardcoded 800 or 600 references remain in packages/game/ (except the
      constants in SafeZone.ts which define the safe zone dimensions)
- [ ] Projectiles cleaned up at screen edges on wide viewport
- [ ] Touch joystick zone correct on wide viewport
- [ ] Menu centered on wide viewport
- [ ] Debug overlay right-aligned to screen edge
- [ ] `pnpm validate` passes
```

### Task 7.7 — Tests

```markdown
## Task: Unit and integration tests for aspect ratio migration

**Agent:** test-runner
**Branch:** feat/adaptive-aspect-ratio
**PR:** PR-7
**Depends on:** Tasks 7.1-7.6 complete

### Files to touch

Create tests in `packages/game/`:

**SafeZone unit tests:**
- computeWorldSize at five reference aspect ratios (20:9, 16:9, 4:3, 1:1, ultra-wide)
- Clamping at min (800) and max (1200)
- createSafeZone centering at various world widths
- Safe zone at 4:3 has origin (0,0) — the identity case

**HUD scale factor tests:**
- Verify factor formula with dynamic world width produces same results as PR-4
  at the five reference device sizes
- Verify pixel floors still apply

**Integration test (if feasible):**
- Mount game with wide container → verify worldWidth > 800
- Mount game with 4:3 container → verify worldWidth = 800
- Verify safe zone is centered in both cases

**Hardcoded reference sweep:**
- Grep `packages/game/src/` for literal `800` and `600` (excluding SafeZone.ts
  constants, test files, and comments). Report any remaining instances.

### Acceptance criteria

- [ ] SafeZone pure functions tested at all edge cases
- [ ] HUD scaling tested with new formula
- [ ] No remaining hardcoded 800/600 in game source (except safe zone constants)
- [ ] All existing tests pass
- [ ] `pnpm validate` + `pnpm test:e2e` pass
```

---

## Pre-Merge Verification

This is the highest-touch verification since PR-2. The world sizing model is foundational — if it's wrong, everything built on top is wrong.

1. **Full gate:** `pnpm validate` + `pnpm test:e2e`

2. **4:3 parity (mandatory, manual):** Open `/play` in a browser window at approximately 800×600 (or any 4:3 ratio). Play through at least one wave. The game must look and play **identically** to pre-migration. If anything is different — enemy positions, HUD placement, player bounds, background — stop and investigate.

3. **Wide viewport (mandatory, manual):** Resize the browser to a 16:9 or wider ratio. Verify:
   - Game fills the screen (no or minimal letterbox)
   - Background extends to all edges (no black bars or seams)
   - HUD is at screen edges (not floating in the center)
   - Enemies spawn in the center corridor (not spread across the full width)
   - Player can move to visible screen edges
   - Joystick zone split is at screen center (not at 400px)

4. **Resize stability:** Resize the browser window from wide to narrow and back. No crashes, no visual artifacts, no stuck elements. Physics bounds update. Safe zone repositions.

5. **Boundary check:** All changes in `packages/game/`. No `packages/contracts/` changes. No `packages/content/` changes.

After verification, dispatch to `pr-shipper` to land, update state log, and push.

---

## State Log Update (after merge)

```markdown
## Completed (append)

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| PR-7 | safe-zone-and-world-sizing | phaser-integrator | ✅ | SafeZone type, dynamic world, registry |
| PR-7 | player-bounds-physics | phaser-integrator | ✅ | Expanded canvas bounds |
| PR-7 | spawn-migration | phaser-integrator | ✅ | Safe zone spawn coordinates |
| PR-7 | background-fill | phaser-integrator | ✅ | Full canvas coverage |
| PR-7 | hud-boss-anchoring | phaser-integrator | ✅ | gameSize anchoring, updated scale factor |
| PR-7 | remaining-systems | phaser-integrator | ✅ | Projectiles, touch, menu, debug |
| PR-7 | tests | test-runner | ✅ | SafeZone tests, HUD factor tests, hardcoded sweep |
| PR-7 | parity-check | operator | ✅ | 4:3 and 16:9 manual verification |
| PR-7 | land | pr-shipper | ✅ | Merged to main |

## Phase B Amended Acceptance Criteria

- [ ] Game fills screen on 20:9 phone viewports (<5% letterbox)
- [ ] Game fills screen on 16:9 desktop viewports (no letterbox)
- [ ] 4:3 behavior identical to pre-migration
```
