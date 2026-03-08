---
name: asset-generation
description: AI asset generation patterns using OpenAI (images) and ElevenLabs (audio). Load when working on asset generation, adding new assets, or modifying the asset pipeline.
---

## Asset Generation Patterns

Generate pixel art game assets using OpenAI image models and audio using ElevenLabs.

### Image Generation — Three lanes

#### Lane A — Single-image canonical assets
For: ships, enemy base poses, bosses, backgrounds
1. Generate one strong transparent PNG via `images.generate`
2. Downscale / quantize / crop with Sharp
3. Approve or reject
4. If approved, treat as canonical parent for Lane B edits

#### Lane B — Edit-derived frame assets
For: bank states, hover variants, phase variants
1. Start from canonical parent image (Lane A output)
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
- Composition plans have: `positiveGlobalStyles`, `negativeGlobalStyles`, `sections[]`
- Each section has: `sectionName`, `positiveLocalStyles`, `negativeLocalStyles`, `durationMs`, `lines[]`
- Output format: MP3

### Style bible
All prompts compose with shared directives from `style-bible.ts`:
- **Visual**: Pixel art, top-down shmup perspective, gameplay readability, crisp silhouettes, max 16 colors, no text/watermarks, transparent bg for sprites
- **SFX**: Retro arcade, punchy transients, 8/16-bit inspired with modern clarity, short duration
- **Music**: Electronic game soundtrack, space shooter theme, driving rhythm, loopable, not fatiguing

### Adding a new asset
1. Add catalog entry in `asset-catalog.ts` (set `sourceMode` to appropriate engine)
2. Add prompt template in `prompt-templates.ts` (`TEMPLATES` for images, `AUDIO_TEMPLATES` for audio)
3. If new asset type needed, update `packages/contracts/src/asset/asset.schema.ts` and barrel
4. Run `pnpm asset:placeholder` to generate placeholder (images only)
5. Run `pnpm asset:manifest` to update manifest
6. Run `pnpm asset:validate` to verify
