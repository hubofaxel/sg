# PR-8: Documentation Alignment and Overlay Verification

Single PR to align all documentation, skills, and agent definitions with the shipped V2 architecture, and verify overlay/touch behavior at multiple viewports.

---

## Current State

Dynamic world sizing (V2) is shipped on main. Key infrastructure:

- `SafeZone` (800x600 centered) + `computeWorldSize()` (width 800-1200, height fixed 600) — `systems/SafeZone.ts`
- `setGameSize()` on resize with debounce — `mountGame.ts`
- `RelativeTouchInput` (1:1 finger tracking, DOM pointer events on canvas) — `systems/RelativeTouchInput.ts`
- `TouchStyleSchema` ('relative' | 'joystick') — `contracts/settings/settings.schema.ts`
- `isPositionDelta` on `InputIntent` — position delta vs velocity branching in `GameScene.ts`
- `GameOverlay.svelte` — pause/mute buttons positioned top-right with `pointer-events: none` container

On a 20:9 phone (world 1200x600), the safe zone is centered with ~200px margins on each side. Touch input activates on the left half (`x < width / 2`). Overlay buttons are in the top-right (which falls in the right margin). On 4:3 (world 800x600), margins are zero — overlay buttons sit in the canvas corner. Both work correctly today.

---

## Tasks

### Task A — Documentation and Context Alignment

Update all docs, skills, and agent definitions to reflect shipped V2 architecture.

**Files to update:**

1. `docs/aspect-ratio-migration.md` — Add header: "Status: EXECUTED. Shipped as PR-7 on feat/adaptive-aspect-ratio."
2. `docs/aspect-ratio-dispatch.md` — Same header treatment.
3. `docs/mobile-state.md`:
   - Add PR-7 (V2 aspect ratio) to Completed table
   - Update adapter selection to reflect RelativeTouchInput as default
   - Add touchStyle to registry keys and type contracts
   - Set current work to PR-8
4. `.claude/skills/mobile-adaptation/SKILL.md`:
   - Replace three-domain table with four domains (add Margin)
   - Replace "setGameSize() is never called" with description of dynamic world sizing
   - Add SafeZone, RelativeTouchInput, isPositionDelta, touchStyle
   - Add margin-as-control-zone concept
5. `.claude/skills/sveltekit-phaser-seam/SKILL.md`:
   - Add note that margins are inside Phaser (safe zone architecture)
   - Add note about GameOverlay positioning relative to margins
6. `.claude/agents/phaser-integrator.md`:
   - Add SafeZone as core infrastructure
   - Add dynamic world sizing via computeWorldSize()
   - Add updateSettings() to GameHandle method list
7. `.claude/agents/svelte-shell.md`:
   - Add GameOverlay component to component inventory
   - Add /settings route as live (not planned)
   - Note margin-aware overlay positioning

**Commit:** `docs(repo): align documentation and agent context with shipped V2 architecture`

### Task B — Overlay and Touch Zone Verification

Verify (not rewrite) that the existing overlay and touch input work correctly at multiple viewports. This is a verification task — code changes only if problems are found.

**Verify at 20:9 viewport (e.g., 960x432):**
- [ ] Overlay pause/mute buttons are visible in the right margin area
- [ ] Left-half touch activates RelativeTouchInput (ship follows finger 1:1)
- [ ] Touch on right half does not trigger movement
- [ ] Overlay pointer-events don't intercept left-side touch

**Verify at 4:3 viewport (e.g., 800x600):**
- [ ] Overlay buttons visible in canvas top-right corner
- [ ] Touch input works (left half of 800px = 400px zone)
- [ ] No visual artifacts from zero-width margins

**Verify at 16:9 viewport (e.g., 1920x1080):**
- [ ] Background fills entire canvas, no seams
- [ ] HUD anchored to screen edges
- [ ] Enemies spawn in center corridor

**If any verification fails:** fix the specific issue and add a commit for it.

**Commit (only if fixes needed):** `fix(web): adjust overlay/touch behavior for margin viewports`

### Task C — Stale Reference Sweep

```
grep "never call setGameSize" .claude/ docs/ — should return zero after Task A
grep "Three Size Domains" .claude/skills/ — should say "Four" after Task A
grep "SafeZone" .claude/skills/mobile-adaptation/ — should exist after Task A
```

Confirm `pnpm validate` passes.

**Commit (with Task A if clean):** included in Task A commit

---

## Commit Sequence

```
1. docs(repo): align documentation and agent context with shipped V2 architecture
2. (conditional) fix(web): adjust overlay/touch behavior for margin viewports
```

---

## Acceptance Criteria

- [ ] All skills/agents reference dynamic world sizing, SafeZone, margins
- [ ] No "never call setGameSize()" in active documents
- [ ] mobile-state.md reflects PR-7 shipped, PR-8 current
- [ ] Overlay functional at 20:9, 16:9, and 4:3
- [ ] Touch input functional at 20:9 and 4:3
- [ ] `pnpm validate` passes
