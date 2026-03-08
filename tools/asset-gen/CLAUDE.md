# tools/asset-gen — AI asset generation pipeline

- Generates pixel art assets via OpenAI gpt-image-1.5 / gpt-image-1-mini
- Generates audio (SFX + music) via ElevenLabs API
- Builds and validates `asset-manifest.json` consumed by Phaser's loader
- Three image lanes: generate (Lane A), edit (Lane B), direct sheet (Lane C)
- Two audio modes: SFX (`textToSoundEffects.convert`) and music (`music.compose`)
- Uses Sharp for image processing (trim, pad, resize nearest-neighbor, quantize, grid assembly)
- `generate` command auto-resizes OpenAI output (1024x1024) to correct sheet dimensions via nearest-neighbor
- `ASSETS_ROOT` resolves to `apps/web/static/assets/` via `import.meta.dirname`
- Provenance records go in `.work/records/` (gitignored), never in the runtime manifest
- Run via `pnpm --filter @sg/asset-gen cli <command>`

## API Keys

API keys are loaded via **direnv + gopass** (not `.env` files):
- Keys stored in gopass: `ship-game/openai-api-key`, `ship-game/elevenlabs-api-key`
- Loaded automatically via `.envrc` at project root when you `cd` into the repo
- Run `direnv allow` once after cloning or modifying `.envrc`
- The `src/index.ts` env loader reads `tools/asset-gen/.env` as a fallback only if env vars are not already set
- For CLI sessions without direnv: `eval "$(direnv export bash)"` before running commands

## Key paths
- `src/config/asset-catalog.ts` — single source of truth for every asset key (dimensions, generation params)
- `src/config/style-bible.ts` — shared visual + audio style directives for all prompts
- `src/config/prompt-templates.ts` — per-key prompt builder (image + audio templates)
- `src/commands/generate.ts` — AI generation + auto-resize to sheet dimensions
- `src/commands/assemble.ts` — combine individual frame PNGs into sheets (frame-by-frame workflow)
- `src/commands/` — CLI subcommands (generate, assemble, manifest, validate, placeholder)
- `src/lib/openai-client.ts` — OpenAI image generation (3 API paths)
- `src/lib/elevenlabs-client.ts` — ElevenLabs SFX + music generation
- `src/lib/image-processing.ts` — Sharp image operations (resizeNearest, alphaTrim, assembleGrid)
- `src/lib/manifest-builder.ts` — manifest construction + sha256 hashing

## Post-generation checklist
1. `pnpm asset:manifest` — rebuild manifest with new hashes/sizes/frameConfig
2. `pnpm lint:fix` — Biome may reformat the manifest JSON
3. `pnpm asset:validate` — confirm 0 errors
4. `pnpm check` — typecheck all packages
