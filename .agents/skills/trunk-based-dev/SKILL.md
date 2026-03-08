---
name: trunk-based-dev
description: Branch strategy and atomic shipping workflow. Load when committing, branching, or shipping changes.
---

## Trunk-Based Development

### Branch rules
- `main` is always deployable
- Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `test/<slug>`
- Branches are short-lived — merge within hours, not days
- No long-running develop/staging branches

### /land workflow
1. `git status --porcelain` — must be clean or all changes staged
2. `pnpm validate` — check + lint + test
3. If green: `git checkout main && git merge --ff-only feat/<slug>`
4. If merge conflict: rebase feature branch onto main, re-validate, retry
5. Delete merged branch: `git branch -d feat/<slug>`
6. Human pushes when ready — agents never push

### Commit discipline
- Conventional commits: `type(scope): imperative description`
- Types: feat, fix, chore, test, docs, refactor, style, perf
- Scopes: web, game, contracts, content, ui, asset-gen, repo
- Imperative mood: "add weapon schema" not "added weapon schema"
- One logical change per commit
- Never `--no-verify`
- GPG signed

### Pre-commit checklist
1. All files formatted (`pnpm format`)
2. No lint errors (`pnpm lint`)
3. Types check (`pnpm check`)
4. Tests pass (`pnpm test --run`)
