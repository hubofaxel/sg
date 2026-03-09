# PR-2 Verification, Landing, and PR-3 Dispatch

---

## 1. Verify PR-2 Deliverables

### Acceptance criteria check

| Criterion | Evidence | Status |
|---|---|---|
| Desktop keyboard works identically (arrows + WASD, diagonal normalization) | Reported: cardinal ±1 × PLAYER_SPEED, diagonal 1/√2, both layouts simultaneous | ⏳ Awaiting manual desktop parity check |
| Touch joystick appears on pointerdown in left half | TouchInput.ts created, 12 unit tests | ✅ |
| Dead zone respected | Unit tests cover dead zone | ✅ |
| Max radius clamping | Unit tests cover max radius | ✅ |
| Pointer capture prevents finger-swap | Pointer ID tracking implemented | ✅ |
| pointercancel clears touch state | Unit test covers pointercancel | ✅ |
| Tab switch + clear leaves no stuck movement | Adapter clear() tested | ✅ |
| Orientation change to portrait pauses scene + clears adapter | GameScene subscribes to ORIENTATION_CHANGE | ✅ |
| Orientation change to landscape resumes | GameScene resumes on landscape | ✅ |
| GameScene consumes InputIntent, not raw keys | Commit 73ff41e: refactor(game) | ✅ |
| No Phaser types exported from packages/game/ | Boundary checks pass | ✅ |
| ControlSchemeSchema accepts 'touch' | 15 schema tests | ✅ |
| ControlSchemeSchema rejects invalid values | Schema tests | ✅ |
| Default remains 'wasd' | Schema tests | ✅ |
| `pnpm validate` passes | 0 typecheck, 0 lint, 326 unit, boundary pass | ✅ |
| `pnpm test:e2e` passes | 14 e2e, no regressions | ✅ |

### Boundary check — one item to review

`apps/web/src/lib/components/GameCanvas.svelte` was modified in PR-2 to pass `touchControlsEnabled` and `controlScheme` to `mountGame()`. This file is in `svelte-shell` domain, but PR-2 was primarily `phaser-integrator` work. This is an acceptable cross-boundary touch — someone had to wire the new settings through the mount call, and it's a minimal change (passing two additional fields from the existing settings store). Confirm the change is limited to adding fields to the `mountGame()` call and does not introduce new logic, imports, or structural changes to GameCanvas.svelte. If it does more than that, flag it.

### Adapter selection logic — minor deviation, acceptable

The spec said: "If `touchControlsEnabled` is true AND touch capability detected → TouchInput. If `controlScheme === 'touch'` → force TouchInput."

The implementation adds a refinement: if a user explicitly sets `controlScheme` to `'wasd'` or `'arrows'`, the touch heuristic does not override them, even on a touch device. This is better than the spec — it respects explicit user choice. No action needed, but log the actual logic in the state log so PR-3's `svelte-shell` task knows the exact activation conditions.

### Type contract capture

From the done signal, record the expanded `GameMountOptions.settings` for downstream consumption:

```
GameMountOptions.settings now accepts:
- masterVolume: number (existing)
- sfxVolume: number (existing)
- musicVolume: number (existing)
- showFps: boolean (existing)
- touchControlsEnabled: boolean (new)
- controlScheme: string (new — 'wasd' | 'arrows' | 'touch')
```

This contract is needed by `svelte-shell` in PR-3. Record it in the state log.

---

## 2. Desktop Parity Check (Manual — Non-Negotiable)

This is the one manual gate in the entire plan. PR-2 refactored the central gameplay loop. Automated tests confirm the adapter outputs correct values, but only a human playing the game confirms the feel is identical.

**Instruction to the operator:**

1. Ensure `feat/mobile-input-intent` branch is checked out
2. Run `pnpm dev`, open `http://localhost:5173/play`
3. Play through at least one complete wave using **arrow keys only**
   - Verify: ship moves in all 8 directions
   - Verify: diagonal movement feels the same speed as cardinal (no faster, no slower)
   - Verify: firing rate is unchanged (continuous auto-fire)
   - Verify: game-over prompt works ("tap to restart" / click to restart)
4. Restart, play through at least one wave using **WASD only**
   - Same checks as above
5. Verify: arrow keys and WASD work simultaneously (press A + Up arrow = diagonal)
6. Verify: stage-clear prompt works if you reach it

**If anything feels different:** Stop. Do not merge. Describe the discrepancy and route to `phaser-integrator` with the specific observation (e.g., "diagonal movement feels 10% faster" or "there's a frame of input lag on direction changes").

**If everything feels identical:** PR-2 passes. Proceed to landing.

---

## 3. Land PR-2

After the desktop parity check passes, dispatch to `pr-shipper`:

```markdown
## Task: Land PR-2 Input Intent System

**Agent:** pr-shipper
**Branch:** feat/mobile-input-intent

### Commits (6)

- 85e4681 — feat(contracts): add touch control scheme option
- 83b72b9 — feat(game): add InputIntent system with keyboard and touch adapters
- 73ff41e — refactor(game): consume InputIntent in GameScene
- 3774746 — docs(repo): update mobile state for PR-2 in-progress
- 38821ee — test(game): add input adapter unit tests
- d523c12 — docs(repo): update mobile state — PR-2 tasks complete

### Files to stage

packages/contracts/:
- src/settings/settings.schema.ts
- src/settings/settings.schema.test.ts

packages/game/:
- src/systems/InputIntent.ts
- src/systems/KeyboardInput.ts
- src/systems/TouchInput.ts
- src/systems/KeyboardInput.test.ts
- src/systems/TouchInput.test.ts
- src/scenes/GameScene.ts
- src/types.ts
- src/mountGame.ts

apps/web/:
- src/lib/components/GameCanvas.svelte

docs/:
- mobile-state.md

### Pre-merge gate

1. `pnpm validate`
2. `pnpm test:e2e`
3. Route probe: `/`, `/play`, `/settings`
4. Desktop parity check: confirmed by operator ✅

### Merge

Use `/land`. If conflicts on main, resolve conservatively — PR-1's changes to
GameCanvas.svelte and play page must be preserved alongside PR-2's additions.

### Post-merge

Update phaser-integrator.md GameHandle method list if updateSettings() were added
in this PR (it was not — that's PR-3). Update auto-memory with: "Input intent adapter
system shipped. KeyboardInput and TouchInput adapters live. GameScene consumes
InputIntent."

### Done signal

Report: merge commit SHA, any conflicts resolved, final gate status.
```

---

## 4. Update State Log

After merge confirmation, update `docs/mobile-state.md`:

```markdown
## Current phase: A (Input-valid)
## Current PR: PR-3
## Branch: feat/mobile-settings-bridge

## Completed

| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| readiness | Pre-implementation fixes | planning-agent | ✅ | All 10 fixes applied |
| PR-1 | shell-foundation | svelte-shell | ✅ | viewport-fit, dvh, safe area, touch-action, rotate overlay |
| PR-1 | e2e-verification | test-runner | ✅ | 6 new tests |
| PR-1 | land | pr-shipper | ✅ | Merged to main |
| PR-2 | schema-extension | schema-validator | ✅ | ControlScheme + 'touch', 15 tests |
| PR-2 | input-intent-system | phaser-integrator | ✅ | InputIntent, KeyboardInput, TouchInput, GameScene refactor |
| PR-2 | adapter-tests | test-runner | ✅ | 23 adapter tests (11 keyboard + 12 touch) |
| PR-2 | desktop-parity-check | operator | ✅ | Manual gameplay verification |
| PR-2 | land | pr-shipper | ✅ | Merged to main — [SHA] |

## Type Contracts

GameMountOptions.settings: masterVolume (number), sfxVolume (number),
musicVolume (number), showFps (boolean), touchControlsEnabled (boolean),
controlScheme (string: 'wasd' | 'arrows' | 'touch')

Adapter selection: controlScheme 'touch' → force TouchInput;
touchEnabled !== false AND device touch AND controlScheme not explicitly
'wasd'/'arrows' → TouchInput; else → KeyboardInput
```

---

## 5. Dispatch PR-3: Runtime Settings Bridge

PR-3 has a strict sequential dependency: `phaser-integrator` builds the bridge mechanism first, then `svelte-shell` wires the store to it, then `test-runner` verifies the flow end-to-end.

### Task 3.1 — Runtime Settings Bridge (phaser-integrator)

```markdown
## Task: Implement GameHandle.updateSettings() via Phaser registry

**Agent:** phaser-integrator
**Branch:** feat/mobile-settings-bridge (create from main after PR-2 merge)
**PR:** PR-3
**Depends on:** PR-2 merged to main

### Context

Settings currently flow to Phaser once at mount time and cannot be changed without
remounting. Mobile players need runtime tuning (volume, touch controls, future
dead zone/handedness) without interrupting gameplay. The transport is Phaser's
registry changedata events — see mobile-decisions.md Decision 3.

### Skills to load

Load `.claude/skills/mobile-adaptation/SKILL.md` for architecture context.
Load `.claude/skills/phaser4-rc/SKILL.md` for registry changedata API.

### Files to touch

Modify:
- `packages/game/src/types.ts` — add `updateSettings(partial: Partial<RuntimeSettings>): void`
  to the `GameHandle` interface. Define `RuntimeSettings` as a type covering all
  settings that can change at runtime:
  ```typescript
  interface RuntimeSettings {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    showFps: boolean;
    touchControlsEnabled: boolean;
    controlScheme: string;
  }
  ```
  Note: controlScheme change at runtime does NOT hot-swap the adapter in Phase A.
  It is included for completeness — the adapter selection happens at next mount.

- `packages/game/src/mountGame.ts` — implement `updateSettings()` on the returned
  GameHandle:
  ```typescript
  updateSettings(partial) {
    for (const [key, value] of Object.entries(partial)) {
      game.registry.set(key, value);
    }
  }
  ```
  Also: change mount-time settings storage to use individual registry keys (one
  per setting) instead of a single 'audioVolumes' object. This aligns with the
  changedata-<key> subscription pattern. Specifically:
  - `registry.set('masterVolume', settings.masterVolume)`
  - `registry.set('sfxVolume', settings.sfxVolume)`
  - `registry.set('musicVolume', settings.musicVolume)`
  - `registry.set('showFps', settings.showFps)`
  - Keep the existing 'audioVolumes' key write as well for backward compatibility
    with AudioManager's current constructor read — but AudioManager will be
    migrated to per-key subscriptions below.

- `packages/game/src/systems/AudioManager.ts` — subscribe to runtime volume changes:
  - In create() or constructor, subscribe to:
    - `registry.events.on('changedata-masterVolume', (_, value) => ...)`
    - `registry.events.on('changedata-sfxVolume', (_, value) => ...)`
    - `registry.events.on('changedata-musicVolume', (_, value) => ...)`
  - Each listener calls the existing `setVolumes()` method with the updated values.
  - Remove or reduce reliance on the one-time 'audioVolumes' object read at
    construction — subscribe to individual keys instead.

- `packages/game/src/scenes/GameScene.ts` — subscribe to showFps changes:
  - `registry.events.on('changedata-showFps', (_, value) => ...)` — toggle debug
    overlay visibility at runtime.

### Constraints

- Only modify files in `packages/game/`
- Do not import from `@sg/contracts` — settings arrive as plain values
- Do not hot-swap input adapters at runtime — controlScheme changes take effect at
  next mount
- Registry changedata subscriptions must be cleaned up on scene shutdown/destroy to
  prevent memory leaks — use `registry.events.off()` or store references for cleanup
- Do not add Phase B settings fields (touchDeadZone, touchMaxRadius, touchHandedness)
  yet — those come when the schema adds them

### Acceptance criteria

- [ ] `GameHandle.updateSettings({ masterVolume: 0.5 })` changes audio volume at runtime
      without remounting
- [ ] `GameHandle.updateSettings({ sfxVolume: 0, musicVolume: 0 })` mutes sfx and music
      independently
- [ ] `GameHandle.updateSettings({ showFps: true })` toggles debug overlay at runtime
- [ ] Registry subscriptions are cleaned up on scene shutdown
- [ ] No regressions: mount-time settings still work (game starts with correct volumes)
- [ ] `pnpm validate` passes

### Done signal

Report: files changed, the exact `GameHandle` interface (all methods), the registry
key names used for each setting, any changes to AudioManager's initialization flow,
any deviations from spec.
```

### Task 3.2 — Settings Store Bridge (svelte-shell, after 3.1)

```markdown
## Task: Wire Svelte settings store to GameHandle.updateSettings()

**Agent:** svelte-shell
**Branch:** feat/mobile-settings-bridge
**PR:** PR-3
**Depends on:** Task 3.1 complete (updateSettings exists on GameHandle)

### Context

The game now supports runtime settings updates via GameHandle.updateSettings().
The Svelte shell needs to push settings changes to the game when the user modifies
them in the settings page, without remounting.

See mobile-decisions.md Decision 3 (registry transport) and the sveltekit-phaser-seam
skill for the $effect pattern.

### Skills to load

Load `.claude/skills/mobile-adaptation/SKILL.md` for architecture context.
Load `.claude/skills/sveltekit-phaser-seam/SKILL.md` for the updateSettings pattern
and $effect usage.

### Files to touch

Modify:
- `apps/web/src/lib/components/GameCanvas.svelte` or
  `apps/web/src/routes/play/+page.svelte` — add a Svelte 5 `$effect` that watches
  the settings store and calls `handle.updateSettings()` when values change:

  ```typescript
  $effect(() => {
    if (handle) {
      handle.updateSettings({
        masterVolume: settings.value.masterVolume,
        sfxVolume: settings.value.sfxVolume,
        musicVolume: settings.value.musicVolume,
        showFps: settings.value.showFps,
      });
    }
  });
  ```

  Important considerations:
  - The $effect runs whenever any tracked dependency changes. Only include settings
    that should trigger runtime updates.
  - Do NOT include controlScheme or touchControlsEnabled in the $effect — adapter
    selection is mount-time only (Phase A). Including them would call updateSettings
    on every change but the game wouldn't act on them, creating confusion.
  - Guard against SSR: $effect only runs client-side in Svelte 5, so no explicit
    guard is needed. But the `handle` null-check is required since the game may
    not be mounted yet.
  - Guard against the initial $effect run triggering a redundant update — the game
    already has the correct values from mount. This is harmless (setting the same
    value fires changedata only if the value differs, depending on Phaser's
    implementation), but if it causes issues, compare previous values before calling.

### Constraints

- Only modify files in `apps/web/`
- Do not import from `packages/game/` beyond the existing `mountGame` import
- Use Svelte 5 runes only ($effect, $state) — no legacy stores
- Do not introduce a debounce or throttle unless profiling shows the $effect fires
  excessively (it shouldn't — settings changes are user-initiated, not per-frame)

### Acceptance criteria

- [ ] Changing volume in settings page immediately affects in-game audio (no remount)
- [ ] Toggling showFps in settings immediately toggles the debug overlay
- [ ] Settings page remains functional on its own (without game mounted)
- [ ] No errors during SSR
- [ ] No errors when navigating away from /play and back
- [ ] `pnpm validate` passes

### Done signal

Report: files changed, which settings are included in the $effect, which are
excluded and why, any SSR considerations encountered.
```

### Task 3.3 — Bridge Verification (test-runner, after 3.1 and 3.2)

```markdown
## Task: Test runtime settings bridge end-to-end

**Agent:** test-runner
**Branch:** feat/mobile-settings-bridge
**PR:** PR-3
**Depends on:** Tasks 3.1 and 3.2 both complete

### Context

PR-3 adds runtime settings propagation from Svelte → GameHandle → Phaser registry →
game systems. Tests must verify the full flow works and that mount-time settings
aren't regressed.

### Files to touch

Unit tests in `packages/game/`:
- Test that calling updateSettings with volume values triggers AudioManager.setVolumes()
- Test that calling updateSettings with showFps triggers debug overlay toggle
- Test that registry subscriptions are cleaned up after scene shutdown (subscribe,
  shutdown, verify listener count or verify callback no longer fires)

E2e tests in `apps/web/tests/` (if feasible):
- Navigate to /play, wait for game ready
- Navigate to /settings, change volume slider
- Navigate back to /play — verify game still runs (this tests the mount/unmount/remount
  cycle more than runtime updates, but catches navigation regressions)

### Constraints

- Do not modify implementation files
- If AudioManager is hard to unit test in isolation (Phaser audio dependency), test
  at the registry subscription level: set a registry key, verify the changedata callback
  fires with the correct value

### Acceptance criteria

- [ ] Unit test confirms volume change via registry triggers AudioManager update
- [ ] Unit test confirms registry subscriptions are cleaned up on shutdown
- [ ] Existing e2e tests pass (no regressions)
- [ ] `pnpm validate` + `pnpm test:e2e` pass

### Done signal

Report: test files created/modified, test count delta, any mocking notes, any
flaky observations.
```

### PR-3 pre-merge verification

After all three tasks complete:

1. **Full gate:** `pnpm validate` + `pnpm test:e2e`
2. **Runtime settings spot-check:** Open `/play`, open browser DevTools console. While game is running, navigate to `/settings` in another tab (or use the settings page if accessible during play). Change volume. Return to game. Audio volume should reflect the change without the game having remounted. If the game remounted (visible as a flash/reload), the bridge failed — route to `phaser-integrator`.
3. **Mount-time parity:** Start fresh `/play` — volumes should match what's saved in settings. The bridge must not break the existing mount-time flow.
4. **Boundary check:** `phaser-integrator` files in `packages/game/` only. `svelte-shell` files in `apps/web/` only. Test files in their respective package test directories.

After verification passes, dispatch to `pr-shipper` to land, then update state log and advance to PR-4.

---

## 6. Phase A Checkpoint

After PR-3 merges, you are at the midpoint of Phase A. PRs 1-3 deliver the infrastructure (shell, input, settings bridge). PRs 4-5 deliver the usability layer (HUD scaling, overlay, responsive CSS). Take stock:

- **Is touch input actually working on a real device?** If you have access to a phone, test the deployed preview or local network dev server. The floating joystick, dead zone, and pointer capture are all tested in unit tests but have never been validated on physical hardware. Discovering a fundamental touch issue now (before PR-4 and PR-5 build on top of it) is far cheaper than discovering it after Phase A is "complete."

- **Are there any learnings that should amend PR-4 or PR-5 task prompts?** The GameScene refactor in PR-2 may have revealed structural patterns (how systems access display size, how the scale manager resize event propagates) that inform the HUD scaling approach in PR-4. Capture any such observations before dispatching PR-4.

- **State log should be current** with all completed tasks, the type contract, and the adapter selection logic documented.
