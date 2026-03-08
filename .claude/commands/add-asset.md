Add a new asset key to the asset pipeline.

Asset: $ARGUMENTS (e.g. "enemy-scout sprite-sheet enemies 48x48 2frames")

Steps:
1. Add an `AssetCatalogEntry` to `tools/asset-gen/src/config/asset-catalog.ts`
2. If the asset needs AI generation, add a prompt template to `tools/asset-gen/src/config/prompt-templates.ts`
   - For sprites: describe frame layout, pixel dimensions, animation delta, distinct silhouette, specific colors, personality
   - For audio: describe sound character, duration feel, context in gameplay
3. If a new asset type is needed (beyond sprite-sheet, image, audio), update `packages/contracts/src/asset/asset.schema.ts` and the barrel in `packages/contracts/src/index.ts`
4. Run `pnpm asset:placeholder` to generate the placeholder PNG
5. Generate via AI: `pnpm --filter @sg/asset-gen cli generate --key <key>` (requires direnv API keys)
   - The generate command auto-resizes OpenAI output to correct sheet dimensions
6. Run `pnpm asset:manifest` to rebuild the manifest
7. Run `pnpm lint:fix` to format the manifest JSON
8. Run `pnpm asset:validate` to verify the full chain
9. Report results

Required information:
- **key**: Asset key matching content data (e.g., `enemy-scout`)
- **kind**: `sprite-sheet`, `image`, or `audio`
- **group**: `ships`, `enemies`, `bosses`, `backgrounds`, `music`, `sfx`, `effects`, `projectiles`
- **sourceMode**: `openai-generate`, `openai-edit`, `elevenlabs-sfx`, `elevenlabs-music`, `manual`, or `placeholder`
- **frameWidth/frameHeight/frameCount**: Required for sprite sheets (frame size is visual only, independent of hitbox)
- **audioDuration**: Required for SFX (seconds)
- **musicLengthMs**: Required for music (milliseconds)
- **compositionPlan**: Optional structured plan for ElevenLabs music

API keys loaded via direnv + gopass (`ship-game/openai-api-key`, `ship-game/elevenlabs-api-key`).
For CLI without direnv: `eval "$(direnv export bash)"` before running generate commands.
