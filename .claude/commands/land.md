Ship current changes to main using trunk-based workflow.

Steps:
1. `git status` — report current branch and working tree state
2. If uncommitted changes exist, stage and commit with conventional message
3. Run `pnpm validate` — full quality sweep (check + lint + test)
4. If any failures, fix them before proceeding
5. Read `docs/tasks.json` — check if the current branch relates to any `in-progress` or `assigned` tasks. If so, ask: "This branch appears to complete task `<id>`. Mark it as done?" If confirmed, update the task status to `done` and check if it unblocks dependent tasks.
6. `git checkout main && git merge --ff-only <branch>`
7. If ff-only fails: `git checkout <branch> && git rebase main`, re-validate, retry merge
8. Delete merged branch: `git branch -d <branch>`
9. Clean up: remove `.dev-logs/handoffs/<branch>.json` if it exists
10. Report final state — do NOT push (human decides)
