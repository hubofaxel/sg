# Mobile Layout — Unified Cleanup and Implementation

Single directive covering: removal of stale patterns from three layout iterations, orientation of all project context toward the gutter architecture, and implementation of the gutter layout with relative touch input.

**This is the authoritative mobile layout plan. It supersedes all previous layout documents.**

---

## 1. The Problem: Three Conflicting Patterns

The project has been through three layout approaches:

| Iteration | Approach | Status | Artifacts left behind |
|---|---|---|---|
| **V1: Fixed 4:3** | 800×600 world, FIT mode, letterbox. "Never call setGameSize()" | Shipped in PRs 1-5 | TouchInput on canvas left half, GameOverlay as canvas overlay, mobile-adaptation.md §1 non-goals, skills referencing fixed-world model |
| **V2: EXPAND mode** | Dynamic world size, safe zone abstraction, system-by-system migration | Planned, never executed, withdrawn | ASPECT-RATIO-MIGRATION.md, ASPECT-RATIO-DISPATCH.md, potential content audit dispatch |
| **V3: Gutter architecture** | 800×600 stays, CSS flex gutters as control surfaces, DOM-based touch input | Correct approach, not yet implemented | GUTTER-LAYOUT-PLAN.md, GUTTER-DISPATCH.md |

Agents reading the project context will encounter all three. The mobile-adaptation skill says "setGameSize() is for changing the underlying game world, which we do not do." The withdrawn migration plan says "setGameSize() is now intentional and correct." The gutter plan agrees with V1 that the world stays 800×600 but for a completely different reason (gutters absorb the aspect ratio difference, not letterboxing).

**This directive resolves all conflicts in one PR.**

---

## 2. What Gets Cleaned, What Stays, What's New

### Shipped code changes (cleanup of V1 patterns that conflict with V3)

| File | Current state (V1) | Change | Reason |
|---|---|---|---|
| `TouchInput.ts` | Listens on Phaser canvas, joystick in left half (`x < gameSize.width / 2`) | Accept optional `touchZone: HTMLElement`. If provided, listen on the DOM element instead of the canvas. If not provided (fallback), retain current canvas-based behavior. | Velocity joystick should use the left gutter when available, keeping all touch input off the gameplay canvas. |
| `GameOverlay.svelte` | Positioned absolutely over canvas with pointer-events juggling | Delete entirely. Controls relocate to right gutter. | Canvas overlay was a workaround for V1's lack of dedicated control surfaces. Gutters make it unnecessary. |
| `play/+page.svelte` | Full-viewport single element: canvas + overlays | Replace with three-panel flex layout: left gutter + canvas container + right gutter. RotateOverlay stays as full-screen overlay on top of everything. | The play page layout is the core structural change. |
| `GameCanvas.svelte` | `touch-action: none` on `.game-container` | Keep `touch-action: none` on the game container (needed for in-canvas prompts). Left gutter also gets `touch-action: none` (set in the shell). | Both surfaces need gesture prevention but for different reasons. |

### Planning document cleanup

| Document | Action |
|---|---|
| `ASPECT-RATIO-MIGRATION.md` | Delete or move to `docs/withdrawn/`. It was never executed and its approach is wrong. |
| `ASPECT-RATIO-DISPATCH.md` | Delete or move to `docs/withdrawn/`. |
| `GUTTER-LAYOUT-PLAN.md` | Promote to the canonical layout reference. Move to `docs/mobile-gutter-layout.md` (or equivalent project location). |
| `GUTTER-DISPATCH.md` | Consumed by this directive. Can be archived after PR-7 ships. |
| `mobile-adaptation.md` | Update §1 (Architectural Foundation) and §3 (Input Intent System) — see §3 below. |
| `docs/mobile-state.md` | Update with withdrawn items, current phase, current approach. |
| `docs/mobile-decisions.md` | Decision 6 (HUD scaling) stays valid. Add a note that scaling references the fixed 800×600 world, which is unchanged by the gutter architecture. |

### Skill and agent context cleanup

| File | Action |
|---|---|
| `.claude/skills/mobile-adaptation/SKILL.md` | Update Three Size Domains section: add "Gutter size" as a fourth concept. Update Input Intent section: document RelativeTouchInput and gutter-based input. Remove any "never call setGameSize()" language (it was V1 dogma; the gutter approach simply doesn't need it, which is different from prohibiting it). |
| `.claude/skills/sveltekit-phaser-seam/SKILL.md` | Add gutter layout pattern: flex row, touchZone element passing, control relocation from overlay to gutter. |
| `.claude/agents/phaser-integrator.md` | Add note: touch input may use DOM elements passed via GameMountOptions.touchZone. This is not a boundary violation — HTMLElement is a platform type. |
| `.claude/agents/svelte-shell.md` | Add note: play page uses three-panel gutter layout. Left gutter is the touch control zone. Right gutter holds game controls. GameOverlay is deleted. |

### New code

| File | Purpose |
|---|---|
| `packages/game/src/systems/RelativeTouchInput.ts` | DOM-based relative tracking adapter |
| `packages/game/src/systems/InputIntent.ts` | Add `isPositionDelta: boolean` |
| `packages/game/src/scenes/GameScene.ts` | Position-delta branch, touchZone acceptance, touchStyle selection |
| `packages/game/src/types.ts` | `touchZone?: HTMLElement`, `touchStyle?: string` in settings |
| `packages/game/src/mountGame.ts` | Store touchZone and touchStyle in registry |
| `packages/contracts/src/settings/settings.schema.ts` | `touchStyle: 'relative' \| 'joystick'` |
| `apps/web/src/routes/play/+page.svelte` | Three-panel flex layout |
| `apps/web/src/routes/play/` or `src/lib/components/` | Right gutter controls (pause, mute) |

---

## 3. Amendments to mobile-adaptation.md

These sections need targeted updates to eliminate V1 dogma and orient the document toward the gutter architecture. The rest of the document (lifecycle, settings bridge, PWA, etc.) is unaffected.

### §1 Architectural Foundation — Three Size Domains → Four

Replace or amend the table:

| Domain | Owner | Definition |
|---|---|---|
| **World size** | Phaser | Fixed 800×600 game coordinate space. All gameplay logic operates here. Never changes. |
| **Display size** | Phaser Scale Manager | Physical pixel dimensions of the rendered canvas. FIT mode scales 800×600 to fit the canvas container while preserving 4:3. |
| **Shell size** | SvelteKit / CSS | Browser viewport and DOM layout. Owns the three-panel gutter layout, safe areas, orientation overlays. |
| **Gutter size** | SvelteKit / CSS | The space between the canvas container and the viewport edges. On wide screens (~20:9), gutters are ~20% of screen width each. On 4:3 screens, gutters collapse to zero. Gutters are the touch control surface — left for movement, right for abilities. Determined entirely by CSS flex layout, not by JavaScript measurement. |

**Remove the "non-goals" list item:** "No adaptive gameplay world per device class" — this was V1 framing. The gutter architecture doesn't adapt the gameplay world either, but for the right reason (gutters absorb the aspect ratio difference) rather than as a prohibition.

**Remove or soften:** "setGameSize() is for changing the underlying game world, which we do not do" — the gutter approach doesn't call setGameSize(), but the prohibition was V1 dogma. Replace with: "The game world is 800×600. setGameSize() is not needed because the gutter layout absorbs aspect ratio differences at the CSS level."

### §3 Input Intent System — Add gutter-based touch

Add after the existing TouchInput section:

**`RelativeTouchInput.ts`** — DOM-based relative position tracking adapter. Listens on the left gutter DOM element (passed via `GameMountOptions.touchZone`), not on the Phaser canvas. On `pointerdown`, records anchor position. On `pointermove`, accumulates screen-pixel delta. `update()` converts to world-coordinate delta using scale factor (`gameSize / displaySize`) and emits `InputIntent` with `isPositionDelta: true`. GameScene applies as direct position offset, not velocity. No dead zone, no max radius, no joystick visual. 1:1 finger-to-ship correspondence.

**`isPositionDelta`** — added to InputIntent. When true, GameScene applies moveVector as `player.x += moveVector.x` (clamped to bounds). When false (keyboard, velocity joystick), applies as velocity via `body.setVelocity()`.

**`touchStyle`** setting — `'relative' | 'joystick'`, default `'relative'`. Selects which touch adapter instantiates. Separate from `controlScheme` (which selects keyboard vs touch).

### §7 Mobile DOM Overlay — Replace with Gutter Controls

Replace the section about GameOverlay.svelte with:

Mobile controls live in the **right gutter** of the three-panel play page layout. The gutter is a standard Svelte component rendered in the DOM, not a canvas overlay. Controls include pause button, mute toggle, and reserved space for future secondary ability buttons. All controls use standard DOM accessibility (aria-labels, native focus). 44px minimum touch targets are trivially achievable in DOM without pointer-events juggling.

GameOverlay.svelte is deleted. The canvas-overlay approach was a V1 workaround for having no dedicated control surfaces. Gutters make it unnecessary.

---

## 4. Implementation Dispatch

### Branch: `feat/mobile-gutter-layout`

This is a single PR with cleanup and implementation interleaved. The commit sequence separates concerns cleanly.

### Phase 0 — Cleanup (before new code)

**Task 7.0a — Document cleanup (planning-agent or operator)**

```markdown
No agent dispatch needed — operator handles directly or planning agent executes.

Actions:
1. Delete or move to docs/withdrawn/:
   - ASPECT-RATIO-MIGRATION.md
   - ASPECT-RATIO-DISPATCH.md

2. Update mobile-adaptation.md:
   - §1: Four size domains table (add Gutter), remove V1 non-goals dogma
   - §3: Add RelativeTouchInput, isPositionDelta, touchStyle
   - §7: Replace GameOverlay section with gutter controls

3. Update docs/mobile-state.md:
   - Mark EXPAND migration as withdrawn
   - Set current PR to PR-7 (gutter layout)
   - Add withdrawn items table

4. Update docs/mobile-decisions.md:
   - Decision 6 (HUD scaling): add note that 800×600 world is unchanged

Commit: `docs(repo): clean up withdrawn layout plans, orient docs to gutter architecture`
```

**Task 7.0b — Skill and agent context update (planning-agent or operator)**

```markdown
Actions:
1. Update .claude/skills/mobile-adaptation/SKILL.md:
   - Add Gutter Size to the domains table
   - Add RelativeTouchInput to Input Intent section
   - Replace "never call setGameSize()" with neutral framing
   - Add gutter layout description

2. Update .claude/skills/sveltekit-phaser-seam/SKILL.md:
   - Add gutter layout pattern (flex row, touchZone passing)
   - Note GameOverlay.svelte is deleted, controls in gutters

3. Update .claude/agents/phaser-integrator.md:
   - Add: "Touch input may use DOM elements via GameMountOptions.touchZone"
   - Update GameHandle method list if needed

4. Update .claude/agents/svelte-shell.md:
   - Add: "Play page uses three-panel gutter layout"
   - Add: "GameOverlay.svelte is deleted"
   - Update route inventory if play page structure changed

Commit: `chore(config): update skills and agent definitions for gutter architecture`
```

### Phase 1 — Shell Layout (svelte-shell)

**Task 7.1 — Gutter layout + control relocation**

As specified in GUTTER-DISPATCH.md Task 7.1, with one addition:

**Delete `apps/web/src/lib/components/GameOverlay.svelte`.** Its functionality (pause, mute) moves to the right gutter. The RotateOverlay stays — it's a full-screen portrait overlay, orthogonal to the gutter layout.

If any component imports GameOverlay, update the import to remove it. If the play page mounts GameOverlay, remove that mount point and replace with inline right-gutter controls or a new `GutterControls.svelte` component.

Additional commit: `refactor(web): delete GameOverlay, relocate controls to right gutter`

### Phase 2 — Schema + Adapters (concurrent: schema-validator + phaser-integrator)

**Task 7.2 — touchStyle schema** (as specified in GUTTER-DISPATCH.md Task 7.2)

**Task 7.3 — RelativeTouchInput + GameScene changes** (as specified in GUTTER-DISPATCH.md Task 7.3)

With one addition for Task 7.3: **Migrate existing TouchInput.ts** to accept an optional `touchZone: HTMLElement` parameter. If provided, attach pointer listeners to the DOM element instead of using `this.input.on('pointerdown')` on the Phaser canvas. If not provided, fall back to current canvas-based behavior (backward compatibility for non-gutter contexts like tests or desktop).

This keeps the velocity joystick functional as a gutter-based control when the user selects `touchStyle: 'joystick'` in settings.

Additional commit: `refactor(game): migrate TouchInput to accept optional DOM touch zone`

### Phase 3 — Tests (test-runner)

**Task 7.4 — Tests** (as specified in GUTTER-DISPATCH.md Task 7.4)

With additions:
- Verify GameOverlay.svelte does not exist (import check or file-presence check)
- Verify no stale imports reference GameOverlay anywhere in `apps/web/`
- Verify `mobile-adaptation.md` §1 mentions four size domains (document consistency)

### Commit Sequence (full PR)

```
1. docs(repo): clean up withdrawn layout plans, orient docs to gutter architecture
2. chore(config): update skills and agent definitions for gutter architecture
3. feat(web): add three-panel gutter layout for play page
4. refactor(web): delete GameOverlay, relocate controls to right gutter
5. feat(contracts): add touchStyle setting
6. feat(game): add RelativeTouchInput adapter with DOM-based position tracking
7. refactor(game): add isPositionDelta branch to GameScene input handling
8. refactor(game): migrate TouchInput to accept optional DOM touch zone
9. test(game): add relative touch input and gutter layout tests
```

---

## 5. Verification

### Pre-merge checks

1. **Full gate:** `pnpm validate` + `pnpm test:e2e`

2. **No stale references sweep:**
   - `grep -r "GameOverlay" apps/web/src/` — should return zero results (deleted)
   - `grep -r "ASPECT-RATIO" docs/` — should only find withdrawn/ directory
   - `grep -r "SafeZone" packages/game/` — should return zero results (never created)
   - `grep -r "computeWorldSize" packages/game/` — zero results
   - `grep -r "setGameSize" packages/game/` — zero results (we don't call it)

3. **Desktop parity at 4:3:** Game looks and plays identically. Gutters invisible.

4. **Wide viewport (20:9):** Canvas centered, gutters styled, left gutter accepts touch, right gutter has controls, in-canvas prompts work.

5. **Resize and orientation:** Gutters resize fluidly. Portrait triggers rotate overlay over entire layout (including gutters).

6. **Document consistency:** mobile-adaptation.md, skills, and agent definitions all reference the gutter architecture. No references to EXPAND mode, SafeZone, or dynamic world sizing remain in active documents.

### Post-merge

Push to origin immediately. Update auto-memory with: "Mobile layout uses three-panel gutter architecture. World is 800×600 FIT. Gutters are CSS flex. Touch input is DOM-based (left gutter). GameOverlay deleted. RelativeTouchInput is the default touch adapter."

---

## 6. What the Project Looks Like After This PR

### The mental model for any agent entering the project:

**Desktop:** Keyboard input. Game canvas fills available space up to 4:3 aspect ratio. On wider monitors, subtle themed gutters flank the canvas. No functional purpose — purely aesthetic framing.

**Mobile (landscape):** Touch input. Three-panel layout: left gutter (movement), centered game canvas (gameplay), right gutter (controls). Left thumb on the left gutter for relative tracking (1:1 ship follow). Right thumb on the right gutter for pause, mute, future abilities. Neither thumb ever touches the gameplay canvas. Auto-fire handles weapons.

**Mobile (portrait):** Rotate overlay covers everything. Game paused.

**Tablet (4:3 landscape):** Gutters collapse. Touch input still works — the left gutter has zero CSS width but the gutter element still exists in the DOM. Touch adapter may need a fallback for this case: either (a) the gutter element has zero width but still captures touch events (CSS width doesn't affect pointer event capture with explicit dimensions), or (b) on 4:3 devices where gutters collapse, fall back to canvas-based touch input. **Flag this as a design decision for the agent:** verify that a zero-width flex child can still receive pointer events, or add a minimum gutter width (e.g., `min-width: 60px`) on touch-capable devices.

### One loose end to resolve:

**Tablet (4:3) touch input.** The gutter layout works perfectly for phones (where gutters are wide) and desktops (where keyboard input is used). But an iPad in landscape is approximately 4:3 — the gutters collapse, and there's nowhere for the touch zone. Options:

**(A)** Set a minimum gutter width on touch devices: `min-width: 60px` when `@media (pointer: coarse)`. This steals 120px of canvas display space on iPads but guarantees the touch zone exists. The canvas FIT mode handles the reduced container gracefully.

**(B)** Fall back to canvas-based touch input when gutters are below a width threshold. The existing TouchInput (velocity joystick) or a canvas-based relative tracker handles this case.

**(C)** Accept that iPads can use keyboard input (many iPad users have keyboards) and don't optimize the gutter experience for 4:3 touch devices.

**Recommendation:** Option A is the simplest and most consistent. A 60px gutter on each side of an iPad is small but functional, and the game canvas shrinks slightly (from 100% to ~88% of viewport width). The experience is slightly less immersive on iPad but the controls work everywhere without fallback logic. Include this in Task 7.1's implementation.

---

## 7. Cleanup Checklist

Use this after PR-7 merges to verify the project is fully coherent:

- [ ] `GameOverlay.svelte` does not exist
- [ ] No file imports `GameOverlay`
- [ ] `ASPECT-RATIO-MIGRATION.md` is in `docs/withdrawn/` or deleted
- [ ] `ASPECT-RATIO-DISPATCH.md` is in `docs/withdrawn/` or deleted
- [ ] `mobile-adaptation.md` §1 has four size domains including Gutter
- [ ] `mobile-adaptation.md` §3 documents RelativeTouchInput
- [ ] `mobile-adaptation.md` §7 describes gutter controls, not canvas overlay
- [ ] `mobile-adaptation.md` has no "never call setGameSize()" prohibition
- [ ] `.claude/skills/mobile-adaptation/SKILL.md` references gutter architecture
- [ ] `.claude/skills/sveltekit-phaser-seam/SKILL.md` references gutter layout pattern
- [ ] `.claude/agents/phaser-integrator.md` mentions touchZone DOM element
- [ ] `.claude/agents/svelte-shell.md` mentions three-panel layout, no GameOverlay
- [ ] `docs/mobile-state.md` has withdrawn items documented
- [ ] `docs/mobile-state.md` has current phase and PR correct
- [ ] No references to "SafeZone", "computeWorldSize", "EXPAND mode" in active documents
- [ ] `grep -r "GameOverlay" apps/web/src/` returns nothing
- [ ] Auto-memory updated with gutter architecture summary
