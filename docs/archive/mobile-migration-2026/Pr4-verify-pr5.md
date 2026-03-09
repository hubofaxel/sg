# PR-4 Landed — Device Strategy Integration and PR-5 Dispatch

---

## 1. Push

Same as last time. Four PRs of gated work on local main.

```bash
git push origin main
```

---

## 2. Diagnostician Report — Status Check

The previous directive dispatched `diagnostician` to triage the visibility-change pause unsteadiness before PR-5 dispatch. PR-5 includes lifecycle expansion work (the GameOverlay pause button, which calls `handle.pause()`) that could interact with whatever that issue is.

**If the diagnostician has reported back:** Apply the severity classification. P0 blocks PR-5. P1 gets scheduled as a fix task within PR-5. P2 defers to Phase C.

**If the diagnostician has not reported back:** Dispatch PR-5 anyway, but with a constraint amendment — Task 5.1 (GameOverlay) must not add a `pagehide` listener or expand lifecycle handling until the visibility-change issue is characterized. The overlay pause button (which calls the existing `handle.pause()` path) is safe to ship regardless, because it uses the same code path that already works for `visibilitychange`. The risk is in *adding new lifecycle listeners* that might compound an existing timing problem.

---

## 3. Device Strategy — Impact Assessment

The device/browser strategy document is thorough research. Most of it confirms decisions already made. Here is what actually changes implementation work versus what is already covered.

### Already covered — no action needed

| Concern | Where it's handled |
|---|---|
| Safe areas (`viewport-fit=cover`, `env(safe-area-inset-*)`) | PR-1 shipped |
| Dynamic viewport units (`100dvw`/`100dvh`) | PR-1 shipped |
| No UA sniffing | Platform Capability Policy in mobile-adaptation.md, enforced in Decision 2 |
| Capability detection for touch | Decision 2: `'ontouchstart' in window \|\| navigator.maxTouchPoints > 0` |
| Landscape orientation via overlay, not lock | Decision 7: overlay + game pause, no `screen.orientation.lock()` |
| `beforeinstallprompt` not on iOS | Phase C scope — not yet implemented, no wrong assumptions to undo |
| Installed-mode storage durability | Phase C scope — service worker not yet implemented |

### Requires verification — quick checks against shipped code

These are things the device strategy raises that should be true but haven't been explicitly validated:

**1. Frame-rate independence (120Hz consideration)**

The device strategy correctly notes that flagship phones are now 120Hz. The game must use delta-time for movement, not frame-count.

Check: does `GameScene.update(time, delta)` pass `delta` to movement calculations? The `InputIntent` adapter returns a normalized move vector, but the velocity application in GameScene needs to multiply by `delta` (or Phaser's physics system needs to be handling this internally). If movement is `velocity = PLAYER_SPEED` set directly on the physics body, Phaser's Arcade Physics handles frame-rate independence internally via its own delta accumulator. If movement is manually applied per frame (`x += speed`), it's frame-rate dependent and will run 2× fast at 120Hz.

**Action:** Before dispatching PR-5, have `phaser-integrator` (or `diagnostician` as a read-only check) confirm one of:
- Phaser Arcade Physics is handling movement via `body.setVelocity()` (frame-rate independent by engine design), OR
- Manual position updates use `delta` parameter from `update(time, delta)`

If neither is true, this is a **P0 bug** that must be fixed before shipping to 120Hz devices. It predates mobile work but mobile makes it user-facing. File it as a separate fix, not part of PR-5.

**2. Dynamic Island clearance in landscape**

iPhone 17 Pro/Pro Max have the Dynamic Island, which in landscape creates an asymmetric safe area inset on one side. PR-1 applied `env(safe-area-inset-*)` padding to the game container parent. This should handle it — but only if the padding is applied on the correct element and the game canvas isn't overflowing it.

**Action:** No code change needed. Add to the real-device QA checklist: "Verify game canvas does not render under the Dynamic Island in landscape on iPhone 17 Pro class."

**3. Safari 26 frozen UA string**

Safari 26 freezes the OS version in the UA string. The codebase has zero UA parsing (confirmed in Decision 2 context brief), so this has no impact. Noting it for the record only.

### Requires addition to planning documents

**4. Platform target matrix — add to docs**

The device strategy provides a concrete target matrix that should be recorded as a project artifact. This is reference material for QA, not an implementation change.

**File to create:** `docs/mobile-target-matrix.md`

Contents — adapt from the device strategy document's recommended sections A through F, condensed to the facts that affect implementation. Specifically:

```markdown
# Mobile Target Matrix

## Runtime families

| Class | Platform | Browser | Install path | Debug tool |
|---|---|---|---|---|
| A | Android 16 (Pixel 10, Galaxy S26 class) | Chrome | PWA via WebAPK | Chrome DevTools |
| B | iOS 26 (iPhone 17 family) | Safari | Home Screen web app | Safari Web Inspector |
| C | iOS 26 (iPhone 17 family) | Chrome | Browser play only | Limited (WebKit engine) |

## Reference devices

| Category | Devices | Screen class | Use for |
|---|---|---|---|
| Android compact | Pixel 10, Galaxy S26 | 6.3" | Thumb reach, HUD scaling, touch targets |
| Android large | Pixel 10 Pro XL, Galaxy S26 Ultra | 6.8-6.9" | HUD oversizing, thermal stability |
| iPhone compact | iPhone 17, 17 Pro | 6.3" | Safe areas, Dynamic Island, Safari PWA |
| iPhone large | iPhone 17 Pro Max | 6.9" | Large-screen HUD, installed mode lifecycle |
| iPhone budget | iPhone 17e | Budget class | Performance floor |

## Policies

- **Performance:** 60fps guaranteed, 120Hz opportunistic. Frame-rate independent simulation.
- **Detection:** Runtime capability checks only. No UA-based platform gating.
- **Install:** Android Chrome is primary PWA path. Safari is primary iOS installed path. No beforeinstallprompt on iOS Chrome.
- **Storage:** Validate offline behavior in installed mode on iPhone (7-day eviction applies to non-installed sites).
- **Engine:** Target engine families (Chromium/Blink, WebKit), not device brands. Chrome on iPhone is WebKit-class, not Chromium-class.
```

**5. Phase C amendments**

The device strategy has direct consequences for PR-6 (Phase C) planning. When Phase C is eventually decomposed into tasks, these constraints apply:

- PWA install flow must be platform-branched: `beforeinstallprompt` for Android Chrome, "Add to Home Screen" guidance for Safari, no install prompt on iOS Chrome
- Service worker offline validation must be tested in Safari installed mode specifically (not just Safari tab mode) due to the 7-day eviction policy
- In-app browser detection should present "open in Chrome/Safari for best experience" messaging, not an install prompt
- Debugging workflow documentation should specify Chrome DevTools for Android and Safari Web Inspector for iOS

These do not affect PR-5. Record them in `docs/mobile-state.md` under a "Phase C Notes" section for when that work is dispatched.

**6. 120Hz performance budget — Phase C concern**

The device strategy recommends budgeting particles, screen shake, and post-processing as optional quality layers. This aligns with Phase C's "low-end mobile performance profiling" scope. No action now, but when Phase C task prompts are written, include: "Profile at both 60Hz and 120Hz. Verify `requestAnimationFrame` callback duration stays under 8.3ms on 120Hz devices. If it doesn't, identify which systems to throttle."

---

## 4. Update State Log

```markdown
## Current phase: B (Physically usable)
## Current PR: PR-5
## Branch: feat/mobile-overlay-responsive

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
| PR-3 | runtime-settings-bridge | phaser-integrator | ✅ | updateSettings(), registry changedata |
| PR-3 | settings-store-bridge | svelte-shell | ✅ | $effect wiring |
| PR-3 | bridge-verification | test-runner | ✅ | Runtime update tests |
| PR-3 | land | pr-shipper | ✅ | Merged to main at 3a06e46 |
| PR-4 | hud-scaling | phaser-integrator | ✅ | Clamped [0.6,1.5], pixel floors, reduced motion |
| PR-4 | scaling-tests | test-runner | ✅ | 19 new tests (345 total) |
| PR-4 | land | pr-shipper | ✅ | Merged to main at c0fa010 |

## Known Issues

| Issue | Severity | Discovered | Blocking? | Tracking |
|---|---|---|---|---|
| Visibility-change pause unsteadiness | TBD | PR-3 | Awaiting diagnostician | docs/mobile-state.md |
| Frame-rate independence unverified | TBD | PR-4 checkpoint | Verify before 120Hz devices | — |

## Phase C Notes

- PWA install: Android Chrome (beforeinstallprompt) vs Safari (Home Screen guidance) vs iOS Chrome (no install prompt)
- Offline: validate in Safari installed mode (7-day eviction for non-installed)
- Performance: profile at 60Hz and 120Hz, rAF budget 8.3ms at 120Hz
- Debugging: Chrome DevTools for Android, Safari Web Inspector for iOS
```

---

## 5. Dispatch PR-5: Mobile DOM Overlay + Shell Polish

PR-5 is entirely `svelte-shell` domain (`apps/web/` and `packages/ui/`). It does not touch `packages/game/`. This is the last PR before Phase B signoff.

### Task 5.1 — GameOverlay Component

```markdown
## Task: Build mobile DOM overlay with pause and mute controls

**Agent:** svelte-shell
**Branch:** feat/mobile-overlay-responsive (create from main after PR-4 merge)
**PR:** PR-5
**Depends on:** PR-4 merged to main

### Context

The mobile plan (§7) calls for a thin DOM overlay positioned over the game canvas
for mobile-only chrome: pause button, mute toggle. This overlay communicates with
the game via GameHandle — shell-authoritative pause (Decision 4). The overlay is
event-driven, not per-frame.

### Skills to load

Load `.claude/skills/mobile-adaptation/SKILL.md` — pause model, boundary rules.
Load `.claude/skills/sveltekit-phaser-seam/SKILL.md` — GameHandle interface, lifecycle.

### Files to touch

Create:
- `apps/web/src/lib/components/GameOverlay.svelte` — Svelte 5 component:
  - Positioned absolutely over the game canvas (use CSS `position: absolute`,
    `inset: 0`, `pointer-events: none` on the container, `pointer-events: auto`
    on individual buttons)
  - **Pause button:** top-right corner, respects safe area insets
    (`top: env(safe-area-inset-top)`, `right: env(safe-area-inset-right)`).
    Calls `handle.pause()` on tap. When paused, shows a resume button (or
    overlays a "Paused" state with a resume tap target). Calls `handle.resume()`
    on resume.
  - **Mute toggle:** near the pause button. Reads current mute state from
    settings store. On tap, toggles `masterVolume` between 0 and the previous
    non-zero value (or a default like 0.8). Writes to the settings store, which
    propagates via the $effect bridge from PR-3.
  - All buttons must meet **44×44px minimum touch target** (use `min-width` and
    `min-height`, with padding to extend the tap region beyond the visible icon
    if needed)
  - Use Tailwind 4 for styling
  - Use Svelte 5 runes ($state, $derived, $effect)
  - Accessible: `aria-label` on buttons ("Pause game", "Resume game",
    "Mute audio", "Unmute audio"), `role="toolbar"` on the overlay container
  - SSR-safe: the component renders conditionally when game is mounted
    (guard on `handle` existence)
  - **Do NOT add `pagehide` listener or expand lifecycle handling.** The
    visibility-change issue from PR-3 is still being triaged. The pause button
    uses the existing `handle.pause()` path, which is safe.

Modify:
- `apps/web/src/routes/play/+page.svelte` — mount GameOverlay alongside
  GameCanvas and RotateOverlay. Pass `handle` and settings store as props
  (or use Svelte context if the component tree warrants it).

### Constraints

- Only modify files in `apps/web/`
- Do not import from `packages/game/` — interact only through GameHandle
- Overlay must not intercept pointer events meant for the game canvas
  (pointer-events: none on container, auto on buttons only)
- No per-frame polling or animation loops in the overlay
- Pause state lives in a local $state variable in the overlay — the overlay
  knows it paused because it sent the command. It does not query game state.

### Acceptance criteria

- [ ] Pause button visible in top-right corner, clears Dynamic Island / notch area
- [ ] Tapping pause pauses the game (verified: canvas freezes, no input processed)
- [ ] Tapping resume resumes the game
- [ ] Mute toggle mutes and unmutes audio
- [ ] Buttons meet 44×44px minimum touch target
- [ ] Overlay does not intercept game canvas pointer events (gameplay unaffected)
- [ ] Overlay renders correctly alongside RotateOverlay (no z-index fights)
- [ ] SSR renders without error (component guards on handle existence)
- [ ] `pnpm validate` passes

### Done signal

Report: files changed, component prop interface, how pause state is tracked,
how mute toggle interacts with settings store, z-index strategy relative to
RotateOverlay, any accessibility considerations beyond what was specified.
```

### Task 5.2 — Responsive Shell Pages and UI Touch Targets

```markdown
## Task: Responsive CSS, touch targets, and UI component fixes

**Agent:** svelte-shell
**Branch:** feat/mobile-overlay-responsive
**PR:** PR-5
**Depends on:** Can run concurrently with Task 5.1 (different files)

### Context

The shell pages and UI components have zero responsive CSS (§5, §6 of the plan).
Font sizes are fixed px, settings grid doesn't adapt, slider thumbs are 16px
(below 44px minimum), and prefers-reduced-motion is not honored in shell transitions.

### Skills to load

Load `.claude/skills/mobile-adaptation/SKILL.md` for boundary rules and scaling context.

### Files to touch

Modify:
- `apps/web/src/app.css` — add base responsive rules:
  - Custom properties for safe area insets (for reuse across components):
    `--safe-top: env(safe-area-inset-top, 0px)` etc.
  - `prefers-reduced-motion: reduce` media query: disable or shorten CSS
    transitions globally (`*, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }` or similar)
  - Base responsive type scale if appropriate

- `apps/web/src/routes/+page.svelte` (home page):
  - Replace fixed 48px heading with `clamp(1.5rem, 4vw + 1rem, 3rem)` or similar
  - Replace fixed 240px nav column width with responsive sizing
    (flex-wrap, or stack vertically below a breakpoint)
  - Ensure nav buttons meet 44px minimum touch target

- `apps/web/src/routes/settings/+page.svelte`:
  - Replace `grid-template-columns: 140px 1fr 50px` with a responsive grid
    that stacks or reflows on narrow screens (below ~480px, stack label above
    control)
  - Slider thumbs: increase to 44px minimum. Use CSS:
    ```css
    input[type="range"]::-webkit-slider-thumb { width: 44px; height: 44px; }
    input[type="range"]::-moz-range-thumb { width: 44px; height: 44px; }
    ```
  - Font sizes: replace fixed 13px labels with `clamp(0.75rem, 2vw, 1rem)`
  - Ensure the page is usable at 320px width (iPhone SE portrait for settings
    access — settings page is not landscape-locked)

- `packages/ui/src/Button.svelte`:
  - Add `min-height: 44px` to ensure touch target compliance
  - Increase padding if needed to make the 44px feel intentional, not stretched

- `packages/ui/src/Modal.svelte`:
  - Change `min-width: 280px` to `min-width: min(280px, 90vw)` to prevent
    overflow on very narrow viewports

### Constraints

- `apps/web/` and `packages/ui/` only
- Use Tailwind 4 utility classes where they suffice; use `<style>` blocks
  for complex responsive rules (slider thumb pseudo-elements can't be done
  in Tailwind classes)
- Do not break desktop appearance — responsive rules should enhance mobile
  without regressing desktop. Use min-width media queries (mobile-first) or
  clamp() which scales gracefully across all sizes.
- Test at 320px width (iPhone SE portrait), 568px width (iPhone SE landscape),
  and 1024px+ (desktop) to verify no breakage at either extreme

### Acceptance criteria

- [ ] Home page readable and navigable at 320px width
- [ ] Settings page usable at 320px width (labels visible, sliders operable)
- [ ] All slider thumbs are at least 44×44px
- [ ] All buttons (packages/ui Button) are at least 44px tall
- [ ] Modal does not overflow on 320px screen
- [ ] `prefers-reduced-motion: reduce` disables CSS transitions
- [ ] Desktop appearance is not regressed (verify at 1024px+)
- [ ] No horizontal scroll at any supported width
- [ ] `pnpm validate` passes

### Done signal

Report: files changed, responsive breakpoints used (if any media queries added),
clamp() ranges chosen, any components that couldn't meet 44px without visual
compromise (and the tradeoff made), prefers-reduced-motion implementation approach.
```

### Task 5.3 — E2e and Responsive Verification (after 5.1 and 5.2)

```markdown
## Task: E2e tests for overlay and responsive layout

**Agent:** test-runner
**Branch:** feat/mobile-overlay-responsive
**PR:** PR-5
**Depends on:** Tasks 5.1 and 5.2 complete

### Skills to load

Load `.claude/skills/browser-debugging/SKILL.md` — Playwright mobile emulation,
viewport simulation, device presets.

### Files to touch

Create or extend tests in `apps/web/tests/`:

**Overlay tests:**
- Play page has overlay container element present
- Pause button has aria-label and meets size requirement (check computed
  min-width/min-height >= 44px)
- Mute button has aria-label and meets size requirement

**Responsive tests:**
- Settings page at 320px width: no horizontal overflow
  (`page.evaluate(() => document.documentElement.scrollWidth <= 320)`)
- Home page at 320px width: no horizontal overflow
- Button components have min-height >= 44px (spot-check one button)
- Slider thumbs — harder to test via Playwright; skip or verify via
  computed styles if feasible

**Orientation integration:**
- At 375×667 (portrait): rotate overlay visible, game overlay not visible
  (or behind rotate overlay)
- At 667×375 (landscape): rotate overlay absent, game overlay visible
- Dynamic resize: portrait → landscape → portrait — overlays toggle correctly

### Constraints

- Do not modify implementation files
- Use Playwright viewport emulation (not real devices)
- Test file naming: `mobile-overlay.spec.ts` or extend `mobile-shell.spec.ts`

### Acceptance criteria

- [ ] Overlay element presence verified
- [ ] Touch target sizes verified (44px minimum)
- [ ] No horizontal overflow at 320px on settings and home pages
- [ ] Orientation overlay interaction verified (portrait/landscape toggle)
- [ ] Existing e2e tests pass (no regressions)
- [ ] `pnpm validate` + `pnpm test:e2e` pass

### Done signal

Report: test files created/modified, test count delta, any tests that were
infeasible (and why), any flaky observations.
```

### PR-5 pre-merge verification

1. **Full gate:** `pnpm validate` + `pnpm test:e2e`
2. **Desktop visual check:** Open `/`, `/play`, `/settings` at 1024px+ width. Nothing should look different from pre-PR-5. The responsive rules must enhance mobile without regressing desktop.
3. **Narrow viewport check:** Open `/settings` at 320px width in Chrome DevTools device mode. Page should be usable — labels visible, sliders operable, no horizontal scroll.
4. **Overlay check:** Open `/play` at a landscape mobile viewport. Pause button should be visible in top-right, not overlapping game content. Tap pause (click in DevTools) — canvas should freeze. Tap resume — game continues.
5. **Overlay + rotate overlay interaction:** Switch to portrait viewport — rotate overlay should appear *over* the game overlay (higher z-index or replacing it). Switch back to landscape — game overlay returns, rotate overlay gone.
6. **Boundary check:** Files in `apps/web/` and `packages/ui/` only. No `packages/game/` modifications.

---

## 6. After PR-5 — Phase B Signoff

Once PR-5 merges, check off Phase B acceptance criteria from the plan (§15):

| Criterion | Delivering PR | Status |
|---|---|---|
| All interactive elements meet 44×44pt on iPhone SE | PR-5 | Verify |
| Settings changeable at runtime without remount | PR-3 | ✅ |
| HUD text readable on iPhone SE and iPad | PR-4 | ✅ |
| Settings page usable on 320px screen | PR-5 | Verify |
| `prefers-reduced-motion` reduces shake and transitions | PR-4 (shake) + PR-5 (transitions) | Verify |

**If all criteria pass:** Phase B is complete. The game is playable and comfortable on mobile. Phase A delivered the infrastructure (shell, input, settings), Phase B delivered the usability layer (HUD scaling, responsive CSS, overlay, touch targets).

**The next decision is whether to proceed to Phase C or ship.** Phase C (PR-6) covers PWA polish: service worker, offline play, Wake Lock, haptics, install flow, performance profiling. It is explicitly non-critical in the plan. The device strategy document adds weight to Phase C for iOS specifically (installed-mode storage durability, Safari Home Screen as strategic goal), but the game is fully playable without it.

**Recommendation:** Create `docs/mobile-target-matrix.md` from the device strategy document (content outlined in Section 3 above) and commit it regardless of the Phase C decision. It's reference material that informs QA and future work. The Phase C decision itself can wait until after you've tested on a real device with Phase B complete.

---

## 7. Frame-Rate Independence — Parallel Quick Check

This is not part of PR-5 but should be resolved before any real-device testing on 120Hz hardware. Dispatch as a read-only investigation:

```markdown
## Task: Verify frame-rate independence of game simulation

**Agent:** diagnostician
**Branch:** main (read-only)
**Depends on:** None

### Context

Target devices include 120Hz displays (Pixel 10, Galaxy S26, iPhone 17 Pro).
requestAnimationFrame follows display refresh rate, so the game's update loop
may run at 120fps on these devices. Movement, spawning, and timers must be
delta-time-based, not frame-count-based.

### Investigation

1. How does GameScene.update() apply player movement from InputIntent?
   - If via `body.setVelocity()`: Arcade Physics handles delta internally — safe.
   - If via manual `x += speed`: frame-rate dependent — P0 bug.

2. How do enemy movement, spawning timers, and wave delays work?
   - Phaser `time.delayedCall()` and tweens are time-based — safe.
   - Manual frame counters (`this.counter++; if (counter > 60)`) — frame-rate dependent.

3. How does the firing cooldown work?
   - `time - lastFired >= cooldownMs` with `time` from update() — safe (real time).
   - Frame counting — frame-rate dependent.

4. Are there any `setInterval` or `setTimeout` used for gameplay timing?

### Done signal

Report: classification per system (safe / frame-rate-dependent), specific file
and line references for any frame-dependent code, severity (P0 if movement is
affected, P1 if only minor systems like particles).
```

If this comes back clean (likely — Phaser Arcade Physics uses velocity-based movement internally), no action needed. If it finds frame-dependent code, schedule a fix before real-device 120Hz testing.
