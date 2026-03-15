Show agentic development status — a single-command view of project state.

## Steps

1. **Tasks** — Read `docs/tasks.json`. Show counts by status (done, in-progress, pending, blocked). List any in-progress or blocked tasks with their id, title, and assignee.

2. **Agent sessions** — If `.dev-logs/agent-sessions.jsonl` exists, show the last 5 entries (which agents started/stopped recently).

3. **In-flight handoffs** — List files in `.dev-logs/handoffs/`. For each, show the agent, status, and branch from the JSON.

4. **Branches** — Run `git branch -v`. Flag any branches that appear to relate to tasks in tasks.json.

5. **Recent activity** — If `.dev-logs/agent-audit.jsonl` exists, show the last 10 entries (agent, tool, file, timestamp).

6. **Quality gate** — Report whether `pnpm validate` was last run successfully. Check for any `pnpm-lock.yaml` changes or uncommitted work via `git status --short`.

7. **Summary** — One paragraph: what's active, what's next, any blockers.
