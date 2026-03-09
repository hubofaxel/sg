# PR-1 Complete — Verification and PR-2 Dispatch

PR-1 (Shell Foundation) has been reported complete by `svelte-shell` and `test-runner`. Execute the following in order.

---

## 1. Verify PR-1 Deliverables

Check each acceptance criterion from the orchestration directive's PR-1 specification against the reported deliverables.

| Criterion | Evidence | Status |
|---|---|---|
| `viewport-fit=cover` added to app.html | Commit 9073d44, `src/app.html` modified | ✅ Verify no `user-scalable=no` was added |
| `100dvw/100dvh` on play page | Commit 9073d44, `play/+page.svelte` modified | ✅ Verify `100vw`/`100vh` are fully replaced, not just added alongside |
| Safe area padding via `env(safe-area-inset-*)` | Commit 9073d44, `play/+page.svelte` modified | ✅ |
| `touch-action: none` on `.game-container` | Commit 9073d44, `GameCanvas.svelte` modified | ✅ Confirmed via e2e computed style test |
| `"orientation": "landscape"` in manifest | Commit 9073d44, `manifest.webmanifest` modified | ✅ |
| Rotate overlay shown in portrait | Commit 1f285e2, `RotateOverlay.svelte` created | ✅ Confirmed via e2e portrait test (375×667) |
| Rotate overlay absent in landscape | e2e test confirms overlay absent at 667×375 | ✅ |
| Overlay uses Svelte 5 runes | `$state` + `$effect` reported | ✅ |
| Overlay is accessible | `role="alert"`, `aria-live="assertive"`, `aria-hidden` on decorative SVG | ✅ |
| `pnpm validate` passes | 0 typecheck, 0 lint, 288 unit, 0 asset errors, boundaries pass | ✅ |
| `pnpm test:e2e` passes | 14 e2e tests (8 existing + 6 new) | ✅ |
| All files within `apps/web/` boundary | Confirmed — no Phaser imports, no boundary violations | ✅ |

### Boundary check

All modified and created files are within `apps/web/`. No files in `packages/game/`, `packages/contracts/`, `packages/ui/`, or `tools/`. This is correct — PR-1 is entirely `svelte-shell` domain.

### One item to spot-check

The overlay uses `window.innerWidth < window.innerHeight` for portrait detection. Confirm this is evaluated inside a browser guard (SSR safety). The store module uses `typeof localStorage === 'undefined'` for its SSR guard — the overlay should have an equivalent pattern since `window` is undefined during SSR. If the `$effect` is used (which only runs client-side in Svelte 5), this is implicitly safe. Verify this is the case. If the resize listener is attached outside `$effect`, flag it for a quick fix before merging.

**If all checks pass:** PR-1 is verified. Dispatch to `pr-shipper` to land it.

---

## 2. Land PR-1

Dispatch to `pr-shipper`:

```markdown
## Task: Land PR-1 Shell Foundation

**Agent:** pr-shipper
**Branch:** feat/mobile-shell-foundation

### Context

PR-1 (Mobile Shell Foundation) is verified. All acceptance criteria pass. Land it to main.

### Commits (already made)

- 9073d44 — `feat(web): add viewport-fit=cover and dynamic viewport units`
- 1f285e2 — `feat(web): add rotate-device overlay`
- b1f12d1 — `test(web): add mobile shell e2e coverage`

### Files to stage (explicit list — no git add -A)

Modified:
- apps/web/src/app.html
- apps/web/src/routes/play/+page.svelte
- apps/web/src/lib/components/GameCanvas.svelte
- apps/web/static/manifest.webmanifest
- docs/mobile-state.md

Created:
- apps/web/src/lib/components/RotateOverlay.svelte
- apps/web/tests/mobile-shell.spec.ts

### Pre-merge gate

Run and confirm all pass:
1. `pnpm validate`
2. `pnpm test:e2e`
3. Route probe: `/`, `/play`, `/settings` — all render without error

### Merge

Use `/land` to merge to main. If merge conflicts exist on main, resolve conservatively (keep main's version of any non-mobile code, reapply mobile changes on top).

### Done signal

Report: merge commit SHA, any conflicts resolved, final gate status.
```

---

## 3. Update State Log

After `pr-shipper` confirms the merge, update `docs/mobile-state.md`:

```markdown
## Current phase: A (Input-valid)
## Current PR: PR-2
## Branch: feat/mobile-input-intent

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | ✅ | All 10 fixes applied |
| PR-1 | viewport-and-layout | svelte-shell | ✅ | Commit 9073d44 |
| PR-1 | rotate-overlay | svelte-shell | ✅ | Commit 1f285e2 |
| PR-1 | e2e-verification | test-runner | ✅ | 6 new tests, commit b1f12d1 |
| PR-1 | land | pr-shipper | ✅ | Merged to main — [SHA from done signal] |
```

Move all PR-1 rows from In Progress to Completed. Set Current PR to PR-2. Set Branch to `feat/mobile-input-intent`.

---

## 4. Dispatch PR-2 Tasks

PR-2 is the highest-risk PR in the mobile plan. It refactors the central gameplay loop. Two tasks can run concurrently because they touch different packages with no shared files. The third task depends on both.

### Task 2.1 — Schema Extension (concurrent with 2.2)

```markdown
## Task: Extend ControlScheme for touch input

**Agent:** schema-validator
**Branch:** feat/mobile-input-intent (create from main after PR-1 merge)
**PR:** PR-2
**Depends on:** PR-1 merged to main

### Context

Mobile input requires a third control scheme value. The existing `controlScheme` enum
has `'wasd' | 'arrows'` but both are keyboard-only. Adding `'touch'` enables explicit
touch adapter selection. See mobile-adaptation.md §3 and mobile-decisions.md Decision 2.

Note: `autoFire` was removed from the plan — the game already auto-fires unconditionally
(Decision 1). Do NOT add an autoFire field.

### Skill to load

Load `.claude/skills/mobile-adaptation/SKILL.md` for architectural context.
Load `.claude/skills/zod4-content-schemas/SKILL.md` for Zod 4 patterns.

### Files to touch

- `packages/contracts/src/settings/settings.schema.ts` — extend `ControlSchemeSchema`
  to include `'touch'` as a third valid value

### Constraints

- Only modify files in `packages/contracts/`
- Default for `controlScheme` must remain `'wasd'` — existing persisted settings in
  localStorage must still parse without migration
- Do NOT add `autoFire` — it was eliminated by Decision 1
- Do NOT add Phase B fields yet (touchDeadZone, touchMaxRadius, touchHandedness) —
  those come in PR-3 or later
- Schema field, default value, and test must all be in the same commit

### Acceptance criteria

- [ ] `ControlSchemeSchema` accepts `'wasd'`, `'arrows'`, and `'touch'`
- [ ] `ControlSchemeSchema` rejects invalid values (e.g., `'gamepad'`, `''`, `123`)
- [ ] `GameSettingsSchema.parse({})` still returns `controlScheme: 'wasd'` as default
- [ ] Existing persisted settings `{ controlScheme: 'wasd' }` parse without error
- [ ] Unit test covers all three valid values + rejection of invalid values
- [ ] `pnpm validate` passes from repo root (type checking propagates to consumers)

### Done signal

Report: files changed, tests added, the exact updated ControlSchemeSchema definition
(copy the type — downstream agents need it), any deviations from spec.
```

### Task 2.2 — Input Intent System (concurrent with 2.1)

```markdown
## Task: Build input intent system with keyboard and touch adapters

**Agent:** phaser-integrator
**Branch:** feat/mobile-input-intent
**PR:** PR-2
**Depends on:** PR-1 merged to main. Can run concurrently with Task 2.1 (schema extension)
because the adapters reference settings values by string key, not by imported schema type.

### Context

The game currently reads keyboard input directly in GameScene.handleMovement() with
inline cursor/WASD key checks. Mobile requires touch input. Rather than adding touch
handling alongside keyboard code, build an input-intent adapter layer that normalizes
all input sources into a single contract.

See mobile-adaptation.md §3, mobile-decisions.md Decisions 1 and 2.

Key facts from the decisions:
- Auto-fire is unconditional — the game already fires every frame on cooldown.
  Both adapters emit fireHeld: true always. This is a placeholder for future
  manual fire patterns.
- Adapter activation uses capability detection at mount time, not UA sniffing.
- No runtime adapter hot-swap in Phase A.

### Skills to load

Load `.claude/skills/mobile-adaptation/SKILL.md` for architectural context.
Load `.claude/skills/phaser4-rc/SKILL.md` for Scale Manager events, registry changedata,
and Pointer Events API documentation.

### Files to touch

Create:
- `packages/game/src/systems/InputIntent.ts` — export the InputIntent interface:
  ```typescript
  export interface InputIntent {
    moveVector: { x: number; y: number }; // normalized -1..1 per axis
    fireHeld: boolean;
    secondaryHeld: boolean;
    pausePressed: boolean;
  }
  ```
  Also export an InputAdapter interface with lifecycle methods:
  ```typescript
  export interface InputAdapter {
    create(scene: Phaser.Scene): void;
    update(): InputIntent;
    clear(): void;
    destroy(): void;
  }
  ```

- `packages/game/src/systems/KeyboardInput.ts` — adapter class implementing InputAdapter.
  Wraps the existing cursor keys + WASD logic from GameScene.ts:105-114 and
  handleMovement() at GameScene.ts:254-277. This is a REFACTOR — keyboard behavior
  must be identical to current behavior:
  - Left = cursors.left OR wasd.A
  - Right = cursors.right OR wasd.D
  - Up = cursors.up OR wasd.W
  - Down = cursors.down OR wasd.S
  - Diagonal movement is normalized (divide by sqrt(2))
  - fireHeld: always true
  - secondaryHeld: always false
  - pausePressed: always false (no keyboard pause key exists currently)
  - clear() zeroes moveVector and resets all flags
  - destroy() removes keyboard listeners

- `packages/game/src/systems/TouchInput.ts` — adapter class implementing InputAdapter.
  Implements floating virtual joystick:
  - On pointerdown in left half of screen: record touch origin, show joystick at that point
  - On pointermove: compute moveVector from delta between origin and current position
  - Dead zone: movements within 10px of origin produce zero vector
  - Max radius: movements beyond 60px are clamped (vector magnitude = 1.0)
  - Pointer capture: track pointerId from initial pointerdown, only respond to
    pointermove/pointerup matching that ID (prevents finger-swap bugs)
  - On pointerup: clear joystick state
  - On pointercancel: call clear() (critical for tab switch, browser gestures)
  - fireHeld: always true (auto-fire is unconditional)
  - secondaryHeld: reserved for future right-side touch zone, always false for now
  - clear() zeroes moveVector, releases pointer tracking, hides joystick visual
  - destroy() removes all pointer listeners
  - Joystick visual: render as Phaser graphics (two concentric circles — outer for range,
    inner for thumb position). Use alpha 0.3-0.5 so it doesn't obscure gameplay.
  - The joystick is a Phaser Graphics object, not a DOM element.

Modify:
- `packages/game/src/scenes/GameScene.ts` — refactor to consume InputIntent:
  - Remove inline keyboard setup (cursors, wasd declarations) from create()
  - Remove handleMovement() method body (replace with adapter consumption)
  - In create(): select adapter based on settings:
    - If touchControlsEnabled is true AND ('ontouchstart' in window ||
      navigator.maxTouchPoints > 0), use TouchInput
    - Otherwise use KeyboardInput
    - (controlScheme: 'touch' as a force-override can be wired once the schema
      change from Task 2.1 is on the branch — if it hasn't landed yet, use
      touchControlsEnabled as the sole gate)
  - Call adapter.create(this) in create()
  - In update(): call adapter.update(), use returned InputIntent for movement velocity
  - In scene pause handler: call adapter.clear()
  - In scene shutdown/destroy: call adapter.destroy()
  - Subscribe to scale.on('resize') — store displaySize for systems that need it
  - Subscribe to scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE) — on portrait:
    call this.scene.pause(), call adapter.clear(). On landscape: call
    this.scene.resume(). This is the game-side safety net behind the shell overlay.

- `packages/game/src/types.ts` — expand GameMountOptions.settings to include:
  - touchControlsEnabled: boolean (new)
  - controlScheme: string (new — typed as string here, not importing the Zod enum,
    to avoid leaking @sg/contracts types into the game package)

### Constraints

- Only modify files in `packages/game/`
- No Phaser types may be exported from the package boundary — InputIntent and
  InputAdapter are internal
- The KeyboardInput adapter must produce IDENTICAL movement behavior to the current
  inline code. This is a refactor, not a behavior change. Diagonal normalization
  must match exactly.
- Do not import from `@sg/contracts` — the game package reads settings as plain
  values passed through GameMountOptions, not as Zod schemas
- Touch-action: none is already set on the DOM container by PR-1 — do not duplicate
  it in Phaser config
- Do not add autoFire to GameMountOptions — firing is unconditional, no setting needed
- Dead zone (10px) and max radius (60px) should be constants, not magic numbers —
  define them at the top of TouchInput.ts with clear names

### Acceptance criteria

- [ ] Desktop keyboard input works identically to pre-refactor behavior (arrow keys
      AND WASD simultaneously, diagonal normalization)
- [ ] Touch joystick appears on pointerdown in left half of screen
- [ ] Touch joystick respects dead zone (small movements = no movement)
- [ ] Touch joystick clamps at max radius
- [ ] Pointer capture prevents finger-swap (second finger doesn't steal joystick)
- [ ] pointercancel clears all touch state
- [ ] Tab switch (visibility change) + adapter.clear() leaves no stuck movement
- [ ] Orientation change to portrait pauses scene and clears adapter
- [ ] Orientation change back to landscape resumes scene
- [ ] GameScene.update() consumes InputIntent, not raw key references
- [ ] No Phaser types exported from packages/game/ boundary
- [ ] `pnpm validate` passes

### Done signal

Report:
- Files changed (full paths)
- Tests added/modified
- The exact expanded GameMountOptions.settings type (field names, types, defaults) —
  svelte-shell needs this for the mount call
- Adapter selection logic (exact conditions used)
- Any deviations from spec (especially: did diagonal normalization change?)
- Any open questions
```

### Task 2.3 — Tests (after 2.1 and 2.2 complete)

```markdown
## Task: Unit and integration tests for input adapters and schema

**Agent:** test-runner
**Branch:** feat/mobile-input-intent
**PR:** PR-2
**Depends on:** Task 2.1 (schema extension) and Task 2.2 (input intent system) both complete

### Context

PR-2 introduces the input intent adapter system and a schema extension. Both need test
coverage. The keyboard adapter is a refactor of existing behavior — tests must verify
behavioral parity. The touch adapter is new behavior — tests must verify the joystick
mechanics and lifecycle edge cases.

### Skills to load

Load `.claude/skills/browser-debugging/SKILL.md` for Playwright mobile emulation patterns
(touch interaction, viewport simulation).

### Files to touch

Create or modify test files in `packages/game/` and `packages/contracts/`:

**Schema tests** (in `packages/contracts/`):
- Verify ControlSchemeSchema accepts 'wasd', 'arrows', 'touch'
- Verify ControlSchemeSchema rejects invalid values
- Verify GameSettingsSchema.parse({}) returns controlScheme: 'wasd' default
- Verify round-trip: parse(schema.parse({})) is stable

**Adapter unit tests** (in `packages/game/`):
- KeyboardInput:
  - update() with no keys pressed returns zero moveVector
  - update() with left key returns moveVector.x = -1
  - update() with left + up returns normalized diagonal (approximately -0.707, -0.707)
  - clear() zeros all fields
  - fireHeld is always true
- TouchInput:
  - update() with no active pointer returns zero moveVector
  - Simulated pointer within dead zone returns zero moveVector
  - Simulated pointer at max radius returns magnitude 1.0 moveVector
  - Simulated pointer beyond max radius returns clamped magnitude 1.0
  - clear() zeros moveVector and releases pointer tracking
  - pointercancel triggers clear behavior

**E2e tests** (in `apps/web/tests/`):
- Play page loads and game initializes (existing test should still pass)
- Keyboard input still works in e2e (if feasible — press arrow key, verify ship moves)
- Orientation change to portrait during gameplay triggers pause (use viewport resize)

### Constraints

- Schema tests go in `packages/contracts/` test directory
- Adapter unit tests go in `packages/game/` test directory
- E2e tests go in `apps/web/tests/`
- Do not modify implementation files — only test files
- If adapter unit tests require mocking Phaser scene/input objects, keep mocks minimal
  and document what is mocked

### Acceptance criteria

- [ ] Schema tests cover all three valid values + rejection
- [ ] KeyboardInput adapter has tests for cardinal directions, diagonal normalization,
      clear(), and fireHeld
- [ ] TouchInput adapter has tests for dead zone, max radius clamping, clear(), and
      pointercancel
- [ ] Existing e2e tests still pass (no regressions from PR-1)
- [ ] `pnpm validate` passes
- [ ] `pnpm test:e2e` passes

### Done signal

Report: test files created/modified, test count (before and after), any tests that
required unusual mocking (flag for review), any flaky tests observed.
```

### After all three tasks complete — Pre-merge verification for PR-2

Before dispatching to `pr-shipper`, perform the high-risk verification:

1. **Full gate:** `pnpm validate` + `pnpm test:e2e`
2. **Desktop parity check:** This is the critical one. Instruct `diagnostician` or verify manually:
   - Start dev server, open `/play` in a desktop browser
   - Play through at least one complete wave using keyboard (arrow keys)
   - Play through at least one complete wave using keyboard (WASD)
   - Confirm: ship moves in all 8 directions, diagonal speed feels identical to pre-refactor, firing rate is unchanged, game over / stage clear prompts work
   - If anything feels different, stop. Route to `phaser-integrator` with specific description before merging.
3. **Boundary check:** No files outside `packages/game/`, `packages/contracts/`, and `apps/web/tests/` were modified (test-runner may add e2e tests in apps/web/).
4. **Type contract handoff:** Confirm `phaser-integrator`'s done signal includes the exact `GameMountOptions.settings` type. Record it in the state log — `svelte-shell` needs it for PR-3.

Only after all four checks pass, dispatch to `pr-shipper` to land PR-2.
