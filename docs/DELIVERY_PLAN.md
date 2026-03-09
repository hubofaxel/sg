# Delivery Plan

Single source of planning truth for the ship-game repo.

## Current State (March 2026)

- Phase 9 complete (gameplay loop, boss encounters, drops/currency, stage progression)
- Mobile Phase B + V2 complete (edge-to-edge canvas, safe area insets, dynamic world sizing, relative touch input, HUD scaling, orientation overlay)
- 382 unit tests, 22 e2e tests — all green
- 31 asset keys cataloged, all on disk (0 validation errors)
- 2-stage campaign (6 levels, 19 waves, 2 bosses)
- `pnpm validate` green on trunk

## Near-Term Priorities

1. **Documentation and structure alignment**
   - Consolidate planning docs (this document is the single plan)
   - Keep CLAUDE.md files accurate to codebase
   - Keep agentic config references valid

2. **Quality-gate reliability**
   - Keep `pnpm validate` green on trunk
   - Expand tests around resize-sensitive behavior when regressions surface

3. **Responsive UX hardening**
   - Validate HUD/menu readability across device matrix
   - Validate input comfort on ultra-wide landscape

## Backlog

1. **Stage presentation polish** — intro cards, transitions, scene pacing
2. **Audio polish** — boss music crossfade, low-health warning mixing (`sfx-low-health` on disk, not wired)
3. **PWA polish** — offline install, low-end performance profiling
4. **VFX sprites** — generated hit/death effects (see `docs/vfx-prompt-library.md` for prompt templates)
5. **Deferred gameplay** — `beam` attack type, weak point damage multiplier, VFX sprite pools

## Deferred Assets (cataloged, not yet wired)

| Key | Phase | Status |
|-----|-------|--------|
| `music-boss` | 10 | On disk, composition plan ready |
| `sfx-low-health` | 10 | On disk |
| `sfx-telegraph` | 12 | On disk |
| `sprite-telegraph` | 12 | On disk |

## Planning Rules

- `main` is always releasable
- Feature work ships in small, reviewable branches
- Stale planning docs get archived or removed, not left active
- Runtime behavior wins over doc claims — update docs immediately after behavior changes
- One canonical doc per concern: this plan (planning), `RESPONSIVE_GAMEPLAY.md` (mobile/responsive), `asset-contracts.md` (assets), `branding.md` (brand)
