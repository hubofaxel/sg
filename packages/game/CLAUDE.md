# packages/game — Phaser 4 runtime

- This package is the ONLY place Phaser is imported
- Export surface: `mountGame`, `GameHandle`, scene enum, event types
- Scenes: BootScene -> PreloadScene -> MenuScene -> GameScene
- Fixed-step game loop — do not use variable-step
- All assets referenced by key from a central manifest, not inline paths
- Pin phaser at exact RC version in package.json — caret/tilde forbidden
- Game events communicate to the Svelte shell via the GameHandle event emitter
- Clean destroy behavior required: no orphaned listeners, textures, or timers

## Asset manifest loading

- PreloadScene fetches `/assets/asset-manifest.json` at boot
- Manifest is validated against `AssetManifestSchema` from `@sg/contracts`
- Each manifest entry drives a Phaser loader call:
  - `sprite-sheet` → `this.load.spritesheet(key, path, frameConfig)`
  - `image` → `this.load.image(key, path)`
  - `audio` → `this.load.audio(key, paths)`
- Asset keys in game code must match content data keys exactly
- No hardcoded file paths in scene code — always look up from manifest
