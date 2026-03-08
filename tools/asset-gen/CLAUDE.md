# tools/asset-gen — AI asset generation pipeline

- Generates pixel art assets via OpenAI gpt-image-1.5 / gpt-image-1-mini
- Generates audio (SFX + music) via ElevenLabs API
- Builds and validates `asset-manifest.json` consumed by Phaser's loader
- Three image lanes: generate (Lane A), edit (Lane B), direct sheet (Lane C)
- Two audio modes: SFX (`textToSoundEffects.convert`) and music (`music.compose`)
- Uses Sharp for image processing (trim, pad, resize nearest-neighbor, quantize, grid assembly)
- `ASSETS_ROOT` resolves to `apps/web/static/assets/` via `import.meta.dirname`
- Provenance records go in `.work/records/` (gitignored), never in the runtime manifest
- Run via `pnpm --filter @sg/asset-gen cli <command>`

## Key paths
- `src/config/asset-catalog.ts` — single source of truth for every asset key
- `src/config/style-bible.ts` — shared visual + audio style directives for all prompts
- `src/config/prompt-templates.ts` — per-key prompt builder (image + audio templates)
- `src/commands/` — CLI subcommands (generate, assemble, manifest, validate, placeholder)
- `src/lib/openai-client.ts` — OpenAI image generation (3 API paths)
- `src/lib/elevenlabs-client.ts` — ElevenLabs SFX + music generation
- `src/lib/image-processing.ts` — Sharp image operations
- `src/lib/manifest-builder.ts` — manifest construction + sha256 hashing
