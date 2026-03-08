Ship current changes to main using trunk-based workflow.

Steps:
1. `git status` — report current branch and working tree state
2. If uncommitted changes exist, stage and commit with conventional message
3. Run `pnpm validate` — full quality sweep (check + lint + test)
4. If any failures, fix them before proceeding
5. `git checkout main && git merge --ff-only <branch>`
6. If ff-only fails: `git checkout <branch> && git rebase main`, re-validate, retry merge
7. Delete merged branch: `git branch -d <branch>`
8. Report final state — do NOT push (human decides)
