Build the Stage 3 vertical slice — one complete playable loop.

This is a multi-step orchestration. Follow this order:

## 1. Verify foundations (Stage 1-2 must be complete)
- Schemas exist in `@sg/contracts` for: ship, weapon, enemy, wave, settings, save
- Content exists in `@sg/content` with valid sample data
- `mountGame()` works and renders a canvas
- Scene chain is wired: BootScene -> PreloadScene -> GameScene

## 2. Implement gameplay loop
Delegate to phaser-integrator agent:
- Ship movement (keyboard: cursor keys + WASD)
- Shooting (basic weapon from content data)
- One enemy type (from content data)
- One wave (from content data)
- Collision detection (bullets vs enemies, enemies vs player)
- Health/lives system
- Score tracking
- Death -> restart loop
- **Write handoff file** to `.dev-logs/handoffs/<branch>.json` (see root CLAUDE.md)

## 3. Wire app shell
Delegate to svelte-shell agent. It reads the handoff file from step 2:
- `/play` route mounts GameCanvas
- Score display (DOM overlay via Tailwind, not Phaser text)
- Pause/resume
- Game over -> restart or return to title
- **Update handoff file** with its own changes appended to the files list

## 4. Add tests
Delegate to test-runner agent. It reads the handoff file from step 3:
- Schema validation tests for all content
- Game utility unit tests (collision math, score calculation)
- E2E: boot -> start -> play -> die -> restart
- **Update handoff file** with test files appended

## 5. Quality gate
- Run `pnpm validate`
- Fix any failures
- Report final state

## Failure recovery
If any step fails:
1. Do NOT proceed to the next step
2. Run `pnpm validate` to assess current state
3. The branch preserves all work completed so far
4. Report the failure step, error output, and branch name
5. The human decides: fix and continue, revert, or debug
