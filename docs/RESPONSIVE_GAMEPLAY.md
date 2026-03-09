# Responsive Gameplay Architecture

This document is the current source of truth for aspect ratio behavior and mobile gameplay visibility.

## Goals

- Fill modern landscape phone viewports without side letterboxing where possible.
- Keep gameplay density and authored enemy patterns consistent across aspect ratios.
- Keep HUD/menu text readable on small displays.
- Keep gameplay content visually centered and anchored predictably.

## Rendering Pipeline

1. Shell viewport
- `apps/web/src/routes/play/+page.svelte`
- `.play-page` uses `100dvw x 100dvh` and safe-area padding.

2. Canvas container
- `apps/web/src/lib/components/GameCanvas.svelte`
- `.game-container` spans full shell and centers the canvas.

3. World size computation
- `packages/game/src/systems/SafeZone.ts`
- `computeWorldSize(containerWidth, containerHeight)` keeps world height fixed at `600` and computes width by aspect ratio.
- Width is clamped to `800..1340`.

4. Phaser display scale
- `packages/game/src/mountGame.ts`
- Phaser uses `Scale.FIT`; canvas is centered by shell CSS (Phaser auto-center is disabled).
- FIT applies the final world->display scale factor.

## Coordinate Model

- Play-authoring safe zone is always `800x600`, centered in the world.
- World may be wider than `800` on ultra-wide displays; this creates horizontal gutters.
- Enemy spawn density is authored against safe-zone width, not full world width.

## HUD and Text Rules

- HUD anchors to safe-zone origin, not world origin.
  - Implementation: `packages/game/src/systems/HudManager.ts`
- HUD/menu/boss text uses text scale with a floor of `1.0` to avoid double shrink with FIT.
  - Implementation: `packages/game/src/systems/HudScale.ts`
- Dynamic text layout updates on resize for gameplay HUD and menu scene.
  - Implementations: `HudManager.ts`, `MenuScene.ts`

## Current Constraints

- World height remains fixed at `600` for gameplay consistency.
- Portrait play is not supported; rotate overlay is the expected UX for portrait orientation.
- Extremely wide displays are clamped by `MAX_WORLD_WIDTH` to bound authored-space drift.

## Verification Checklist

Run:

```bash
pnpm test -- packages/game/src/systems/HudScale.test.ts
pnpm test -- packages/game/src/systems/SafeZone.test.ts
pnpm check
```

Manual viewport checks:

- 4:3 (`800x600`) — no gutter; HUD at gameplay top-left.
- 16:9 (`1920x1080` equivalent) — centered safe zone with side gutters.
- 20:9 (`960x432` equivalent) — no letterbox; HUD aligned with safe-zone left edge; text readable.
- iPad landscape (`1024x768` equivalent) — centered gameplay and readable text.
