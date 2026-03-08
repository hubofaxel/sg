# Structural Alignment Implementation Plan

Date: March 8, 2026
Scope: Entire monorepo (`apps/*`, `packages/*`, `tools/*`)
Source: Repository-grounded audit (code + commands), not doc assumptions

## 1. Objective

Establish a self-enforcing foundation so architecture, quality gates, and documentation remain aligned as the project scales beyond single-agent context windows.

Principles:
- Any rule that matters must be machine-enforced.
- Runtime truth takes precedence over documentation claims.
- Public surfaces stay intentionally small.
- Drift must be automatically detectable.

## 2. Audit Baseline (Ground Truth)

### Environment snapshot
- Node: `v24.14.0`
- pnpm: `10.31.0`
- Branch: `feat/drop-system`

### Quality gate snapshot
- `pnpm check`: PASS
- `pnpm lint`: FAIL
- `pnpm test`: FAIL (`No test files found`)
- `pnpm test:e2e`: FAIL (`playwright` command not found)
- `pnpm asset:validate`: PASS (`0 error(s), 0 warning(s)`)
- `pnpm build`: FAIL (Phaser import/export mismatch)

### Critical observed defects and drifts
1. Production build fails due to Phaser default import mismatch.
   - First failing site: `packages/game/src/scenes/BootScene.ts:1`
   - Same import pattern appears across multiple `packages/game/src/**` files.
2. Test gate is currently non-functional because there are no test files in repo.
3. E2E command exists but Playwright is not configured/installed in web workspace.
4. Documentation claims startup content validation, but content export currently uses unchecked casting.
   - `packages/content/src/index.ts`
5. Documentation and runtime are out of sync in multiple places (routes, persistence/settings status, asset phase status, command registry).
6. No CI workflows currently exist (`.github/` missing), so structure is not enforced at merge time.

### Scale pressure indicators
- Total TS/Svelte/JSON lines (core workspaces): ~8035+
- Largest files:
  - `packages/game/src/scenes/GameScene.ts` (~680 lines)
  - `tools/asset-gen/src/config/asset-catalog.ts` (~594 lines)
  - `packages/game/src/systems/BossManager.ts` (~444 lines)

## 3. Program-Level Workstreams

## Workstream A: Build and Runtime Correctness (P0)

Goal: restore production build correctness before expanding surface area.

Implementation tasks:
1. Standardize Phaser import style across `packages/game/src/**` to match RC ESM export shape.
2. Re-run and fix `pnpm build` until green.
3. Add build verification into root validation chain (`package.json` scripts).
4. Add a smoke integration check for SSR-safe mount behavior in `GameCanvas` seam.

Key files:
- `packages/game/src/mountGame.ts`
- `packages/game/src/scenes/*.ts`
- `packages/game/src/systems/*.ts`
- `apps/web/src/lib/components/GameCanvas.svelte`
- `package.json`

Acceptance criteria:
- `pnpm build` passes on clean workspace.
- No Phaser import regressions in `@sg/game`.
- Validation chain includes build.

## Workstream B: Honest Gate Redesign (P0/P1)

Goal: quality gates represent real coverage, not nominal coverage.

Implementation tasks:
1. Redesign `validate` stages to only include executable checks.
2. Decide immediate policy for zero-test state:
   - Option 1: block until baseline tests are added.
   - Option 2: temporary non-blocking test stage with strict deadline.
3. Normalize lint behavior for generated artifacts (`asset-manifest.json` formatting stability).
4. Ensure local gate and CI gate are identical in order and strictness.

Key files:
- `package.json`
- `biome.json`
- `tools/asset-gen/src/lib/manifest-builder.ts`

Acceptance criteria:
- `pnpm validate` is deterministic and meaningful.
- No stage fails due to missing tooling assumptions.

## Workstream C: Test Foundation (P1)

Goal: establish minimum reliable safety net across contracts, content, game seam, and web.

Implementation tasks:
1. Add schema tests in `packages/contracts`.
2. Add content validation tests in `packages/content`.
3. Add game-level unit/integration tests (mount/unmount lifecycle, event bridge basics).
4. Add Playwright setup in `apps/web` and initial smoke e2e flow.

Initial target test coverage:
- Contracts: parse success + failure cases for key schemas.
- Content: all JSON files validated against contracts.
- Game seam: `mountGame` create/destroy lifecycle does not leak handle/event state.
- E2E: home/play route and canvas/game boot readiness.

Key files (new + modified):
- `packages/contracts/src/**/*.test.ts`
- `packages/content/src/**/*.test.ts` or `packages/content/tests/**`
- `packages/game/src/**/*.test.ts`
- `apps/web/playwright.config.ts` (new)
- `apps/web/tests/**/*.spec.ts` (new)
- `apps/web/package.json`

Acceptance criteria:
- `pnpm test` runs actual tests and passes.
- `pnpm test:e2e` executable and green in baseline path.

## Workstream D: Runtime Schema Enforcement (P1)

Goal: make "schema-first" true in runtime behavior.

Implementation tasks:
1. Replace unsafe `as unknown as` content casting with parse-based load path.
2. Add central content validation module that:
   - Parses each domain blob
   - Validates cross-references (enemy IDs, boss IDs, asset keys)
3. Wire validation into startup path with hard-fail semantics and clear error propagation to UI/event channel.
4. Add tests for invalid content failure modes.

Key files:
- `packages/content/src/index.ts`
- new `packages/content/src/validate.ts` (proposed)
- `packages/game/src/scenes/PreloadScene.ts` and/or startup seam where content enters runtime

Acceptance criteria:
- Runtime startup fails fast on invalid content.
- Claim in docs about startup validation is verifiably true.

## Workstream E: Boundary Enforcement (P1)

Goal: architecture boundaries become compile/check-time constraints.

Implementation tasks:
1. Add static checks for forbidden imports:
   - `phaser` import only allowed inside `packages/game/**`.
2. Enforce package dependency direction rules.
3. Lock `@sg/game` public API surface to intended exports.
4. Add CI check scripts for boundary rules.

Key files:
- `packages/game/src/index.ts`
- boundary check script under `tools/scripts/` or dedicated `tools/checks/`
- root scripts in `package.json`

Acceptance criteria:
- Any forbidden cross-layer import fails local/CI checks.
- Public API changes are explicit and reviewed.

## Workstream F: Asset Governance and Key Discipline (P1/P2)

Goal: asset references remain coherent and phase policy reflects runtime reality.

Implementation tasks:
1. Define authoritative key source policy (catalog + contracts + runtime references).
2. Add key-reference check (game/content references must exist in manifest/catalog).
3. Resolve phase/status doc drift in asset contracts.
4. Ensure manifest generation output is stable and formatter-compatible.

Key files:
- `tools/asset-gen/src/config/asset-catalog.ts`
- `tools/asset-gen/src/commands/validate.ts`
- `docs/asset-contracts.md`
- `apps/web/static/assets/asset-manifest.json`

Acceptance criteria:
- Key drift is automatically detected.
- Asset docs and runtime usage no longer conflict.

## Workstream G: Documentation Reality Alignment (P1)

Goal: reduce stale claims and make docs auditable.

Implementation tasks:
1. Update stale docs:
   - root `README.md`
   - `apps/web/README.md`
   - `CLAUDE.md` files
   - `AGENTS.md`
   - `docs/asset-contracts.md`
2. Add doc-consistency checker for:
   - Command files listed vs present
   - Claimed routes vs existing routes
   - Claimed gate commands vs executable commands
3. Add "documentation trust policy": claims must be backed by tests/check scripts or clearly marked planned.

Key files:
- `README.md`
- `apps/web/README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/*.md`

Acceptance criteria:
- No known contradictions between docs and repository reality.
- Drift check runs in CI.

## Workstream H: CI and Merge Enforcement (P0/P1)

Goal: alignment survives beyond local sessions.

Implementation tasks:
1. Create GitHub Actions workflows.
2. Add required jobs:
   - check
   - lint
   - test
   - build
   - asset validate
   - boundary/doc drift checks
3. Configure branch protection rules to require these checks.
4. Add PR template with required impact declarations.

Key files (new):
- `.github/workflows/ci.yml`
- `.github/pull_request_template.md`

Acceptance criteria:
- No merge without passing structural checks.

## Workstream I: Context-Window Scalability Refactor (P2 Strategic)

Goal: reduce single-file cognitive load and improve maintainability.

Implementation tasks:
1. Split oversized files by domain responsibilities.
   - `GameScene.ts`: extract player loop, HUD, collisions, boss orchestration adapters.
2. Add ownership and bounded-context map for core modules.
3. Add size guardrails (warning first, then enforcing threshold) for file/function complexity.
4. Capture major boundary decisions in ADRs.

Candidate first refactor targets:
- `packages/game/src/scenes/GameScene.ts`
- `packages/game/src/systems/BossManager.ts`
- `tools/asset-gen/src/config/asset-catalog.ts`

Acceptance criteria:
- Core gameplay and asset pipeline logic are modularized into smaller testable units.

## 4. Explicit Decision Gates (No Hasty Decisions)

These must be resolved before implementation proceeds past foundational stage:
1. Runtime validation mode in production:
   - always parse on startup vs prevalidated artifact pipeline.
2. `@sg/game` API strictness:
   - keep only `mountGame` public vs controlled broader surface.
3. E2E baseline scope:
   - smoke-only first vs gameplay-loop first.
4. Lint strictness escalation:
   - warning policy now, error policy milestone date.
5. Docs model:
   - generated docs vs hand-authored + automated consistency checks.

## 5. Milestone Plan and Exit Gates

## Milestone 0: Immediate Stabilization
- Fix build (Phaser import issue)
- Make validate chain honest
- Lint fixed on current files
Exit gate:
- `check`, `lint`, `build`, `asset:validate` green

## Milestone 1: Baseline Safety Net
- Introduce contract/content/game tests
- Enable executable e2e baseline
Exit gate:
- `test` and `test:e2e` green

## Milestone 2: Structural Enforcement
- Boundary checks + doc consistency checks
- CI workflows and branch protections active
Exit gate:
- Merge blocked unless all structural checks pass

## Milestone 3: Scalable Architecture
- Decompose oversized modules
- Add ownership map and ADR set
Exit gate:
- Reduced hotspot file complexity and improved test locality

## 6. Risk Management

Primary risks:
- Large refactors without behavioral characterization tests.
- Overly strict static checks causing false positives and bypass culture.
- Tooling drift between local and CI execution.

Mitigations:
- Add characterization tests before deep refactor.
- Roll out new checks in warn mode briefly, then enforce with date.
- Keep one shared command path for both local and CI.

## 7. Initial Backlog Shape (Implementation-Ready)

Epic A: Build Correctness and Gate Truth
- Task A1: Phaser import normalization in `packages/game`
- Task A2: Add `build` stage to root validate
- Task A3: Fix lint blockers and stabilize generated formatting

Epic B: Testing Baseline
- Task B1: Contracts schema tests
- Task B2: Content validation tests
- Task B3: Game seam lifecycle tests
- Task B4: Playwright install/config and smoke e2e

Epic C: Runtime Validation
- Task C1: Introduce parse-based content loading API
- Task C2: Add startup fail-fast and error propagation
- Task C3: Cross-reference validation tests

Epic D: Boundary and Docs Enforcement
- Task D1: Forbidden import checks
- Task D2: Package dependency direction checks
- Task D3: Doc consistency check script
- Task D4: Update drifted docs to factual state

Epic E: CI and Governance
- Task E1: Add CI workflow
- Task E2: Add PR template and branch protection requirements
- Task E3: Enforce structural gate matrix

Epic F: Scalability Refactor
- Task F1: Split `GameScene` by domain
- Task F2: Split or index large asset catalog responsibilities
- Task F3: Add module ownership map + ADRs

## 8. Definition of Done (Foundation)

The foundation is considered solid when all are true:
1. `pnpm validate` is green and includes build + real tests.
2. CI enforces the same gate chain as local.
3. Runtime content validation is parse-based, not cast-based.
4. Boundary checks block forbidden architecture violations.
5. Docs are either generated or machine-validated against repo facts.
6. Largest hotspot files have an active decomposition plan with tests in place.

---

This plan is intentionally implementation-oriented and audit-grounded. Any new structural rule added later must include:
- enforcement mechanism,
- owning script/check,
- CI integration,
- and explicit rollback strategy.
