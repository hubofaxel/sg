# PR-3 Landed — Phase Checkpoint, Triage, and PR-4 Dispatch

---

## 1. Push and State

Push main to origin. Three PRs of verified, gated work sitting unpushed is risk without upside. If something corrupts the local repo, you lose all of it.

```bash
git push origin main
```

Update `docs/mobile-state.md`:

```markdown
## Current phase: B (Physically usable)
## Current PR: PR-4
## Branch: feat/mobile-hud-scaling

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | ✅ | All 10 fixes applied |
| PR-1 | shell-foundation | svelte-shell | ✅ | viewport-fit, dvh, safe area, touch-action, rotate overlay |
| PR-1 | e2e-verification | test-runner | ✅ | 6 new tests |
| PR-1 | land | pr-shipper | ✅ | Merged to main |
| PR-2 | schema-extension | schema-validator | ✅ | ControlScheme + 'touch', 15 tests |
| PR-2 | input-intent-system | phaser-integrator | ✅ | InputIntent, KeyboardInput, TouchInput, GameScene refactor |
| PR-2 | adapter-tests | test-runner | ✅ | 23 adapter tests |
| PR-2 | desktop-parity-check | operator | ✅ | Manual gameplay verification |
| PR-2 | land | pr-shipper | ✅ | Merged to main |
| PR-3 | runtime-settings-bridge | phaser-integrator | ✅ | updateSettings(), registry changedata, AudioManager subscriptions |
| PR-3 | settings-store-bridge | svelte-shell | ✅ | $effect wiring to GameHandle |
| PR-3 | bridge-verification | test-runner | ✅ | Runtime update tests |
| PR-3 | land | pr-shipper | ✅ | Merged to main at 3a06e46 |

## Known Issues

| Issue | Severity | Discovered | Blocking? | Tracking |
|---|---|---|---|---|
| Visibility-change pause unsteadiness | TBD | PR-3 | No (deferred) | docs/mobile-state.md |
```

---

## 2. Triage the Visibility-Change Issue

This cannot be deferred without understanding what it is. The mobile adaptation plan identifies "stuck movement after tab switch / app background" as the single most common source of mobile regressions (§13, §17). The adapter lifecycle (`clear()` on every pause) exists specifically to prevent this.

Before dispatching PR-4, dispatch `diagnostician` to characterize the issue:

```markdown
## Task: Triage visibility-change pause unsteadiness

**Agent:** diagnostician
**Branch:** main (read-only — do not create a branch or edit files)
**PR:** N/A — triage only
**Depends on:** PR-3 merged

### Context

During PR-3 work, "visibility-change pause unsteadiness" was noted and deferred.
This needs characterization before proceeding. The mobile plan's §13 identifies
tab-switch lifecycle as the highest-risk area for mobile regressions. If the
adapter clear() path is unreliable, PR-4 and PR-5 build on a shaky foundation.

### Investigation

Answer these questions:

1. **What is the symptom?** Does the game fail to pause on tab switch? Does it
   pause but not resume? Does it pause/resume but with a visual glitch? Does
   the adapter clear() not fire, leaving stuck movement?

2. **Is it reproducible?** Steps to trigger: open /play, start game, tab away,
   tab back. Does it happen every time, intermittently, or only under specific
   conditions (e.g., only during a specific game state like boss fight or wave
   transition)?

3. **Which lifecycle path is affected?**
   - `visibilitychange` event → `handle.pause()` → `game.pause()` → scene pause
     → `adapter.clear()`
   - Is the event firing? Is pause() being called? Is the adapter clearing?
   - Check GameCanvas.svelte's visibility listener and the pause/resume flow in
     mountGame.ts.

4. **Is this a Phaser 4 RC issue?** The phaser4-rc skill notes known issues with
   scene sleep edge cases and audio context resume. Is this related?

5. **Does it affect keyboard input, touch input, or both?** If keyboard-only,
   it's a pre-existing issue unrelated to mobile work. If touch-only or both,
   it's potentially a regression from PR-2/PR-3.

6. **Severity classification:**
   - **P0 (blocks PR-4):** Adapter clear() doesn't fire on pause, causing stuck
     movement. This undermines the entire adapter lifecycle contract.
   - **P1 (fix before Phase A signoff):** Pause/resume works but has a timing
     glitch (e.g., one frame of stale input, visual flicker). Fixable in PR-5
     or a dedicated patch.
   - **P2 (defer to Phase C):** Cosmetic issue (e.g., audio resumes with a pop,
     FPS counter flickers on resume). Doesn't affect gameplay reliability.

### Constraints

- Read-only. Do not edit files. Do not create branches.
- Check dev server logs, browser console output, and the actual code paths.
- If reproducing requires running the game, use the dev server on localhost:5173.

### Done signal

Report: symptom description, reproduction steps, affected lifecycle path,
severity classification (P0/P1/P2), and whether it blocks PR-4.
```

**Decision gate:** If diagnostician reports P0, stop and fix before PR-4. Route the fix to `phaser-integrator` as a hotfix on a `fix/visibility-pause` branch. If P1, continue with PR-4 but schedule the fix before Phase A signoff. If P2, defer to Phase C as originally intended.

---

## 3. Phase A → B Checkpoint

Phase A (Input-valid) is complete: PRs 1-3 delivered the shell, input system, and settings bridge. Before investing in Phase B's usability polish, validate the foundation.

**Real device test — strongly recommended before PR-4 dispatch:**

If you have access to a phone (iPhone or Android), test the current state:

1. Access the dev server via local network (`http://<your-ip>:5173/play`) or deploy a preview
2. Open in landscape — game should render, filling the screen with letterboxing
3. Touch left half of screen — floating joystick should appear
4. Drag joystick — ship should move, respecting dead zone and max radius
5. Release — joystick disappears, ship stops
6. Rotate to portrait — rotate overlay should appear, game should pause
7. Rotate back to landscape — overlay disappears, game resumes
8. Background the browser (home button / app switch) — game should pause
9. Return to browser — game should resume, no stuck movement

**If any of these fail:** Stop. Fix before PR-4. The entire HUD scaling and overlay work in Phase B assumes the input and lifecycle foundation is solid.

**If you don't have a phone available:** Proceed with PR-4, but flag real-device testing as a hard requirement before Phase B signoff. Use Playwright mobile emulation and Chrome DevTools device mode as partial substitutes, acknowledging they don't catch real touch behavior or real orientation change events.

---

## 4. Dispatch PR-4: HUD Physical Usability

PR-4 is primarily `phaser-integrator` work (HUD and boss text scaling) with a `test-runner` follow-up. It does not touch the shell or schemas.

### Task 4.1 — HUD and Boss Text Scaling

```markdown
## Task: Implement clamped HUD scaling with per-element pixel floors

**Agent:** phaser-integrator
**Branch:** feat/mobile-hud-scaling (create from main)
**PR:** PR-4
**Depends on:** PR-3 merged to main

### Context

On small phones (iPhone SE landscape, scale factor 0.533), HUD text (16px base)
renders at 8.5px — below the readable threshold. Titles (40px) scale fine.
The problem is specific to persistent small text. See mobile-decisions.md Decision 6
for the full analysis and device table.

### Skills to load

Load `.claude/skills/mobile-adaptation/SKILL.md` — HUD Scaling section.
Load `.claude/skills/phaser4-rc/SKILL.md` — Scale Manager events (resize).

### Implementation

**Scale factor computation:**

Define named constants (suggest in HudManager.ts or a shared constants file):

```typescript
const REF_WIDTH = 800;
const REF_HEIGHT = 600;
const SCALE_FLOOR = 0.6;
const SCALE_CEILING = 1.5;
const HUD_TEXT_MIN_PX = 10;
const BOSS_LABEL_MIN_PX = 9;
```

Compute on create and on every Scale Manager resize event:

```typescript
const rawFactor = Math.min(
  displayWidth / REF_WIDTH,
  displayHeight / REF_HEIGHT
);
const scaleFactor = Math.max(SCALE_FLOOR, Math.min(rawFactor, SCALE_CEILING));
```

**Applying to text elements:**

Each text element stores its base font size. On scale update:

```typescript
// Persistent HUD (score, lives, currency, wave indicator)
fontSize = Math.max(baseSize * scaleFactor, HUD_TEXT_MIN_PX);

// Boss health bar label
fontSize = Math.max(baseSize * scaleFactor, BOSS_LABEL_MIN_PX);

// Titles and banners (game over, stage clear, boss warning)
fontSize = baseSize * scaleFactor; // no floor needed
```

Update font size via Phaser text `setFontSize()` or by setting `style.fontSize`.

**Margin and position scaling:**

Fixed-pixel X margins (e.g., 10px from left for score/lives/currency) should also
scale by the clamped factor. Y positions that already use percentage-based placement
(e.g., `height * 0.35`) need no change.

### Files to touch

Modify:
- `packages/game/src/systems/HudManager.ts`:
  - Store base font sizes as constants or instance properties
  - Compute clamped scale factor from display size
  - Subscribe to Scale Manager resize event to recompute
  - Apply scaled font sizes with pixel floors to all text elements
  - Scale X margins (10px base for score/lives/currency)
  - Do NOT scale debug overlay (11px) — it stays fixed

- `packages/game/src/systems/BossManager.ts`:
  - Apply same clamped scale factor to:
    - Warning banner text (36px base)
    - Boss name during warning (20px base)
    - Boss name on health bar (12px base — apply BOSS_LABEL_MIN_PX floor)
    - Health bar dimensions if they use fixed pixel sizes
  - Subscribe to same resize event, or receive scale factor from a shared source

- `packages/game/src/systems/CombatFeedback.ts` (if it exists — the plan references it):
  - Check `window.matchMedia('(prefers-reduced-motion: reduce)')` at create time
  - If reduced motion preferred: disable or minimize screen shake intensity
  - Scale shake magnitude by inverse of display scale factor for physical consistency:
    `shakeMagnitude = baseShake / scaleFactor` (smaller screen = amplify shake so it's
    physically perceptible; larger screen = dampen so it's not excessive)
  - If CombatFeedback doesn't exist as a named system, find where screen shake is
    implemented and apply there

### Constraints

- Only modify files in `packages/game/`
- Do NOT scale the debug overlay (DebugOverlay.ts, 11px) — it is developer-facing
- Do NOT change world coordinates, spawn positions, collision boxes, or gameplay logic
- Scale factor constants must be named, not magic numbers
- The scale factor computation should be in one place (either a utility function or
  HudManager) and shared — do not duplicate the formula across files
- Test at reference size (800×600 display): all text should render at exactly its
  base size (factor 1.0, no clamping, no floors active)

### Expected outcomes at key devices

Use this table to verify your implementation is correct:

| Device | Display (landscape) | Raw Factor | Clamped | 16px HUD → | 14px Wave → | 12px Boss → | 40px Title → |
|---|---|---|---|---|---|---|---|
| iPhone SE | 568×320 | 0.533 | 0.6 | 10px | 10px | 9px | 24px |
| iPhone 15 | 844×390 | 0.65 | 0.65 | 10.4px | 10px | 9px | 26px |
| Pixel 8 | 960×432 | 0.72 | 0.72 | 11.5px | 10.1px | 9px | 28.8px |
| iPad mini | 1024×683 | 1.0 | 1.0 | 16px | 14px | 12px | 40px |
| iPad Air | 1366×1024 | 1.28 | 1.28 | 20.5px | 17.9px | 15.4px | 51.2px |
| Desktop ref | 800×600 | 1.0 | 1.0 | 16px | 14px | 12px | 40px |

### Acceptance criteria

- [ ] At 800×600 display, all text renders at original base sizes (no visual change from
      pre-PR-4 behavior — this is the desktop parity check)
- [ ] At 568×320 display (iPhone SE), persistent HUD text is no smaller than 10px
- [ ] At 568×320 display, boss health bar label is no smaller than 9px
- [ ] At 1366×1024 display (iPad Air), title text does not exceed ~52px (1.5× ceiling)
- [ ] Scale factor recomputes on window resize (test by resizing browser window)
- [ ] `prefers-reduced-motion: reduce` disables or minimizes screen shake
- [ ] Debug overlay (11px) is unchanged regardless of display size
- [ ] Named constants, no magic numbers
- [ ] `pnpm validate` passes

### Done signal

Report: files changed, where the scale factor computation lives (file + function name),
the constants defined, any surprises in BossManager or CombatFeedback structure,
whether shake scaling was implemented (and where), any deviations from spec.
```

### Task 4.2 — Scaling Unit Tests (after 4.1)

```markdown
## Task: Unit tests for HUD scale factor computation and pixel floors

**Agent:** test-runner
**Branch:** feat/mobile-hud-scaling
**PR:** PR-4
**Depends on:** Task 4.1 complete

### Context

PR-4 adds display-size-dependent scaling to HUD and boss text. Tests must verify
the scale factor math, clamping, and per-element pixel floors at the five reference
device sizes from Decision 6.

### Files to touch

Create test file(s) in `packages/game/`:

**Scale factor computation tests:**
- Input (568, 320) → raw 0.533 → clamped 0.6
- Input (844, 390) → raw 0.65 → clamped 0.65
- Input (960, 432) → raw 0.72 → clamped 0.72
- Input (1024, 683) → raw 1.0 → clamped 1.0
- Input (1366, 1024) → raw 1.28 → clamped 1.28
- Input (800, 600) → raw 1.0 → clamped 1.0 (desktop reference)
- Input (3000, 2000) → raw 3.33 → clamped 1.5 (ceiling test)
- Input (400, 200) → raw 0.333 → clamped 0.6 (floor test)

**Pixel floor tests:**
- 16px base at factor 0.6 → max(9.6, 10) = 10 (floor active)
- 14px base at factor 0.6 → max(8.4, 10) = 10 (floor active)
- 12px base at factor 0.6 → max(7.2, 9) = 9 (boss label floor active)
- 40px base at factor 0.6 → 24 (no floor, just factor)
- 16px base at factor 1.0 → 16 (no floor needed)
- 16px base at factor 1.5 → 24 (ceiling, no floor)

**Reduced motion tests (if testable):**
- Verify shake magnitude changes when prefers-reduced-motion is active
  (may require mocking window.matchMedia)

### Constraints

- Test the computation functions, not the Phaser rendering
- If the scale factor computation is a pure function (it should be), test it directly
- If it's embedded in HudManager, extract the math into a testable utility or test via
  the HudManager interface
- Do not modify implementation files

### Acceptance criteria

- [ ] All five reference device sizes produce expected clamped factors
- [ ] Floor and ceiling edge cases are covered
- [ ] Pixel floor logic is verified for HUD text and boss label separately
- [ ] `pnpm validate` passes

### Done signal

Report: test file path, test count, whether the scale factor function was directly
testable or required extraction, any mocking needed.
```

### PR-4 pre-merge verification

1. **Full gate:** `pnpm validate` + `pnpm test:e2e`
2. **Desktop parity at 800×600:** Open `/play` in a browser window sized to 800×600 (or close to it). All HUD text should look identical to pre-PR-4. This is the most important check — PR-4 must not change the desktop experience.
3. **Simulated small screen:** Resize the browser window to approximately 568×320 (iPhone SE landscape). HUD text should still be readable — no text smaller than ~10px. Titles should be smaller but legible.
4. **Simulated large screen:** Resize to approximately 1366×1024. Text should be larger but not absurdly oversized.
5. **Boundary check:** Only `packages/game/` files modified.

---

## 5. PR-4 and PR-5 Overlap Opportunity

Once PR-4's task 4.1 is complete and verified (but before 4.2 tests are done), you can begin PR-5 shell work in parallel. PR-5's `svelte-shell` tasks (GameOverlay, responsive CSS, UI touch targets) touch `apps/web/` and `packages/ui/` — completely disjoint from PR-4's `packages/game/` work. The dependency graph allows:

```
PR-4 task 4.1 (phaser-integrator) ──→ PR-4 task 4.2 (test-runner)
                                              ↓
                                        PR-4 land
        ↕ (parallel — different packages)
PR-5 task 5.1 (svelte-shell: overlay)
PR-5 task 5.2 (svelte-shell: responsive CSS) ──→ PR-5 task 5.3 (test-runner)
                                                         ↓
                                                   PR-5 land
```

Both PR branches are created from the same main (post-PR-3). They don't conflict because they touch different files. Land PR-4 first (it's smaller), then rebase PR-5 onto updated main and land.

Do not start PR-5 dispatch until the diagnostician has reported back on the visibility-change issue (Fix 2 above). If it's P0, PR-5's lifecycle expansion work needs to account for the fix.

---

## 6. Looking Ahead — Phase B Completion

After PR-4 and PR-5 merge, Phase B (Physically usable) is complete. The Phase B signoff criteria from the plan (§15):

- [ ] All interactive elements meet 44×44pt minimum touch target on iPhone SE
- [ ] Settings changeable at runtime without remounting game
- [ ] HUD text readable on both iPhone SE and iPad without being oversized on either
- [ ] Settings page usable on 320px-wide screen
- [ ] `prefers-reduced-motion` reduces shake and transition intensity

Items 2 and 5 are partially done (PR-3 delivered runtime settings, PR-4 will handle reduced motion for shake). Items 1, 3, and 4 depend on PR-5's responsive CSS and touch target work.

After Phase B signoff, the decision point: proceed to Phase C (PWA polish — service worker, Wake Lock, haptics, performance profiling) or defer it. Phase C is explicitly non-critical in the plan. If the game is playable and comfortable on mobile after Phase B, shipping without Phase C is a valid choice.
