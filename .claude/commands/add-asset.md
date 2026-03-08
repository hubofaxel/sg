Add a new asset key to the asset pipeline.

Asset: $ARGUMENTS (e.g. "enemy-scout sprite-sheet enemies 32x32 2frames")

Steps:
1. Add an `AssetCatalogEntry` to `tools/asset-gen/src/config/asset-catalog.ts`
2. If the asset needs AI generation, add a prompt template to `tools/asset-gen/src/config/prompt-templates.ts`
3. If a new asset type is needed (beyond sprite-sheet, image, audio), update `packages/contracts/src/asset/asset.schema.ts` and the barrel in `packages/contracts/src/index.ts`
4. Run `pnpm asset:placeholder` to generate the placeholder PNG
5. Run `pnpm asset:manifest` to rebuild the manifest
6. Run `pnpm asset:validate` to verify the full chain
7. Report results

Required information:
- **key**: Asset key matching content data (e.g., `enemy-scout`)
- **kind**: `sprite-sheet`, `image`, or `audio`
- **group**: `ships`, `enemies`, `bosses`, `backgrounds`, `music`, `effects`, `projectiles`
- **frameWidth/frameHeight/frameCount**: Required for sprite sheets
