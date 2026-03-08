---
name: asset-generation
description: AI asset generation patterns using OpenAI (images) and ElevenLabs (audio). Load when working on asset generation, adding new assets, or modifying the asset pipeline.
---

## Asset Generation Patterns

Generate pixel art game assets using OpenAI image models and audio using ElevenLabs.

### Staging → Review → Promote

**All generated assets go through staging. Never write directly to runtime.**

1. `generate --key <key>` → `.work/staging/<key>/<timestamp>/` + `metadata.json`
2. `staging --key <key>` → list candidates for review
3. Review against acceptance criteria in `docs/asset-contracts.md`
4. `promote --key <key>` → copy accepted candidate to `apps/web/static/assets/`
5. `manifest` → rebuild manifest from runtime files

### Source strategy classification

Every asset is one of:
- **wired-existing** — on disk, just needs code to use it
- **generated-final** — AI output ships directly (after staging review)
- **generated-source** — AI output needs manual cleanup before shipping
- **code-drawn** — rendered at runtime via Phaser API
- **deferred** — planned but not yet needed

### The <32px rule
Assets under ~32px shipped size default to **code-drawn**. AI micro-sprites lose quality at extreme reduction. Code-drawn effects are sharper at small scale.

### Two-pass generation policy
1. First pass: **medium** quality
2. Review against acceptance criteria
3. Only re-run failed candidates at **high** quality

### Image Generation — Three lanes

#### Lane A — Single-image canonical assets
For: ships, enemy base poses, bosses, backgrounds
1. Generate one strong transparent PNG via `images.generate`
2. Downscale / quantize / crop with Sharp
3. Stage and review
4. If approved, promote and treat as canonical parent for Lane B edits

#### Lane B — Edit-derived frame assets
For: bank states, hover variants, phase variants
1. Start from canonical parent image (Lane A output, must be promoted)
2. Use `images.edit` to preserve silhouette, framing, palette
3. Assemble resulting frames into sprite sheet

#### Lane C — Direct sheet/effect generation
For: explosions, beam strips, projectile trails
Direct sprite sheet prompts — these assets tolerate inter-frame drift.

### Image model selection
| Use case | Model | API |
|---|---|---|
| Canonical assets | gpt-image-1.5 | images.generate |
| Cheap ideation | gpt-image-1-mini | images.generate |
| Frame variants | gpt-image-1.5 | images.edit |
| Lineage edits | gpt-image-1.5 | responses.create |

### Audio Generation — ElevenLabs

#### Sound effects (`sourceMode: 'elevenlabs-sfx'`)
- Uses `elevenlabs.textToSoundEffects.convert({ text, duration_seconds })`
- Text prompt built from `AUDIO_TEMPLATES` + style bible `sfx` directives
- `audioDuration` field in catalog controls `duration_seconds`
- Output format: MP3

#### Music (`sourceMode: 'elevenlabs-music'`)
- Uses `elevenlabs.music.compose()` in two modes:
  - **Prompt mode**: `{ prompt, musicLengthMs }` — simple text-based generation
  - **Composition plan mode**: `{ compositionPlan }` — structured multi-section generation
- Output format: MP3

### Style bible
All prompts compose with shared directives from `style-bible.ts`:
- **Visual**: Pixel art, top-down shmup perspective, gameplay readability, crisp silhouettes, max 16 colors, no text/watermarks, transparent bg for sprites
- **SFX**: Retro arcade, punchy transients, 8/16-bit inspired with modern clarity, short duration
- **Music**: Electronic game soundtrack, space shooter theme, driving rhythm, loopable, not fatiguing

### API Keys
Keys loaded via **direnv + gopass** (not `.env` files):
- `ship-game/openai-api-key` and `ship-game/elevenlabs-api-key` in gopass
- Auto-loaded by `.envrc` at project root via `direnv`
- For CLI without direnv: `eval "$(direnv export bash)"` before commands

### Image post-processing
The `generate` command auto-resizes OpenAI output (1024x1024) to correct sheet dimensions:
- Sprite sheets: resized to `(frameWidth * frameCount) x frameHeight` via nearest-neighbor
- Non-sprite images (backgrounds): saved at raw resolution

### Art direction best practices
- Each sprite prompt should specify: frame layout, pixel dimensions, animation delta between frames
- Give each enemy a distinct silhouette (round vs angular vs organic) and color palette
- Add personality descriptors ("angry little robot", "flying tank", "nimble and tricky")
- Style bible stacks: global + sprites + group-specific (ships/enemies/bosses)
- Frame size (visual) is independent of hitbox size (physics) in content JSON

### Adding a new asset
1. Add contract entry in `docs/asset-contracts.md` with source strategy and acceptance criteria
2. Add catalog entry in `asset-catalog.ts` (set `sourceMode` to appropriate engine)
3. Add prompt template in `prompt-templates.ts` (`TEMPLATES` for images, `AUDIO_TEMPLATES` for audio)
4. If new asset type needed, update `packages/contracts/src/asset/asset.schema.ts` and barrel
5. Run `pnpm asset:placeholder` to generate placeholder (images only)
6. Generate: `pnpm --filter @sg/asset-gen cli generate --key <key>`
7. Review: `pnpm --filter @sg/asset-gen cli staging --key <key>`
8. Promote: `pnpm --filter @sg/asset-gen cli promote --key <key>`
9. Run `pnpm asset:manifest` to update manifest
10. Run `pnpm lint:fix` to format manifest JSON
11. Run `pnpm asset:validate` to verify
