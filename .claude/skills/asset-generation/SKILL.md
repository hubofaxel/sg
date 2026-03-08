---
name: asset-generation
description: AI asset generation patterns using OpenAI gpt-image-1.5/1-mini. Load when working on asset generation, adding new assets, or modifying the asset pipeline.
---

## Asset Generation Patterns

Generate pixel art game assets using OpenAI image models (gpt-image-1.5, gpt-image-1-mini).

### Three generation lanes

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

### Model selection
| Use case | Model | API |
|---|---|---|
| Canonical assets | gpt-image-1.5 | images.generate |
| Cheap ideation | gpt-image-1-mini | images.generate |
| Frame variants | gpt-image-1.5 | images.edit |
| Lineage edits | gpt-image-1.5 | responses.create |

### Style bible
All prompts compose with shared directives from `style-bible.ts`:
- Pixel art, top-down shmup perspective
- Gameplay-first readability, crisp silhouettes
- Restrained palette (max 16 colors per sprite)
- No text, labels, watermarks, borders, frames
- Transparent background for sprites, opaque for backgrounds

### Adding a new asset
1. Add catalog entry in `asset-catalog.ts`
2. Add prompt template in `prompt-templates.ts`
3. If new asset type needed, update `packages/contracts/src/asset/asset.schema.ts` and barrel
4. Run `pnpm asset:placeholder` to generate placeholder
5. Run `pnpm asset:manifest` to update manifest
6. Run `pnpm asset:validate` to verify
