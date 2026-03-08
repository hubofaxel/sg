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

## 3. Wire app shell
Delegate to svelte-shell agent:
- `/play` route mounts GameCanvas
- Score display (DOM overlay via Tailwind, not Phaser text)
- Pause/resume
- Game over -> restart or return to title

## 4. Add tests
Delegate to test-runner agent:
- Schema validation tests for all content
- Game utility unit tests (collision math, score calculation)
- E2E: boot -> start -> play -> die -> restart

## 5. Quality gate
- Run `pnpm validate`
- Fix any failures
- Report final state
