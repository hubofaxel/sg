Add a new asset key to the asset pipeline.

Asset: $ARGUMENTS (e.g. "enemy-scout sprite-sheet enemies 48x48 2frames")

Steps:
1. Determine source strategy: `generated-final`, `generated-source`, `code-drawn`, or `deferred`
   - If the asset is <32px shipped size, default to `code-drawn` (implement as Phaser drawing API / tweens)
   - If code-drawn or deferred, document in `docs/asset-contracts.md` and stop here
2. Add a contract entry in `docs/asset-contracts.md` with: key, strategy, owning system, dimensions, acceptance criteria, status
3. Add an `AssetCatalogEntry` to `tools/asset-gen/src/config/asset-catalog.ts`
4. If the asset needs AI generation, add a prompt template to `tools/asset-gen/src/config/prompt-templates.ts`
   - For sprites: describe frame layout, pixel dimensions, animation delta, distinct silhouette, specific colors, personality
   - For audio: describe sound character, duration feel, context in gameplay
5. If a new asset type is needed (beyond sprite-sheet, image, audio), update `packages/contracts/src/asset/asset.schema.ts` and the barrel in `packages/contracts/src/index.ts`
6. Run `pnpm asset:placeholder` to generate the placeholder PNG (images only)
7. Generate via AI: `pnpm --filter @sg/asset-gen cli generate --key <key>` (requires direnv API keys)
   - Output goes to `.work/staging/<key>/<timestamp>/`
8. Review: `pnpm --filter @sg/asset-gen cli staging --key <key>`
   - Check against acceptance criteria in `docs/asset-contracts.md`
9. Promote: `pnpm --filter @sg/asset-gen cli promote --key <key>`
10. Run `pnpm asset:manifest` to rebuild the manifest
11. Run `pnpm lint:fix` to format the manifest JSON
12. Run `pnpm asset:validate` to verify the full chain
13. Report results

Required information:
- **key**: Asset key matching content data (e.g., `enemy-scout`)
- **kind**: `sprite-sheet`, `image`, or `audio`
- **group**: `ships`, `enemies`, `bosses`, `backgrounds`, `music`, `sfx`, `effects`, `projectiles`
- **sourceMode**: `openai-generate`, `openai-edit`, `elevenlabs-sfx`, `elevenlabs-music`, `manual`, or `placeholder`
- **frameWidth/frameHeight/frameCount**: Required for sprite sheets
- **audioDuration**: Required for SFX (seconds)
- **musicLengthMs**: Required for music (milliseconds)
- **source strategy**: One of `generated-final`, `generated-source`, `code-drawn`, `deferred`
- **owning system**: Which game system consumes this asset

API keys loaded via direnv + gopass (`ship-game/openai-api-key`, `ship-game/elevenlabs-api-key`).
For CLI without direnv: `eval "$(direnv export bash)"` before running generate commands.
