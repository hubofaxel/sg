Read and manage the structured task list.

The task file is `docs/tasks.json`. It is the tactical companion to `docs/DELIVERY_PLAN.md` (strategic).

Lifecycle: `pending` → `assigned` → `in-progress` → `review` → `done` | `blocked`

## Steps

1. Read `docs/tasks.json`
2. Show tasks grouped by status, ordered by priority within each group
3. For each task show: id, title, status, priority, assignee, size, dependencies
4. If the user asks "what's next?", find the highest-priority unblocked `pending` task (no unmet `depends`)
5. If the user asks to update a task, modify the JSON file and report the change
6. If a task is marked `done`, check if it unblocks any dependent tasks and report them
7. If the user asks to add a task, append it with a unique id, `pending` status, and the fields from the schema

## Task schema fields

- `id`: unique kebab-case identifier
- `title`: short description
- `priority`: integer (1 = highest)
- `status`: lifecycle state
- `assignee`: agent name or null
- `depends`: array of task ids that must be `done` first
- `acceptance`: array of concrete acceptance criteria strings
- `size`: S, M, or L
- `parent`: id of parent task (for subtasks) or null
- `plan`: reference to DELIVERY_PLAN.md section
