# Agentic Infrastructure Plan — ship-game

**Date:** March 14, 2026
**Status:** Directive (consultant review — no code changes)
**Target runtime:** Claude Code CLI v2.1.x, Opus 4.6, Agent Teams (experimental)
**Scope:** Context management, state management, observability, MCP, agent roles, roadmap/task architecture

---

## 1. Situation

The project has a well-structured agentic development framework: seven agents with role boundaries, nine skills, four hook types, seven slash commands, and a CI pipeline that mirrors local validation. Documentation-as-control-plane is the correct paradigm and it's working.

What's missing — as the delivery plan now articulates — falls into three categories: agents can't see each other's work (no shared state), there's no machine-readable task tracking (planning is prose), and the human is the message bus (no direct agent-to-agent coordination). These aren't nice-to-haves. They're the bottleneck preventing the next level of autonomy.

The good news: Claude Code's March 2026 feature set — Agent Teams, persistent memory, SubagentStart/Stop hooks, per-agent MCP scoping, file-locking task coordination — provides native primitives for every gap identified. The plan below uses these primitives directly rather than building custom infrastructure.

---

## 2. Design Principles

**Use platform primitives.** Claude Code now has Agent Teams with shared task lists, persistent memory directories, subagent-scoped hooks, and file-based coordination with locking. Use these instead of inventing parallel systems.

**File-based state, git-tracked where appropriate.** State that agents need across sessions should live in files (JSONL, JSON, markdown) under `.claude/` or `.dev-logs/`. No databases, no external services. The project is client-side; the infrastructure should be too.

**Incremental adoption.** Each section below is independently shippable. Don't try to land everything at once. The dependency order is: context management → state management → task architecture → observability → Agent Teams integration.

**Consultant boundary.** This document defines what to build and why. Implementation is delegated to agents via commands and directives.

---

## 3. Context Management

### 3.1 Current state
The context budget table in AGENTS.md is static (manually maintained in `gen-agents-md.sh`). Estimated totals range from ~0.5k to ~2.9k tokens. The guideline ("avoid loading more than 2 skills simultaneously") is instructional only — nothing enforces it.

### 3.2 What to change

**Enable persistent memory for complex agents.** Claude Code now supports a `memory` field in agent frontmatter. Agents that accumulate institutional knowledge across sessions should use it.

```yaml
# .claude/agents/phaser-integrator.md (frontmatter addition)
memory: project
```

This creates `.claude/agent-memory/phaser-integrator/MEMORY.md` — a curated knowledge base that persists across sessions. The agent reads it on startup and updates it after shipping work. The phaser-integrator, diagnostician, and asset-pipeline agents benefit most.

Scope recommendations:
- `phaser-integrator` → `project` (game-specific knowledge, shareable via git)
- `diagnostician` → `project` (runtime issues are project-specific)
- `asset-pipeline` → `project` (prompt tuning, acceptance criteria learnings)
- `pr-shipper` → none (stateless by design)
- `schema-validator` → none (schema patterns are in the skill)
- `svelte-shell` → `local` (route state, not worth sharing)
- `test-runner` → `local` (test patterns, not worth sharing)

**Add memory maintenance instructions to agent definitions.** Each agent with `memory` enabled should have a "Memory" section in its markdown body:

```markdown
## Memory

After completing a task, update your agent memory with:
- API quirks or workarounds discovered
- Patterns that worked or failed
- File paths and system relationships that took multiple reads to find
- Decisions made and their rationale

Before starting a task, consult your memory for relevant prior context.
```

**Automate the context budget table.** Replace the static budget section in `gen-agents-md.sh` with a word-count pass over the actual files. This prevents the table from going stale.

```bash
# Pseudocode for gen-agents-md.sh enhancement
for agent in .claude/agents/*.md; do
  agent_words=$(wc -w < "$agent")
  # Parse skills from frontmatter, sum their word counts
  # Parse package CLAUDE.md from agent's scope
  # Output row with calculated totals
done
```

### 3.3 What NOT to do

Don't build a dynamic skill loader that selectively injects skills based on task analysis. The `skills` frontmatter field already handles this — skills listed there are injected at subagent startup. The current static assignment is correct and predictable.

Don't try to compress or summarize CLAUDE.md files to save context. They're already concise. The bottleneck isn't instruction size — it's inter-session knowledge loss, which persistent memory addresses.

---

## 4. State Management

### 4.1 Current state
Each agent session starts fresh. The only shared state is the git repo itself. The HANDOFF protocol is well-defined but requires a human to copy-paste between sessions. The audit log (`.dev-logs/agent-audit.jsonl`) is append-only and not queryable by agents.

### 4.2 What to change

**Adopt file-based HANDOFF relay.** Instead of human copy-paste, agents write HANDOFF blocks to a known file path:

```
.dev-logs/handoffs/<branch-name>.json
```

Schema:
```json
{
  "agent": "phaser-integrator",
  "branch": "feat/stage-3-loop",
  "status": "done",
  "files": ["packages/game/src/scenes/GameScene.ts", "..."],
  "blockers": null,
  "notes": "Ship movement uses pointer events, not keyboard-only. See phaser4-rc skill for pointer API.",
  "timestamp": "2026-03-14T12:00:00Z"
}
```

The next agent in a multi-step workflow reads this file instead of receiving a pasted HANDOFF block. The human's role shifts from "message bus" to "approval gate" — they trigger the next agent but don't need to relay content.

Update the root CLAUDE.md HANDOFF protocol section to document this file-based relay path. Update pr-shipper to read the file list from the handoff file.

**Make the audit log queryable.** Add a small script (`tools/scripts/audit-query.sh`) that filters `.dev-logs/agent-audit.jsonl` by agent, date range, or file path. Agents (especially the diagnostician) can call this to answer "what changed recently?"

```bash
# Example usage
bash tools/scripts/audit-query.sh --since "1 hour ago" --file "packages/game/"
bash tools/scripts/audit-query.sh --agent "phaser-integrator" --last 20
```

**Enhance the audit log hook.** The current PostToolUse hook records tool, file, and timestamp. Add agent name (from `$CLAUDE_AGENT_NAME` if available, else "main") and the tool's exit status. This makes the log useful for tracing failures.

**Add a session state file.** When an agent starts work on a branch, write a lightweight state file:

```
.dev-logs/sessions/<branch-name>.json
```

Schema:
```json
{
  "branch": "feat/stage-3-loop",
  "startedBy": "phaser-integrator",
  "startedAt": "2026-03-14T12:00:00Z",
  "status": "in-progress",
  "lastActivity": "2026-03-14T12:45:00Z",
  "handoffs": ["phaser-integrator → svelte-shell"]
}
```

This gives any agent a way to check "is someone already working on this branch?" and "what's the workflow state?"

### 4.3 What NOT to do

Don't build an external state store (Redis, SQLite, etc.). File-based state in `.dev-logs/` is sufficient for a single-developer project. It's git-ignorable, readable by any agent via `cat`/`jq`, and doesn't require infrastructure.

Don't try to make agents resume mid-task from saved state. Claude Code's session resumption (`/resume`) handles this natively. The file-based state is for cross-session coordination, not intra-session recovery.

---

## 5. Task and Roadmap Architecture

### 5.1 Current state
`docs/DELIVERY_PLAN.md` is a prose document. Priorities are numbered paragraphs with unstructured descriptions. There are no lifecycle states, no subtask tracking, no acceptance criteria, no size estimates, and no agent assignment.

### 5.2 What to change

**Create a machine-readable task file alongside the prose plan.** Don't replace `DELIVERY_PLAN.md` — it serves a different purpose (human-readable strategic context). Add a structured companion:

```
docs/tasks.json
```

Schema:
```json
{
  "tasks": [
    {
      "id": "agent-state-handoff",
      "title": "Implement file-based HANDOFF relay",
      "priority": 1,
      "status": "pending",
      "assignee": null,
      "depends": [],
      "acceptance": [
        "Agents write HANDOFF to .dev-logs/handoffs/<branch>.json",
        "pr-shipper reads file list from handoff file",
        "Root CLAUDE.md documents the file-based relay path"
      ],
      "size": "M",
      "parent": "agent-state-infrastructure"
    }
  ]
}
```

Lifecycle states: `pending` → `assigned` → `in-progress` → `review` → `done` | `blocked`

**Create a task management command.** Add `/tasks` as a slash command that reads `docs/tasks.json` and presents current state, next available work, and blocked items. This becomes the entry point for "what should I work on next?"

```markdown
# .claude/commands/tasks.md
Read and manage the structured task list.

Steps:
1. Read `docs/tasks.json`
2. Show tasks grouped by status
3. If asked "what's next?", find the highest-priority unblocked pending task
4. If asked to update, modify the JSON and report the change
5. If a task is completed, check if it unblocks any dependent tasks
```

**Integrate tasks with /check and /land.** Update `/check` to append task-relevant context: "These failures relate to task X which is assigned to agent Y." Update `/land` to prompt for task completion: "This branch appears to complete task X. Mark it as done?"

**Keep DELIVERY_PLAN.md as the strategic layer.** It answers "why" and "what's the vision." `docs/tasks.json` answers "what's the next concrete step." The plan references task IDs; tasks reference the plan section they serve.

### 5.3 What NOT to do

Don't use a third-party task tracker (Jira, Linear, GitHub Issues). The tasks need to be readable by agents in the file system. External tools add latency, authentication complexity, and MCP dependencies for something that a JSON file handles perfectly.

Don't over-structure the task schema. The fields above are sufficient. Adding story points, sprint assignments, time tracking, or custom fields creates maintenance burden without proportional value for a single-developer project.

---

## 6. Agent-to-Agent Communication

### 6.1 Current state
The human is the message bus. Agent A outputs a HANDOFF block, the human pastes it to Agent B. The diagnostician can't notify the phaser-integrator of a runtime error. `/check` can't auto-dispatch failures.

### 6.2 What to change: adopt Agent Teams for multi-agent workflows

Claude Code's Agent Teams feature (experimental, v2.1.32+) provides exactly what's missing: a shared task list with dependency tracking, an inbox-based messaging system, file-locking for task claims, and direct teammate-to-teammate communication.

**Enable Agent Teams:**
```json
// .claude/settings.json addition
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Redesign /vertical-slice as an Agent Team workflow.** Instead of sequential delegation with human relay, `/vertical-slice` becomes:

```markdown
Create an agent team for the Stage 3 vertical slice:
- phaser-integrator teammate: implement gameplay loop
- svelte-shell teammate: wire app shell (depends on gameplay loop)
- test-runner teammate: add test coverage (depends on app shell)

Require plan approval before implementation.
Use Sonnet for svelte-shell and test-runner, Opus for phaser-integrator.
```

The lead coordinates task dependencies. Teammates self-claim work as predecessors complete. The human monitors and steers but doesn't relay messages.

**Add TeammateIdle and TaskCompleted hooks for quality gates:**

```json
// .claude/settings.json hooks addition
{
  "TeammateIdle": [{
    "hooks": [{
      "type": "command",
      "command": "bash tools/scripts/teammate-idle-check.sh"
    }]
  }],
  "TaskCompleted": [{
    "hooks": [{
      "type": "command",
      "command": "bash tools/scripts/task-completion-gate.sh"
    }]
  }]
}
```

The `task-completion-gate.sh` runs `pnpm validate` scoped to the completed task's file list. If validation fails, it exits with code 2 to block completion and send feedback.

**Redesign /check as a dispatcher.** Currently `/check` reports failures and suggests which agent should fix them. With Agent Teams, `/check` can spawn teammates to fix failures directly:

```markdown
# Updated /check concept
Run `pnpm validate`. For each failure category:
- Type errors → spawn a teammate using the relevant agent definition
- Test failures → spawn test-runner teammate
- Asset validation → spawn asset-pipeline teammate
Require plan approval before any teammate makes changes.
Report consolidated results when all teammates finish.
```

### 6.3 Migration path

Agent Teams is experimental. The migration should be gradual:

**Phase 1 (now):** Enable the feature flag. Use Agent Teams for ad-hoc parallel work (debugging, research). Keep existing sequential workflows intact.

**Phase 2 (after confidence builds):** Migrate `/vertical-slice` to use Agent Teams. Keep the sequential fallback in the command for cases where teams aren't appropriate.

**Phase 3 (when stable):** Migrate `/check` dispatcher pattern. Add TeammateIdle/TaskCompleted hooks.

### 6.4 What NOT to do

Don't build a custom message bus. Agent Teams provides inbox-based messaging natively. Don't try to make agents communicate via file writes — the platform handles this.

Don't run Agent Teams unattended for long workflows. The docs are explicit: "monitor and steer" is the expected human role. The human shifts from message bus to supervisor, not to absent.

---

## 7. Agentic Observability

### 7.1 Current state
The audit log hook records tool, file, and timestamp in `.dev-logs/agent-audit.jsonl`. The dev server error check surfaces Vite errors after edits. There's no structured logging of agent sessions, no performance tracking, and no way to trace a multi-agent workflow end-to-end.

### 7.2 What to change

**Enhance the audit log schema.** Current:
```json
{"ts": "...", "tool": "Edit", "file": "packages/game/src/scenes/GameScene.ts"}
```

Enhanced:
```json
{
  "ts": "2026-03-14T12:00:00Z",
  "agent": "phaser-integrator",
  "branch": "feat/stage-3-loop",
  "tool": "Edit",
  "file": "packages/game/src/scenes/GameScene.ts",
  "hookResult": "ok"
}
```

The `agent` field comes from `$CLAUDE_AGENT_NAME` (available in Claude Code's hook environment for subagents and teammates). The `branch` comes from `git branch --show-current`. The `hookResult` indicates whether the PostToolUse hooks (format, vite check) succeeded.

**Add SubagentStart/SubagentStop hooks for session tracking:**

```json
{
  "SubagentStart": [{
    "hooks": [{
      "type": "command",
      "command": "echo \"{\\\"ts\\\":\\\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\\",\\\"event\\\":\\\"start\\\",\\\"agent\\\":\\\"$CLAUDE_AGENT_NAME\\\",\\\"branch\\\":\\\"$(git branch --show-current 2>/dev/null || echo main)\\\"}\" >> .dev-logs/agent-sessions.jsonl"
    }]
  }],
  "SubagentStop": [{
    "hooks": [{
      "type": "command",
      "command": "echo \"{\\\"ts\\\":\\\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\\",\\\"event\\\":\\\"stop\\\",\\\"agent\\\":\\\"$CLAUDE_AGENT_NAME\\\",\\\"branch\\\":\\\"$(git branch --show-current 2>/dev/null || echo main)\\\"}\" >> .dev-logs/agent-sessions.jsonl"
    }]
  }]
}
```

This creates `.dev-logs/agent-sessions.jsonl` — a log of when agents started and stopped. Combined with the audit log, you can reconstruct "agent X worked on branch Y from T1 to T2 and touched files A, B, C."

**Create an observability query command.** Add `/status` as a slash command:

```markdown
# .claude/commands/status.md
Show agentic development status.

Steps:
1. Read `docs/tasks.json` — show task summary by status
2. Read `.dev-logs/agent-sessions.jsonl` — show recent agent activity
3. Read `.dev-logs/handoffs/` — show in-flight workflows
4. `git branch -v` — show active branches
5. Tail `.dev-logs/agent-audit.jsonl` — show last 10 actions
6. Report current state in a concise summary
```

This gives the human (or any agent) a single-command view of "what's happening in this project right now."

**Front-end observability (browser).** The existing dev server error check hook covers compilation errors. For runtime observability, the diagnostician agent already uses Chrome DevTools MCP. No additional tooling needed — the diagnostician's role is the observability layer for the running game. Ensure the diagnostician's persistent memory captures recurring runtime patterns.

### 7.3 What NOT to do

Don't build a dashboard. The observability data is in JSONL files. The `/status` command synthesizes it on demand. A web dashboard adds maintenance burden for a single-developer project.

Don't log tool inputs or outputs. The audit log should track what happened (tool + file), not the content of every edit. Content is in git history. Logging full tool I/O would blow up the log size.

---

## 8. MCP Server Consolidation

### 8.1 Current state
Four MCP servers configured in `.mcp.json`: filesystem, chrome-devtools, playwright, github. These are all third-party/Anthropic servers. No project-specific MCP server.

### 8.2 What to change

**Scope MCP servers to the agents that need them.** Currently all agents see all MCP tools in their context. Chrome-devtools and playwright are only used by the diagnostician and test-runner. GitHub is only used by pr-shipper.

Use the `mcpServers` frontmatter field to scope servers to specific agents:

```yaml
# .claude/agents/diagnostician.md (frontmatter)
mcpServers:
  - chrome-devtools
  - playwright

# .claude/agents/test-runner.md (frontmatter)
mcpServers:
  - playwright

# .claude/agents/pr-shipper.md (frontmatter)
mcpServers:
  - github
```

Then consider removing chrome-devtools and playwright from the global `.mcp.json` and defining them as inline servers in the agent definitions. This keeps MCP tool descriptions out of the main session's context window — they only load when the relevant agent is invoked.

**Consider a project-specific MCP server for task/state queries.** If the file-based state (tasks.json, handoffs, audit log) grows complex enough that `jq` one-liners become unwieldy, wrap the query layer in a small MCP server:

```json
// .mcp.json potential addition
{
  "sg-project": {
    "command": "node",
    "args": ["tools/mcp/project-server.js"]
  }
}
```

Exposing tools like `get_tasks`, `get_handoff`, `get_recent_activity`, `update_task_status`. This is optional — start with the file-based approach and only build the MCP server if agents struggle with raw jq queries.

### 8.3 What NOT to do

Don't add MCP servers speculatively. Each server adds startup latency and context consumption. Only add servers that solve a concrete problem an agent is currently facing.

---

## 9. Agent Roles and Responsibilities — Revised

The current seven-agent roster is well-designed. The changes below are adjustments, not a restructuring.

### 9.1 Updates to existing agents

**phaser-integrator:** Add `memory: project`. Add `isolation: worktree` for large features (so it can work on game code without blocking other agents on the same branch). This is optional per-invocation, not default.

**diagnostician:** Add `memory: project`. Scope MCP servers (chrome-devtools, playwright). Add instruction to check handoff files and recent audit log entries when diagnosing issues — "check what changed recently" should be the first diagnostic step.

**pr-shipper:** Update to read HANDOFF from `.dev-logs/handoffs/<branch>.json` instead of requiring pasted HANDOFF blocks. Add GitHub MCP scoping. Add instruction to update `docs/tasks.json` status when landing work.

**asset-pipeline:** Add `memory: project`. The prompt tuning and acceptance criteria learnings are high-value persistent knowledge.

**test-runner:** Scope MCP server (playwright only). No memory needed — test patterns are in the skill.

**svelte-shell:** Add `memory: local`. Route and component state changes are useful within a dev session but not worth committing.

**schema-validator:** No changes. This agent is correctly scoped and stateless.

### 9.2 New agent: orchestrator

Consider adding an orchestrator agent that doesn't write code but manages multi-agent workflows:

```yaml
---
name: orchestrator
description: Coordinates multi-agent workflows, manages task state, and monitors progress. Use for complex features that span multiple agents.
tools: Read, Bash, Glob, Grep
disallowedTools: Write, Edit
model: opus
skills:
  - trunk-based-dev
  - monorepo-conventions
---
```

This agent's job is to read the task list, check handoff files, assess workflow state, and decide what to do next. It's the "lead" in Agent Teams terminology. It doesn't touch code — it reads, plans, and dispatches.

This is optional. The human currently fills this role effectively. Add it only if multi-agent workflows become frequent enough that the coordination overhead justifies a dedicated coordinator.

---

## 10. Implementation Sequence

Each phase is independently shippable. Estimated sizes are relative.

### Phase 1: Foundation — SHIPPED
- ~~Enable persistent memory on phaser-integrator, diagnostician, asset-pipeline~~
- ~~Add memory maintenance instructions to those agent definitions~~
- ~~Automate context budget calculation in `gen-agents-md.sh`~~
- ~~Enhance audit log schema (add agent, branch, hookResult)~~

### Phase 2: State layer — SHIPPED
- ~~Implement file-based HANDOFF relay (`.dev-logs/handoffs/`)~~
- ~~Update CLAUDE.md HANDOFF protocol section~~
- ~~Update pr-shipper to read handoff files~~
- ~~Add `tools/scripts/audit-query.sh`~~
- ~~Add session state files (`.dev-logs/sessions/`)~~
- ~~Add SubagentStart/SubagentStop hooks~~ (pulled forward from Phase 4)

### Phase 3: Task architecture (M — 1-2 branches)
- Create `docs/tasks.json` schema and initial data (migrate from DELIVERY_PLAN.md priorities)
- Add `/tasks` command
- Update `/check` and `/land` to reference tasks
- Keep DELIVERY_PLAN.md as strategic layer, add task ID cross-references

### Phase 4: Observability (S — 1 branch)
- ~~Add SubagentStart/SubagentStop hooks~~ (shipped in Phase 2)
- ~~Create `.dev-logs/agent-sessions.jsonl`~~ (shipped in Phase 2)
- Add `/status` command
- Scope MCP servers to relevant agents

### Phase 5: Agent Teams integration (L — experimental, ongoing)
- Enable Agent Teams feature flag
- Test with ad-hoc parallel work
- Migrate `/vertical-slice` to Agent Teams
- Add TeammateIdle/TaskCompleted quality gate hooks
- Consider `/check` dispatcher pattern
- Evaluate orchestrator agent need

### Phase 6: Refinement (ongoing)
- Evaluate whether project-specific MCP server is needed for state queries
- Tune persistent memory instructions based on actual memory file quality
- Archive completed workflow state files
- Update DELIVERY_PLAN.md to reflect completed infrastructure

---

## 11. What Success Looks Like

After Phase 4, you should be able to:

1. **Start a new agent session** and have it immediately know what other agents have done recently (via persistent memory + handoff files + audit log)
2. **Run `/tasks`** and see a structured view of what needs doing, what's in progress, and what's blocked
3. **Run `/status`** and see a unified view of agent activity, branch state, and workflow progress
4. **Have pr-shipper land a branch** and automatically update task status without human intervention
5. **Run `/check`** and get failure reports that reference specific tasks and responsible agents

After Phase 5, additionally:

6. **Run `/vertical-slice`** and have multiple agents coordinate through Agent Teams — the human monitors and steers but doesn't relay messages
7. **Have quality gates** (TeammateIdle, TaskCompleted hooks) catch issues before they merge
8. **See end-to-end workflow traces** from agent-sessions.jsonl that show who worked on what, when, and for how long

---

## 12. Risks and Mitigations

**Agent Teams is experimental.** Known limitations include no session resumption for in-process teammates, task status lag, and one team per session. Mitigation: keep the sequential fallback in all commands. Don't depend on Agent Teams for critical-path work until it's stable.

**Persistent memory can accumulate noise.** If agents write too much or too little to their memory files, the feature becomes useless or harmful. Mitigation: include explicit curation instructions ("keep MEMORY.md under 200 lines, remove stale entries"). Review memory files periodically.

**File-based state can go stale.** Handoff files and session state files need cleanup. Mitigation: add a git hook or `/land` step that archives completed workflow state. Alternatively, `.dev-logs/` is already gitignored — let it accumulate and periodically delete old files.

**Task JSON can drift from DELIVERY_PLAN.md.** Two sources of planning truth is a risk. Mitigation: DELIVERY_PLAN.md is strategic (why/vision), tasks.json is tactical (what/next). They serve different audiences. Cross-reference with task IDs. The `/tasks` command reads tasks.json, not the plan.

---

## Appendix: Capability Matrix (March 2026 Claude Code)

| Capability | Status | Relevance |
|---|---|---|
| Agent definitions (`.claude/agents/`) | Stable | Already using — enhance with memory, MCP scoping |
| Skills (`.claude/skills/`) | Stable | Already using — no changes needed |
| Commands (`.claude/commands/`) | Stable | Already using — add `/tasks`, `/status` |
| Hooks (14 lifecycle events) | Stable | Add SubagentStart/Stop, TeammateIdle, TaskCompleted |
| Persistent memory (`memory` field) | Stable | Not yet using — adopt for 3 agents |
| MCP server scoping per agent | Stable | Not yet using — scope chrome-devtools, playwright, github |
| Agent Teams | Experimental (v2.1.32+) | Not yet using — Phase 5 adoption |
| Background subagents | Stable | Not yet using — useful for parallel research |
| Subagent hooks (frontmatter) | Stable | Not yet using — add validation hooks |
| `isolation: worktree` | Stable | Not yet using — useful for parallel implementation |
| PreToolUse input modification | Stable (v2.0.10+) | Not yet using — potential for sandboxing |
| Subagent auto-compaction | Stable | Automatic — no configuration needed |
