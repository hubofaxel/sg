# tools/asset-gen — AI asset generation pipeline

- Generates pixel art assets via OpenAI gpt-image-1.5 / gpt-image-1-mini
- Builds and validates `asset-manifest.json` consumed by Phaser's loader
- Three lanes: generate (Lane A), edit (Lane B), direct sheet (Lane C)
- Uses Sharp for image processing (trim, pad, resize nearest-neighbor, quantize, grid assembly)
- `ASSETS_ROOT` resolves to `apps/web/static/assets/` via `import.meta.dirname`
- Provenance records go in `.work/records/` (gitignored), never in the runtime manifest
- Run via `pnpm --filter @sg/asset-gen cli <command>`

## Key paths
- `src/config/asset-catalog.ts` — single source of truth for every asset key
- `src/config/style-bible.ts` — shared style directives for all prompts
- `src/config/prompt-templates.ts` — per-key prompt builder
- `src/commands/` — CLI subcommands (generate, assemble, manifest, validate, placeholder)
- `src/lib/` — OpenAI client, Sharp image processing, manifest builder
