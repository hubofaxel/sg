# packages/game — Phaser 4 runtime

- This package is the ONLY place Phaser is imported
- Export surface: `mountGame`, `GameHandle`, scene enum, event types
- Scenes: BootScene -> PreloadScene -> MenuScene -> GameScene
- Fixed-step game loop — do not use variable-step
- All assets referenced by key from a central manifest, not inline paths
- Pin phaser at exact RC version in package.json — caret/tilde forbidden
- Game events communicate to the Svelte shell via the GameHandle event emitter
- Clean destroy behavior required: no orphaned listeners, textures, or timers
