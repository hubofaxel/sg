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
- Phase-aware validation: `CURRENT_PHASE` in `asset-catalog.ts` gates which entries the validator checks. Bump when entering a new phase. Future-phase assets can be catalogued + generated ahead of time without breaking `pnpm asset:validate`.
- Music composition plans: `music-boss` uses `compositionPlan` (structured sections) instead of plain prompt. `forceInstrumental: true` applied to all prompt-mode music.

## Staging → Review → Promote workflow

**Generation never writes directly to `apps/web/static/assets/`.**

1. `generate --key <key>` → writes to `.work/staging/<key>/<timestamp>/`
2. Each staging candidate has a `metadata.json` recording: key, prompt template, model, quality, sha256, timestamp, accepted status
3. `staging --key <key>` → lists candidates for review
4. Review against acceptance criteria (see `docs/asset-contracts.md`)
5. `promote --key <key>` → copies accepted candidate to runtime path, logs hash diff
6. `manifest` → rebuilds manifest from runtime files
7. `validate` → confirms consistency

### Placeholders bypass staging
`placeholder` still writes directly to runtime — these are programmatic solid-color PNGs, no review needed.

### No silent overwrite rule
If `promote` would replace an existing runtime file, the command logs old and new hashes. The manifest diff is visible in git.

## Source strategy classification

Every asset is exactly one of: `wired-existing`, `generated-final`, `generated-source`, `code-drawn`, `deferred`. See `docs/asset-contracts.md` for the full registry and per-type acceptance criteria.

### The <32px rule
Assets under ~32px in their shipped form default to **code-drawn** unless there is a strong reason. AI-generated micro-sprites lose quality at extreme reduction. Code-drawn effects (rectangles, circles, blend modes, tweens) are sharper at small scale.

## Two-pass generation policy
1. First pass: **medium** quality
2. Review against acceptance criteria
3. Only re-run failed candidates at **high** quality

## API Keys

API keys are loaded via **direnv + gopass** (not `.env` files):
- Keys stored in gopass: `ship-game/openai-api-key`, `ship-game/elevenlabs-api-key`
- Loaded automatically via `.envrc` at project root when you `cd` into the repo
- **Claude Code sessions**: `.claude/hooks/load-env.sh` writes direnv exports to `CLAUDE_ENV_FILE` on SessionStart — no manual `eval` needed
- Run `direnv allow` once after cloning or modifying `.envrc`
- The `src/index.ts` env loader reads `tools/asset-gen/.env` as a fallback only if env vars are not already set

## Key paths
- `src/config/asset-catalog.ts` — single source of truth for every asset key (dimensions, generation params)
- `src/config/style-bible.ts` — shared visual + audio style directives for all prompts (includes `effects` category for VFX)
- `src/config/prompt-templates.ts` — per-key prompt builder (image + audio templates, auto-appends scale hints from frame dimensions)
- `docs/vfx-prompt-library.md` — curated VFX prompt reference: explosion, hit, shield, power-up templates with color language, scale modifiers, and workflow prompts
- `src/commands/generate.ts` — AI generation → staging directory
- `src/commands/promote.ts` — promote staging candidate to runtime path
- `src/commands/staging.ts` — list staging candidates for review
- `src/commands/assemble.ts` — combine individual frame PNGs into sheets (frame-by-frame workflow)
- `src/commands/` — CLI subcommands (generate, staging, promote, assemble, manifest, validate, placeholder)
- `src/lib/openai-client.ts` — OpenAI image generation (3 API paths)
- `src/lib/elevenlabs-client.ts` — ElevenLabs SFX + music generation
- `src/lib/image-processing.ts` — Sharp image operations (resizeNearest, alphaTrim, assembleGrid)
- `src/lib/manifest-builder.ts` — manifest construction + sha256 hashing
- `src/lib/staging.ts` — staging write, list, and promote logic

## Commands
```bash
pnpm --filter @sg/asset-gen cli generate --key <key>   # Generate to staging
pnpm --filter @sg/asset-gen cli staging                 # List all staging candidates
pnpm --filter @sg/asset-gen cli staging --key <key>     # List candidates for one key
pnpm --filter @sg/asset-gen cli promote --key <key>     # Promote latest to runtime
pnpm --filter @sg/asset-gen cli promote --key <key> --timestamp <ts>  # Promote specific
pnpm asset:manifest       # Rebuild manifest from runtime files
pnpm asset:validate       # Deep cross-validation
pnpm asset:placeholder    # Generate placeholder PNGs (bypasses staging)
```

## Post-generation checklist
1. `pnpm --filter @sg/asset-gen cli staging --key <key>` — review candidate
2. `pnpm --filter @sg/asset-gen cli promote --key <key>` — promote to runtime
3. `pnpm asset:manifest` — rebuild manifest with new hashes/sizes/frameConfig
4. `pnpm lint:fix` — Biome may reformat the manifest JSON
5. `pnpm asset:validate` — confirm 0 errors
6. `pnpm check` — typecheck all packages
