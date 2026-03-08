Create a new Phaser 4 scene and wire it into the game runtime.

Scene name: $ARGUMENTS

Steps:
1. Read the phaser4-rc skill for API patterns
2. Read existing scenes in `packages/game/src/scenes/` to follow conventions
3. Create `packages/game/src/scenes/$ARGUMENTS.ts` extending Phaser.Scene
4. Register in scene manifest / game config
5. Wire transition from the appropriate preceding scene
6. Verify clean create/destroy lifecycle
7. Run `pnpm --filter @sg/game check`
8. Report results
