# Delivery Plan

This is the active planning document for the repo.

## Current Objectives

1. Responsive gameplay across modern mobile/tablet aspect ratios.
2. Documentation and planning consistency after architecture refactors.

## Status Snapshot

- Monorepo, contracts/content/runtime seam are in place and actively used.
- Gameplay loop, boss encounter, drops/currency, and mobile input are implemented.
- Adaptive world width + centered safe zone are implemented.
- Remaining work is primarily polish, consistency, and hardening.

## Near-Term Priorities

1. Responsive UX hardening
- Validate HUD/menu readability across device matrix.
- Validate input comfort and gameplay clarity in ultra-wide landscape.
- Add regression tests where practical for scale/resize edge cases.

2. Documentation stability
- Keep `RESPONSIVE_GAMEPLAY.md` aligned with implementation.
- Keep this plan current and archive superseded directives instead of editing them in place.
- Prefer one canonical doc per concern (architecture, planning, assets, branding).

3. Quality-gate reliability
- Keep `pnpm validate` green on trunk.
- Expand tests around resize-sensitive behavior when regressions are found.

## Backlog (After Near-Term)

1. Stage presentation polish
- Intro cards, transitions, and stronger scene pacing cues.

2. Audio polish
- Variation/crossfade behavior and low-health warning mixing.

3. Product polish
- PWA install/offline refinements and low-end performance profiling.

## Planning Rules

- `main` is always treated as releasable.
- Feature work ships in small, reviewable branches.
- Any stale planning doc gets archived, not silently left active.
- Runtime behavior wins over doc claims; update docs immediately after behavior changes.
