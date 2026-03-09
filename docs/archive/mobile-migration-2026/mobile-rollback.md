# Mobile Adaptation — Rollback Protocol

## When to rollback

A rollback is triggered when:
- A merged PR breaks `pnpm validate` or `pnpm test:e2e` on `main`
- Desktop keyboard input no longer functions after a mobile PR merge
- A regression is discovered that cannot be fixed forward within one session

## How to rollback

### Option A: Revert commit (preferred for single-PR regressions)

```bash
git revert --no-commit <merge-commit-sha>
# Verify the revert fixes the issue
pnpm validate
pnpm test:e2e
git commit -m "revert(scope): revert PR-N due to <reason>"
git push
```

### Option B: Reset to known-good (for cascading failures across multiple PRs)

```bash
# Identify the last known-good commit on main
git log --oneline main

# Create a recovery branch from the known-good point
git checkout -b fix/mobile-recovery <known-good-sha>

# Cherry-pick any non-mobile commits that landed after the bad merge
git cherry-pick <non-mobile-commit-sha>

# Verify
pnpm validate
pnpm test:e2e

# Merge recovery branch to main
```

## Risk-ranked PRs

| PR | Risk | Rollback trigger | What to verify before merging |
|---|---|---|---|
| PR-1 | Low | CSS layout breaks routes | All three routes render, no overflow |
| PR-2 | **High** | Desktop keyboard input stops working | Play full game loop with keyboard. Arrow keys + WASD both work. Diagonal normalization preserved. Fire rate unchanged. |
| PR-3 | Medium | Settings changes crash game or desync | Change volume mid-game. Change settings, verify persistence. |
| PR-4 | Low | HUD text unreadable or missing | Visual check at 800x600 (desktop parity) |
| PR-5 | Low | Overlay blocks gameplay or breaks layout | Play page loads, overlay does not obstruct canvas in landscape |
| PR-6 | Low | PWA/SW breaks caching | Clear cache, reload, verify game loads |

## Post-rollback procedure

1. Update `docs/mobile-state.md` rollback log with PR number, action taken, and reason.
2. Route the failure to `diagnostician` for root cause analysis.
3. Once root cause is identified, route fix to the owning agent.
4. Re-attempt the PR with the fix included.
