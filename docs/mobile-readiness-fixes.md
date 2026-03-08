# Mobile Adaptation — Pre-Implementation Readiness Fixes

Directive for the planning agent. Execute all fixes in this document before dispatching any mobile implementation task. These resolve gaps that would cause implementation failures if left unaddressed.

**Execution order matters.** Fixes are numbered by priority. Complete them sequentially — some later fixes reference artifacts created by earlier ones.

**Branch:** `chore/mobile-readiness` — all fixes land in a single preparatory PR before mobile implementation begins.

**Commit convention:** `chore(scope): description` — these are infrastructure/config changes, not features.

---

## Fix 1: Grant schema-validator Write Tools

**Problem:** `schema-validator` agent has tool list `Read, Glob, Grep, Bash` — no Write, Edit, or MultiEdit. It cannot modify schema files through proper tools. Falling back to Bash sed/cat bypasses the Biome auto-format PostToolUse hook (which triggers on Edit/Write, not on Bash commands), producing unformatted committed code.

**File:** `.claude/agents/schema-validator.md`

**Action:** Find the tools declaration and add Write, Edit, MultiEdit to the allowed list. The result should be:

```
Read, Write, Edit, MultiEdit, Glob, Grep, Bash
```

Keep the agent's domain boundary unchanged — it still only operates in `packages/contracts/`. The added tools let it author and modify schema files properly while triggering Biome auto-format on every save.

**Verify:** Confirm the tools line includes all seven tools. Confirm the domain boundary statement still restricts scope to `packages/contracts/`.

---

## Fix 2: Create Mobile Context Skill

**Problem:** No agent has awareness of mobile architectural decisions. The orchestration directive says task prompts must be self-contained, but repeating the full mobile architecture in every prompt is wasteful and error-prone. Agents need a loadable skill that provides condensed mobile context on demand.

**Do NOT embed mobile architecture into agent definition files.** Agent definitions are persistent and apply to all work — loading mobile context into every non-mobile session wastes context window.

**File to create:** `.claude/skills/mobile-adaptation/SKILL.md`

**Content — write exactly this, adapting only if file paths in the repo have changed:**

```markdown
# Mobile Adaptation — Architecture Context

Load this skill when working on any mobile-related task. Source documents:
- `mobile-adaptation.md` — full plan (sections referenced as §N below)
- `docs/mobile-decisions.md` — resolved open decisions

## Three Size Domains (§ Architectural Foundation)

| Domain | Owner | Definition |
|---|---|---|
| World size | Phaser | Fixed 800×600. All gameplay logic operates here. Never changes. |
| Display size | Phaser Scale Manager | Physical pixel dimensions. FIT mode scales 800×600 into parent container preserving 4:3. Access via `scale.displaySize`, `scale.getViewPort()`. |
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
```

**After creating the file:** Add a row to the orchestration directive's §11 Skill Loading Reminders table:

| Agent | Task type | Skill to load |
|---|---|---|
| Any agent | Mobile adaptation work | `mobile-adaptation` |

**Verify:** File exists at `.claude/skills/mobile-adaptation/SKILL.md`. Content covers all six architectural concepts (three domains, input intent, settings transport, pause model, HUD scaling, orientation strategy). No recommendations or options — only settled decisions.

---

## Fix 3: Create Orchestration State Log

**Problem:** The state log template exists in the orchestration directive but no actual file tracks progress. Without a committed file, session continuity breaks — a new Claude Code session has no record of what shipped.

**File to create:** `docs/mobile-state.md`

**Content:**

```markdown
# Mobile Adaptation — Orchestration State

## Current phase: A (Input-valid)
## Current PR: Pre-implementation (readiness fixes)
## Branch: chore/mobile-readiness

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| — | — | — | — | — |

## In Progress

| PR | Task | Agent | Status | Blocker |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | 🔄 | — |

## Blocked

| PR | Task | Agent | Blocker |
|---|---|---|---|
| — | — | — | — |

## Decisions Resolved

| # | Decision | Outcome | Date |
|---|---|---|---|
| 1 | Touch auto-fire policy | No decision needed — auto-fire is existing behavior. `autoFire` setting removed from plan. | 2026-03-08 |
| 2 | Input adapter activation | Capability detection at mount + `controlScheme: 'touch'` override. No UA sniffing. | 2026-03-08 |
| 3 | Runtime settings transport | Phaser registry `changedata` events. No custom bus. No new GameEventMap entries. | 2026-03-08 |
| 4 | Pause ownership | Shell-authoritative. Game never self-pauses. | 2026-03-08 |
| 5 | Touch target strategy | Full-scene `pointerdown` for all in-canvas prompts. No localized hit zones. | 2026-03-08 |
| 6 | HUD scaling envelope | Clamped `[0.6, 1.5]` with per-element pixel floors (10px HUD, 9px boss label). | 2026-03-08 |
| 7 | Manifest orientation | Preference only. Overlay + game pause is real enforcement. No `screen.orientation.lock()`. | 2026-03-08 |

## Decisions Pending

None — all seven resolved.

## Rollback Log

| PR | Action | Reason | Date |
|---|---|---|---|
| — | — | — | — |
```

**After creating the file:** Update auto-memory (`MEMORY.md`) to include a line: `Mobile orchestration state tracked in docs/mobile-state.md. Current phase: A. Current PR: readiness.`

**Verify:** File exists at `docs/mobile-state.md`. All seven decisions are populated. Memory pointer is set.

---

## Fix 4: Add Mobile-Critical APIs to phaser4-rc Skill

**Problem:** The `phaser4-rc` skill has no documentation for Scale Manager events, registry `changedata` events, or Pointer Events API usage in Phaser 4 RC. Agents working on PR-2 and PR-4 need to know these APIs exist and how they behave.

**File:** `.claude/skills/phaser4-rc/SKILL.md`

**Action:** Append the following section to the end of the existing skill content. Do not modify existing content — only add.

```markdown

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
```

**Verify:** The appended content covers three API surfaces: Scale Manager events (resize + orientation), registry changedata, and Pointer Events. Each includes code examples and Phaser 4 RC-specific notes.

---

## Fix 5: Add Mobile Patterns to sveltekit-phaser-seam Skill

**Problem:** The seam skill documents the mount/destroy lifecycle and SSR guard pattern but has no coverage of runtime settings updates, lifecycle expansion for mobile, or orientation handling.

**File:** `.claude/skills/sveltekit-phaser-seam/SKILL.md`

**Action:** Append the following section to the end of the existing skill content. Do not modify existing content — only add.

```markdown

## Runtime Settings Bridge (Mobile)

Post-mount settings updates flow from Svelte to Phaser via `GameHandle.updateSettings()`:

```typescript
// In GameHandle (packages/game/src/types.ts)
interface GameHandle {
  // ... existing methods
  updateSettings(partial: Partial<RuntimeSettings>): void;
}

// Implementation (mountGame.ts) writes to Phaser registry
updateSettings(partial) {
  for (const [key, value] of Object.entries(partial)) {
    game.registry.set(key, value);
  }
}
```

Shell integration — use Svelte 5 `$effect` to push changes:

```typescript
// In GameCanvas.svelte or play/+page.svelte
$effect(() => {
  if (handle) {
    handle.updateSettings({
      masterVolume: settings.value.masterVolume,
      sfxVolume: settings.value.sfxVolume,
      musicVolume: settings.value.musicVolume,
    });
  }
});
```

**Important:** `$effect` tracks reactive dependencies automatically. Only include settings that should trigger runtime updates. Do not include `controlScheme` — adapter selection happens at mount time only (Phase A).

## Expanded Lifecycle Handling (Mobile)

Desktop uses `visibilitychange` only. Mobile requires additional lifecycle coverage:

```svelte
<script>
  // Existing: visibilitychange
  function handleVisibility() {
    if (document.hidden) handle?.pause();
    else handle?.resume();
  }

  // Addition: pagehide (complementary signal on mobile)
  function handlePageHide() {
    handle?.pause();
  }

  $effect(() => {
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  });
</script>
```

Pause is shell-authoritative. The game never self-pauses. All triggers (visibility, orientation, overlay button) call `handle.pause()` from the shell side.

## Orientation Handling

Shell detects portrait orientation and shows a rotate overlay:

```svelte
<script>
  let isPortrait = $state(false);

  function checkOrientation() {
    isPortrait = window.innerWidth < window.innerHeight;
    if (isPortrait) handle?.pause();
  }

  $effect(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  });
</script>

{#if isPortrait}
  <RotateOverlay />
{/if}
```

The game-side safety net: GameScene subscribes to `Phaser.Scale.Events.ORIENTATION_CHANGE` and calls `adapter.clear()` on portrait. This is a fallback — the shell overlay is the primary enforcement.
```

**Verify:** Appended content covers three patterns: updateSettings bridge, expanded lifecycle, and orientation handling. All use Svelte 5 runes syntax. No Phaser types leak into Svelte code examples.

---

## Fix 6: Fix Stale Content in Agent Definitions

**Problem:** `svelte-shell.md` references `/settings` as "planned (Phase 11)" but it shipped in Phase 9 and is live. When PR-3 adds `updateSettings()` to `GameHandle`, `phaser-integrator.md` will also become stale.

**File:** `.claude/agents/svelte-shell.md`

**Action:** Find the route inventory or phase reference that mentions `/settings` as planned. Update to reflect current state: `/settings` is live, SSR-rendered, uses Svelte 5 `$state` runes in a `.svelte.ts` store module, persists to localStorage.

**File:** `.claude/agents/svelte-shell.md`

**Additional action:** Add a maintenance note at the bottom of the agent definition:

```markdown
## Maintenance

When shipping work that changes route inventory, component APIs, or GameHandle methods, update this file to reflect the new state. Stale agent definitions cause agents to work against outdated assumptions.
```

**File:** `.claude/agents/phaser-integrator.md`

**Action:** Add the same maintenance note. Also verify the GameHandle method list is current (should include `destroy()`, `pause()`, `resume()`, `emit()`, `on()`, `off()`). Do NOT add `updateSettings()` yet — that ships with PR-3. The maintenance note ensures it gets added when PR-3 lands.

**Verify:** `/settings` is described as live, not planned. Both agent definitions have maintenance notes.

---

## Fix 7: Add Touch and Orientation Testing Patterns to browser-debugging Skill

**Problem:** The `test-runner` agent needs to write Playwright tests that emulate touch input, mobile viewports, and orientation changes. No testing patterns exist for these scenarios. The existing e2e tests are desktop smoke checks.

**File:** `.claude/skills/browser-debugging/SKILL.md`

**Action:** Append the following section to the end of the existing skill content.

```markdown

## Playwright Mobile Emulation

### Mobile viewport and touch context

```typescript
import { test, expect } from '@playwright/test';

// Create a mobile browser context with touch support
test('mobile touch test', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },  // iPhone 15 landscape
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/play');

  // Verify touch-action is set on game container
  const container = page.locator('.game-container');
  await expect(container).toHaveCSS('touch-action', 'none');
});
```

### Orientation simulation via viewport resize

Playwright does not have a native orientation API. Simulate orientation change by swapping viewport dimensions:

```typescript
// Landscape
await page.setViewportSize({ width: 844, height: 390 });

// Portrait (swap dimensions)
await page.setViewportSize({ width: 390, height: 844 });

// Verify rotate overlay appears in portrait
await expect(page.locator('[data-testid="rotate-overlay"]')).toBeVisible();

// Back to landscape — overlay should disappear
await page.setViewportSize({ width: 844, height: 390 });
await expect(page.locator('[data-testid="rotate-overlay"]')).not.toBeVisible();
```

### Touch interaction

```typescript
// Simulate touch on left half of screen (joystick area)
await page.touchscreen.tap(200, 300);

// Simulate touch drag (joystick movement)
// Note: Playwright touchscreen API is limited — for complex multi-touch,
// use CDP session:
const cdp = await page.context().newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ x: 200, y: 300 }],
});
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchMove',
  touchPoints: [{ x: 250, y: 300 }],
});
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchEnd',
  touchPoints: [],
});
```

### Visibility change simulation

```typescript
// Simulate tab backgrounding
await page.evaluate(() => {
  document.dispatchEvent(new Event('visibilitychange'));
  Object.defineProperty(document, 'hidden', { value: true, writable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
```

### Standard mobile device presets for this project

| Device | Viewport (landscape) | Scale factor | Use for |
|---|---|---|---|
| iPhone SE | 568×320 | 0.533 | Smallest target — readability, touch targets |
| iPhone 15 | 844×390 | 0.65 | Mid-range phone baseline |
| iPad mini | 1024×683 | 1.0 | Tablet baseline |
| iPad Air | 1366×1024 | 1.28 | Large tablet — oversized text check |
```

**Verify:** Appended content covers viewport emulation, orientation simulation, touch interaction (basic + CDP), visibility change simulation, and the standard device preset table.

---

## Fix 8: Fix pr-shipper Staging Approach

**Problem:** `pr-shipper.md` line 16 uses `git add -A`, which stages everything including potential secrets, binaries, and untracked files. Global `CLAUDE.md` says prefer staging specific files by name.

**File:** `.claude/agents/pr-shipper.md`

**Action:** Find the `git add -A` instruction and replace with:

```markdown
Stage only files reported in the completing agent's done signal. Use `git add <file1> <file2> ...` with explicit paths. Never use `git add -A`, `git add .`, or `git add --all`.

If the completing agent's done signal does not list changed files, request the list before staging. Do not guess.
```

**Verify:** No instance of `git add -A`, `git add .`, or `git add --all` remains in the file. The explicit staging instruction references the done signal from the task prompt template.

---

## Fix 9: Document Rollback Protocol

**Problem:** No rollback procedure exists. PR-2 refactors the central gameplay loop (GameScene input handling) — the highest-risk change in the plan. If it breaks desktop keyboard input, there must be a defined recovery path.

**File to create:** `docs/mobile-rollback.md`

**Content:**

```markdown
# Mobile Adaptation — Rollback Protocol

## When to rollback

A rollback is triggered when:
- A merged PR breaks `pnpm validate` or `pnpm test:e2e` on `main`
- Desktop keyboard input no longer functions after a mobile PR merge
- A regression is discovered that cannot be fixed forward within one session

## How to rollback

### Option A: Revert commit (preferred for single-PR regressions)

```bash
git revert --no-commit <merge-commit-sha>
# Verify the revert fixes the issue
pnpm validate
pnpm test:e2e
git commit -m "revert(scope): revert PR-N due to <reason>"
git push
```

### Option B: Reset to known-good (for cascading failures across multiple PRs)

```bash
# Identify the last known-good commit on main
git log --oneline main

# Create a recovery branch from the known-good point
git checkout -b fix/mobile-recovery <known-good-sha>

# Cherry-pick any non-mobile commits that landed after the bad merge
git cherry-pick <non-mobile-commit-sha>

# Verify
pnpm validate
pnpm test:e2e

# Merge recovery branch to main
```

## Risk-ranked PRs

| PR | Risk | Rollback trigger | What to verify before merging |
|---|---|---|---|
| PR-1 | Low | CSS layout breaks routes | All three routes render, no overflow |
| PR-2 | **High** | Desktop keyboard input stops working | Play full game loop with keyboard. Arrow keys + WASD both work. Diagonal normalization preserved. Fire rate unchanged. |
| PR-3 | Medium | Settings changes crash game or desync | Change volume mid-game. Change settings, verify persistence. |
| PR-4 | Low | HUD text unreadable or missing | Visual check at 800×600 (desktop parity) |
| PR-5 | Low | Overlay blocks gameplay or breaks layout | Play page loads, overlay does not obstruct canvas in landscape |
| PR-6 | Low | PWA/SW breaks caching | Clear cache, reload, verify game loads |

## Post-rollback procedure

1. Update `docs/mobile-state.md` rollback log with PR number, action taken, and reason.
2. Route the failure to `diagnostician` for root cause analysis.
3. Once root cause is identified, route fix to the owning agent.
4. Re-attempt the PR with the fix included.
```

**After creating the file:** Add the rollback protocol reference to `pr-shipper.md`:

```markdown
## Rollback

If a merge introduces regressions on `main`, follow the rollback protocol in `docs/mobile-rollback.md`. Log all rollbacks in `docs/mobile-state.md`.
```

**Verify:** Rollback file exists with both revert and reset procedures. Risk-ranked PR table matches the six PRs in the orchestration plan. `pr-shipper.md` references the rollback protocol.

---

## Fix 10: Clarify GameMountOptions Type Contract Flow in Orchestration Directive

**Problem:** PR-2 expands `GameMountOptions.settings` in `packages/game/src/types.ts` (phaser-integrator domain), but `svelte-shell` needs to know the new shape to pass settings at mount time. The dependency crosses agent boundaries without an explicit contract handoff.

**This is not a file change — it is an amendment to how PR-2 task prompts are written.**

**Action:** When dispatching PR-2 tasks, enforce this dependency chain in the task prompts:

1. **`schema-validator`** extends `ControlSchemeSchema` to include `'touch'`. Ships the type. Done signal includes the exact updated schema definition.

2. **`phaser-integrator`** imports the updated type from `@sg/contracts` and maps it into `GameMountOptions.settings`. The done signal for this task must include the **exact expanded `GameMountOptions.settings` type** — field names, types, and defaults — so that `svelte-shell` can consume it without reading `packages/game/` source code.

   Example done signal excerpt:
   ```
   GameMountOptions.settings now accepts:
   - masterVolume: number (existing)
   - sfxVolume: number (existing)
   - musicVolume: number (existing)
   - showFps: boolean (existing)
   - touchControlsEnabled: boolean (new, default true)
   - controlScheme: 'wasd' | 'arrows' | 'touch' (new, default 'wasd')
   ```

3. **`svelte-shell`** reads the done signal from step 2 and passes the appropriate settings from its store to `mountGame()`. It never opens `packages/game/src/types.ts` — the contract flows through the done signal.

**Amend the orchestration directive's §4 Task Prompt Template** — add to the Done Signal section:

```markdown
### Done signal

When complete, report:
- Files changed (full paths)
- Tests added/modified
- Any deviations from spec
- Any open questions
- **If this task defines or changes a cross-package interface:** the exact type signature or contract that downstream agents must consume
```

**Verify:** The orchestration directive's task template includes the cross-package interface clause in the done signal section.

---

## Completion Checklist

After executing all fixes, verify the following before marking readiness as complete:

- [ ] `.claude/agents/schema-validator.md` has Write, Edit, MultiEdit in tools
- [ ] `.claude/skills/mobile-adaptation/SKILL.md` exists with all six architectural concepts
- [ ] `docs/mobile-state.md` exists with all seven decisions pre-populated
- [ ] Auto-memory has pointer to `docs/mobile-state.md`
- [ ] `.claude/skills/phaser4-rc/SKILL.md` has Scale Manager, registry changedata, and Pointer Events sections
- [ ] `.claude/skills/sveltekit-phaser-seam/SKILL.md` has updateSettings, lifecycle, and orientation sections
- [ ] `.claude/agents/svelte-shell.md` has `/settings` as live, has maintenance note
- [ ] `.claude/agents/phaser-integrator.md` has maintenance note, GameHandle methods are current
- [ ] `.claude/skills/browser-debugging/SKILL.md` has Playwright mobile emulation section
- [ ] `.claude/agents/pr-shipper.md` has no `git add -A`, references done signal for staging, references rollback protocol
- [ ] `docs/mobile-rollback.md` exists with revert and reset procedures
- [ ] Orchestration directive task template done signal includes cross-package interface clause
- [ ] `pnpm validate` passes (no broken configs)
- [ ] Branch `chore/mobile-readiness` committed and merged before any mobile implementation begins

**After all checks pass:** Update `docs/mobile-state.md`:
- Move readiness task from In Progress to Completed
- Set Current PR to `PR-1`
- Set Branch to `feat/mobile-shell-foundation`

Then dispatch PR-1 tasks per the orchestration directive.
