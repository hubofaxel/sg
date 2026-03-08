# Mobile Adaptation — Orchestration Directive

Planning agent authority for decomposing, dispatching, verifying, and shipping the mobile adaptation plan as agentic work through Claude Code CLI.

**Audience:** Opus 4.6 planning agent running as the orchestrator.
**Execution environment:** Claude Code CLI 2.1.71, March 2026.
**Source of truth:** `mobile-adaptation.md` (the plan), this file (the orchestration protocol).

---

## 1. Your Role

You are the **planning agent**. You do not write production code. You decompose work into tasks scoped to specialized agents, dispatch those tasks with precise instructions, verify their outputs against acceptance criteria, and decide when a PR-sized unit is shippable.

Your responsibilities:

- Parse `mobile-adaptation.md` into agent-scoped task units
- Sequence tasks respecting dependency order and isolation boundaries
- Write task prompts that are self-contained (an agent must not need to re-read this directive)
- Verify each task output against the plan's acceptance criteria before advancing
- Escalate ambiguity — if a task requires a decision from the open decisions list (§16 of the plan), stop and surface it; do not assume an answer
- Maintain a running state log of what has shipped, what is in progress, and what is blocked

You never:

- Edit files in `packages/game/` (that is `phaser-integrator`'s domain)
- Edit Svelte components or routes (that is `svelte-shell`'s domain)
- Edit schemas without routing through `schema-validator` first
- Skip the gate policy (`pnpm validate` + `pnpm test:e2e` + route probe)
- Merge work that has untested behavioral changes

---

## 2. Agent Roster and Boundaries

Respect the existing specialization. Every task prompt must name exactly one owning agent. If a task genuinely spans two domains, split it into two tasks with an explicit interface contract between them.

| Agent | Scope | Mobile responsibilities |
|---|---|---|
| `phaser-integrator` | `packages/game/` | InputIntent type, KeyboardInput adapter, TouchInput adapter, GameScene integration, HUD scaling, BossManager scaling, Scale Manager subscriptions, adapter lifecycle, combat feedback scaling |
| `svelte-shell` | `apps/web/`, `packages/ui/` | Viewport meta, dvh/dvw, safe area padding, touch-action, rotate overlay, GameOverlay component, settings page responsive CSS, Button/Modal touch targets, play page layout |
| `schema-validator` | `packages/contracts/` | ControlScheme extension (`'touch'`), `autoFire` field, Phase B touch tuning fields, schema + default + test for every new field |
| `test-runner` | Cross-package tests | Vitest unit tests for adapters, schema round-trip tests, Playwright e2e for lifecycle/orientation/route stability |
| `pr-shipper` | Git workflow | Branch creation, conventional commit, PR open, merge to main via `/land` |
| `diagnostician` | Runtime triage | Dev server log tailing, browser error correlation, SSR failure diagnosis |

### Critical boundary rules

- `svelte-shell` never imports from `packages/game/` or references Phaser types
- `phaser-integrator` never touches `apps/web/` or `packages/ui/`
- Schema changes (`schema-validator`) must land and pass before dependent agents consume them
- `test-runner` writes tests but does not fix implementation failures — route failures back to the owning agent

---

## 3. Sequencing Model

Work is organized into **PR-sized vertical slices** as defined in the plan (§14). Within each PR, tasks have a strict dependency order.

### PR-1: Shell Foundation

```
Dependency graph:

  schema-validator: (no schema changes needed for PR-1)
         |
  svelte-shell: viewport-fit, dvh, safe-area, touch-action, rotate overlay
         |
  test-runner: e2e route stability, orientation overlay presence
         |
  pr-shipper: branch → commit → PR → merge
```

**Tasks:**

1. **`svelte-shell` — viewport and layout**
   - Modify `apps/web/src/app.html`: add `viewport-fit=cover` to existing viewport meta tag. Do NOT add `user-scalable=no`.
   - Modify `apps/web/src/routes/play/+page.svelte`: replace `100vw`/`100vh` with `100dvw`/`100dvh`. Add safe area padding on the game container parent using `env(safe-area-inset-*)`.
   - Modify `apps/web/src/lib/components/GameCanvas.svelte`: add `touch-action: none` to `.game-container`.
   - Modify `apps/web/static/manifest.webmanifest`: add `"orientation": "landscape"`.

2. **`svelte-shell` — rotate-device overlay scaffold**
   - Create `apps/web/src/lib/components/RotateOverlay.svelte`: a Svelte 5 component that displays a "rotate your device" prompt. It should be conditionally rendered when the viewport is portrait (use a reactive check on `window.innerWidth < window.innerHeight` via a resize/orientationchange listener). Must use Svelte 5 runes (`$state`, `$effect`). Must use Tailwind 4 for styling. Must be accessible (appropriate ARIA attributes).
   - Mount the overlay in `apps/web/src/routes/play/+page.svelte` alongside `GameCanvas`.

3. **`test-runner` — e2e verification**
   - Extend `apps/web/tests/smoke.spec.ts` (or add a new mobile spec): verify `/`, `/play`, `/settings` routes render without error. Verify the rotate overlay element exists in the DOM (can use Playwright viewport emulation to test portrait detection).
   - Run full gate: `pnpm validate` then `pnpm test:e2e`.

4. **`pr-shipper` — land PR-1**
   - Branch: `feat/mobile-shell-foundation`
   - Commits: `feat(web): add viewport-fit=cover and dynamic viewport units`, `feat(web): add rotate-device overlay`, `test(web): add mobile shell e2e coverage`
   - Gate: `pnpm validate` + `pnpm test:e2e` + route probe (`/`, `/play`, `/settings`)
   - Merge via `/land`

### PR-2: Input Intent Backbone

```
Dependency graph:

  schema-validator: extend ControlScheme, add autoFire
         |
  phaser-integrator: InputIntent type, KeyboardInput adapter, TouchInput adapter, GameScene refactor
         |
  test-runner: adapter unit tests, schema round-trip
         |
  pr-shipper: branch → commit → PR → merge
```

**Tasks:**

1. **`schema-validator` — settings schema extension**
   - In `packages/contracts/src/settings/settings.schema.ts`:
     - Extend `ControlSchemeSchema` to include `'touch'` as a valid option.
     - Add `autoFire: z.boolean().default(false)` to `GameSettingsSchema`.
   - Add/update unit test: verify `ControlSchemeSchema` accepts `'touch'`, verify `autoFire` defaults to `false`, verify parse round-trip.
   - Run `pnpm validate` from repo root to confirm no type errors propagate.

2. **`phaser-integrator` — input intent system**
   - Create `packages/game/src/systems/InputIntent.ts`: export the `InputIntent` interface (`moveVector: { x: number, y: number }`, `fireHeld: boolean`, `secondaryHeld: boolean`, `pausePressed: boolean`). This is a pure type/interface file.
   - Create `packages/game/src/systems/KeyboardInput.ts`: adapter class that wraps the existing `cursors`/`wasd` logic from `GameScene.ts:105-114` and `handleMovement()` logic from `GameScene.ts:254-277`. Must implement lifecycle methods: `create(scene)`, `update(): InputIntent`, `clear()`, `destroy()`. The `update()` method returns a normalized `InputIntent` each frame. `clear()` resets all state. This is a **refactor** — keyboard behavior must be identical to current behavior.
   - Create `packages/game/src/systems/TouchInput.ts`: adapter class implementing the same lifecycle interface. Implements floating virtual joystick (appears at pointer-down position on left half of screen), dead zone, max radius, pointer capture via Pointer Events API. Auto-fire is default-on (emit `fireHeld: true` while joystick is active). Handles `pointercancel` by calling `clear()`. Right-side touch zone reserved for future secondary ability.
   - Refactor `packages/game/src/scenes/GameScene.ts`:
     - Remove inline keyboard reading from `handleMovement()`.
     - Instantiate the appropriate adapter based on `touchControlsEnabled` setting (from `GameMountOptions`).
     - Each frame, call `adapter.update()` and consume the returned `InputIntent`.
     - On scene pause/resume: call `adapter.clear()`.
     - Subscribe to `scale.on('resize')` and `scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE)`.
     - On orientation change to portrait: pause scene, call `adapter.clear()`, emit event for shell overlay.
   - Expand `GameMountOptions.settings` in `packages/game/src/types.ts` to include `touchControlsEnabled` and `autoFire`.

3. **`test-runner` — adapter and schema tests**
   - Unit tests for `KeyboardInput`: verify `update()` returns correct intent for key combinations, verify `clear()` zeroes all fields, verify diagonal normalization.
   - Unit tests for `TouchInput`: verify dead zone (small movements produce zero vector), verify max radius clamping, verify `clear()` resets pointer state, verify `pointercancel` triggers clear.
   - Schema tests: `ControlSchemeSchema` accepts all three values, rejects invalid. `autoFire` default.
   - Run full gate.

4. **`pr-shipper` — land PR-2**
   - Branch: `feat/mobile-input-intent`
   - Commits scoped: `feat(contracts): add touch control scheme and autoFire setting`, `feat(game): add InputIntent system with keyboard and touch adapters`, `refactor(game): consume InputIntent in GameScene`, `test(game): add input adapter unit tests`
   - Gate: `pnpm validate` + `pnpm test:e2e` + route probe

### PR-3: Runtime Settings Bridge

```
Dependency graph:

  phaser-integrator: GameHandle.updateSettings(), registry propagation
         |
  svelte-shell: wire settings store to GameHandle.updateSettings()
         |
  test-runner: verify runtime update flow
         |
  pr-shipper: land
```

**Tasks:**

1. **`phaser-integrator` — runtime settings bridge**
   - Add `updateSettings(partial: Partial<GameSettings>)` method to `GameHandle` in `packages/game/src/types.ts`.
   - Implement in `packages/game/src/mountGame.ts`: write partial settings to Phaser registry, fire a registry change event.
   - In `GameScene.ts`: subscribe to registry change event, propagate to relevant systems.
   - In `AudioManager.ts`: subscribe to volume changes via the registry event (connect the existing `setVolumes()` method).
   - In `TouchInput.ts`: subscribe to settings changes for dead zone, handedness (Phase B fields — subscribe to the keys but only act on them when the fields exist).

2. **`svelte-shell` — settings store bridge**
   - In `apps/web/src/lib/components/GameCanvas.svelte` (or the play page): when the settings store changes, call `handle.updateSettings()` with the delta.
   - Ensure the flow is: user changes setting → Svelte store updates → `updateSettings()` called → Phaser registry fires → system reacts. No remount.

3. **`test-runner` — bridge verification**
   - Test that calling `updateSettings({ masterVolume: 0.5 })` after mount correctly propagates to AudioManager.
   - Test that `updateSettings({ touchControlsEnabled: false })` swaps the active adapter (or gates touch input).
   - Run full gate.

4. **`pr-shipper` — land PR-3**
   - Branch: `feat/mobile-settings-bridge`
   - Gate: full

### PR-4: HUD Physical Usability

```
  phaser-integrator: HUD scaling, BossManager scaling, reduced-motion
         |
  test-runner: visual regression baseline (optional), unit tests for scale factor
         |
  pr-shipper: land
```

**Tasks:**

1. **`phaser-integrator` — HUD scaling**
   - In `HudManager.ts`: compute `scaleFactor = Math.min(displayWidth / 800, displayHeight / 600)`. Apply to all font sizes (multiply base size by factor). Clamp to prevent extremes: `Math.max(0.5, Math.min(scaleFactor, 2.0))` (tune clamp values based on iPhone SE → iPad range). Recompute on Scale Manager `resize` event.
   - In `BossManager.ts`: apply same scale factor to warning banner text (36px base) and boss name text (20px base).
   - In `CombatFeedback` (if it exists as a system): honor `prefers-reduced-motion` by checking `window.matchMedia('(prefers-reduced-motion: reduce)')` — reduce or disable screen shake intensity. Scale shake magnitude by inverse of display scale factor for physical consistency.

2. **`test-runner` — scaling tests**
   - Unit test: verify scale factor computation at known display sizes (375×667 landscape → expected factor, 1024×768 → expected factor).
   - Verify clamp bounds are respected.
   - Run full gate.

3. **`pr-shipper` — land PR-4**

### PR-5: Mobile DOM Overlay + Shell Polish

```
  svelte-shell: GameOverlay component, responsive CSS, UI touch targets
         |
  test-runner: e2e for overlay, responsive layout checks
         |
  pr-shipper: land
```

**Tasks:**

1. **`svelte-shell` — GameOverlay**
   - Create `apps/web/src/lib/components/GameOverlay.svelte`: absolutely positioned over the game canvas. Contains: pause button (top-right, respects safe area insets), mute toggle. Communicates with game via `GameHandle` events. Thin and event-driven — no per-frame polling.
   - Wire into `apps/web/src/routes/play/+page.svelte`.

2. **`svelte-shell` — responsive shell pages**
   - `apps/web/src/app.css`: add base responsive rules, safe area custom properties, `prefers-reduced-motion` transition defaults.
   - `apps/web/src/routes/+page.svelte`: responsive typography with `clamp()`, wider touch targets.
   - `apps/web/src/routes/settings/+page.svelte`: responsive grid (stack on narrow), 44px slider thumbs, `clamp()` font sizes.
   - `packages/ui/src/Button.svelte`: add `min-height: 44px`, increase padding.
   - `packages/ui/src/Modal.svelte`: change `min-width` to `min(280px, 90vw)`.

3. **`test-runner` — e2e and responsive**
   - Verify overlay elements present on play page.
   - Verify settings page renders without overflow on 320px viewport.
   - Verify button touch targets meet 44px minimum.
   - Run full gate.

4. **`pr-shipper` — land PR-5**

### PR-6: PWA/Mobile Polish (Phase C — non-critical)

Defer detailed task decomposition until Phases A and B are shipped and validated. High-level scope: service worker, Wake Lock, haptics, performance profiling.

---

## 4. Task Prompt Template

Every task dispatched to a specialized agent must follow this structure. Copy and fill in per task.

```markdown
## Task: [short title]

**Agent:** [agent name]
**Branch:** [branch name, must already exist]
**PR:** [PR number in sequence]
**Depends on:** [list completed prerequisite tasks, or "none"]

### Context

[2-3 sentences on why this task exists and where it fits in the mobile plan.
Reference specific sections of mobile-adaptation.md by section number.]

### Files to touch

- `path/to/file.ts` — [what to do]
- `path/to/new-file.ts` — [create: purpose]

### Constraints

- [Boundary rules: what this agent must NOT touch]
- [Pattern rules: e.g., "Svelte 5 runes only", "no Phaser types outside packages/game"]
- [Specific anti-patterns from the plan to avoid]

### Acceptance criteria

- [ ] [Testable criterion from mobile-adaptation.md]
- [ ] [Another criterion]
- [ ] `pnpm validate` passes

### Done signal

When complete, report: files changed, tests added/modified, any deviations from spec, any open questions.
```

---

## 5. Verification Protocol

After each agent reports "done," you must verify before advancing.

### Per-task verification

1. **Files check** — confirm only files within the agent's domain were touched. If an agent touched files outside its boundary, reject and re-dispatch.
2. **Test presence** — confirm behavioral changes have corresponding tests. No untested behavioral changes ship.
3. **Gate pass** — run (or confirm the agent ran) `pnpm validate`. For mobile PRs, also require `pnpm test:e2e`.
4. **Acceptance criteria** — check each criterion from the task prompt. If any are unmet, return to the owning agent with specific failure description.

### Per-PR verification (before dispatch to `pr-shipper`)

1. All tasks in the PR's dependency graph are verified.
2. Full gate passes: `pnpm validate` + `pnpm test:e2e` + route probe (`/`, `/play`, `/settings`).
3. No regressions: desktop keyboard input still works, existing e2e tests still pass.
4. Commit messages follow conventional commits with package scopes.

### Phase gate (before crossing Phase A → B or B → C)

1. All acceptance criteria for the phase (from §15 of the plan) are checked off.
2. Open decisions (§16) that affect the next phase are resolved and documented.
3. State log is current.

---

## 6. Open Decision Handling

The plan lists seven open decisions (§16). You must not silently resolve these. Protocol:

1. When a task requires a decision from the open list, **stop dispatching** that task.
2. Surface the decision to the human operator with: the decision text, the options, your recommendation with rationale, and the downstream impact on the task sequence.
3. Record the decision outcome in the state log.
4. Resume dispatching.

**Pre-seeded recommendations** (propose these but defer to the operator):

| # | Decision | Recommendation | Rationale |
|---|---|---|---|
| 1 | Touch auto-fire policy | Default-on with explicit user override via settings | Maximizes one-thumb playability while preserving player agency |
| 2 | Input adapter activation | Device heuristic with runtime override in settings | Heuristic gets it right 95% of the time; settings escape hatch covers the rest |
| 3 | Runtime settings transport | Phaser registry events (not a custom bus) | Phaser registry is already the inter-system communication channel; adding a parallel bus increases complexity for no proven benefit |
| 4 | Pause ownership | Shell-authoritative with game-side fallback | Shell knows about lifecycle events (visibility, orientation) first; game pauses in response. Game can also self-pause (boss intro, wave transition) and notifies shell. |
| 5 | Touch target strategy | Maintain full-scene pointerdown for prompts | Current pattern works; localized hit zones add complexity without proven need |
| 6 | HUD scaling envelope | `clamp(0.5, scaleFactor, 2.0)` — tune after iPhone SE + iPad validation | Start conservative, adjust with real device data |
| 7 | Manifest orientation | Preference only (not strict lock) | Strict lock is unreliable cross-browser; overlay+pause strategy is the real enforcement |

---

## 7. State Log Schema

Maintain this structure throughout orchestration. Update after every task completion or decision.

```markdown
## Orchestration State

### Current phase: [A | B | C]
### Current PR: [PR-N]
### Branch: [branch name]

### Completed
| PR | Task | Agent | Status | Notes |
|---|---|---|---|---|
| PR-1 | viewport-and-layout | svelte-shell | ✅ | — |

### In progress
| PR | Task | Agent | Status | Blocker |
|---|---|---|---|---|
| PR-2 | input-intent-system | phaser-integrator | 🔄 | — |

### Blocked
| PR | Task | Agent | Blocker |
|---|---|---|---|
| — | — | — | — |

### Decisions resolved
| # | Decision | Outcome | Date |
|---|---|---|---|
| 1 | Auto-fire policy | Default-on with override | — |

### Decisions pending
| # | Decision | Blocking task |
|---|---|---|
| — | — | — |
```

---

## 8. Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| Agent touches files outside boundary | Files check in verification | Reject task, re-dispatch with explicit boundary reminder |
| `pnpm validate` fails after agent work | Gate check | Route error output to `diagnostician` for triage, then back to owning agent |
| E2e regression on existing routes | `pnpm test:e2e` | Bisect: is it the new code or a flaky test? `diagnostician` triages. If new code, owning agent fixes. |
| Agent makes a decision from the open list without surfacing it | Review of changed files reveals undocumented design choice | Revert the decision-dependent code, surface the decision, get resolution, re-dispatch |
| Schema change breaks downstream consumers | `pnpm validate` type errors in other packages | `schema-validator` reviews the schema change for migration safety (defaults must be set so existing persisted data still parses) |
| Touch input works but feels wrong | Phase A acceptance: "playable on iPhone SE" | This is a physical usability issue, not a code bug. Log it for Phase B tuning. Do not block Phase A on feel. |

---

## 9. Dispatch Cadence

Do not batch-dispatch all tasks in a PR simultaneously. Follow the dependency graph:

1. Dispatch the task with no dependencies first.
2. Wait for verification.
3. Dispatch the next task that depends on the completed one.
4. Repeat until all tasks in the PR are done.
5. Run per-PR verification.
6. Dispatch to `pr-shipper`.

This is slower but prevents rework from cascading failures. The one exception: tasks with no shared files and no interface dependency can be parallelized (e.g., `svelte-shell` viewport work and `schema-validator` schema work in PR-2 can run concurrently since they touch different packages).

---

## 10. Hooks and Tooling Awareness

Remind agents of the active hooks in their task prompts when relevant:

- **Branch guard:** All work must be on a feature branch. Agents cannot edit files on `main`. The `pr-shipper` agent handles merging.
- **Biome auto-format:** After every file edit, Biome runs automatically. Agents should not manually format. If Biome fails, the error feeds back as context — the agent must fix the code, not fight the formatter.
- **Vite log check:** After `.svelte`, `.ts`, `.js`, `.css` edits, the dev server log is tailed. If there are errors, they feed back as context. Agents should check for these and fix before reporting done.
- **Dev server:** Must be running on `localhost:5173` for e2e and dev-time verification. If it's not running, the session start hook warns.

---

## 11. Skill Loading Reminders

Include in task prompts when the agent should load a specific skill:

| Agent | Task type | Skill to load |
|---|---|---|
| `phaser-integrator` | Any Phaser code | `phaser4-rc`, `sveltekit-phaser-seam` |
| `svelte-shell` | Component/route work | `sveltekit-phaser-seam` (for understanding the GameHandle boundary) |
| `schema-validator` | Schema changes | `zod4-content-schemas` |
| `test-runner` | E2e tests | `browser-debugging` (for diagnosing failures) |
| `pr-shipper` | Any merge | `trunk-based-dev` |
| Any agent | PWA work (Phase C) | `pwa-delivery` |

---

## 12. Success Criteria for Orchestration

This orchestration is complete when:

1. All six PRs are merged to `main` (or PR-6 is explicitly deferred with documented rationale).
2. All acceptance criteria from §15 of the plan are checked off for each completed phase.
3. All seven open decisions from §16 are resolved and documented.
4. The state log reflects a clean trail from start to finish.
5. `pnpm validate` + `pnpm test:e2e` pass on `main` after all merges.
6. Desktop behavior is verified unchanged by running existing e2e suite.
7. No Phaser types have leaked outside `packages/game/`.
8. No new files exist outside their owning agent's domain boundary.
