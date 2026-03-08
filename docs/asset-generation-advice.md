Your architecture is basically right. The part I would modernize is **how the AI pipeline uses the OpenAI APIs**.

The key split is:

* **Image API** for one-shot batch generation and one-shot edits inside `tools/asset-gen`
* **Responses API** only for curated, iterative asset work where you want to preserve context across turns or force edits against an existing canonical image lineage
* **`gpt-image-1.5`** for canonical production assets
* **`gpt-image-1-mini`** for cheap ideation and throwaway candidate sweeps
* **not DALL·E** for new work, because OpenAI’s current docs recommend GPT Image over DALL·E, call `gpt-image-1.5` the latest and most advanced GPT Image model, and note DALL·E 2/3 are deprecated with support ending on **May 12, 2026**. ([OpenAI Developers][1])

Your `apps/web/static/assets/` choice is defensible here even though SvelteKit generally prefers imported assets, because `static/` serves files without renaming and Phaser’s loader is built to load external images, sprite sheets, audio, and JSON by stable asset keys and URLs. For a Phaser game with a generated manifest, that stable-path behavior is more important than Vite hashing. ([Svelte][2])

## The model and API policy I would actually use

For this project, I would standardize the asset generator on this policy:

* **`gpt-image-1.5`**: ships, bosses, enemy canonical frames, pickup icons, UI motifs, and final background plates
* **`gpt-image-1-mini`**: early exploration, cheap placeholder replacement candidates, alternate silhouettes you may discard
* **Image API**: `generate`, `edit`
* **Responses API**: only when you want multi-turn iterative edits, file-ID-based editing, or explicit `action: "edit"` behavior on a canonical asset thread

That matches OpenAI’s current guidance: if you only need to generate or edit a single image from one prompt, the **Image API** is the best choice; if you want conversational or multi-turn editable image flows, use the **Responses API**. The same guide also says GPT Image models support output customization like size, format, quality, compression, and transparent backgrounds. ([OpenAI Developers][1])

A strong practical consequence follows from that:

**Do not make the Responses API your default batch engine.**
For `pnpm asset:gen --all`, the Image API is simpler, cheaper to reason about, and easier to cache. Use Responses only for “take this approved ship and produce tier-2 and damaged variants while preserving silhouette” workflows. ([OpenAI Developers][1])

## The biggest change I would make to the asset plan

I would **not** rely on direct AI-generated finished sprite sheets for all gameplay entities.

OpenAI’s current guide does show a sprite-sheet prompt example, including “Draw a 2D pixel art style sprite sheet...” with transparent background output. That means sheet generation is supported well enough for experimentation. But in production, for ships, enemies, and bosses, direct whole-sheet generation will usually drift in pose, proportions, and pixel density between frames. ([OpenAI Developers][1])

So I would split assets into three generation lanes:

### Lane A — single-image canonical assets

Use for:

* ships
* enemy base poses
* bosses
* pickups
* background plates
* UI icons

Process:

1. generate one strong transparent PNG
2. downscale / quantize / crop
3. approve or reject
4. if approved, treat it as the canonical parent image

### Lane B — edit-derived frame assets

Use for:

* bank-left / neutral / bank-right ship states
* hover / pulse / engine flicker states
* boss weak-point open/closed
* enemy damaged / elite variants

Process:

1. start from canonical parent image
2. use **edit**, not fresh generate
3. preserve silhouette, framing, and palette family
4. assemble frames into a sprite sheet

### Lane C — direct sheet/effect generation

Use for:

* explosions
* beam strips
* projectile trails
* simple effect loops
* cheap prototype animation passes

That is the lane where direct “sprite sheet” prompts are actually useful.

## Keep the runtime manifest minimal; put provenance elsewhere

Your `AssetManifestSchema` should stay runtime-focused:

* `key`
* `type`
* `path`
* sprite frame config
* optional dimensions
* optional audio paths

I would **not** put model, prompt, API choice, or edit lineage into the runtime manifest. Keep that in a separate provenance record under `tools/asset-gen/.work/records/<key>.json`.

That provenance file should include:

```ts
type AssetGenerationRecord = {
  key: string;
  stage: "placeholder" | "generated" | "edited" | "assembled";
  model: "gpt-image-1.5" | "gpt-image-1-mini";
  api: "images.generate" | "images.edit" | "responses.create";
  prompt: string;
  parentKey?: string;
  parentRecordId?: string;
  outputFiles: string[];
  createdAt: string;
  params: {
    size: string;
    quality: "low" | "medium" | "high" | "auto";
    background?: "transparent" | "opaque" | "auto";
    outputFormat: "png" | "webp" | "jpeg";
  };
};
```

That keeps Phaser’s load path clean while preserving reproducibility.

## Asset catalog: I would extend it slightly

Your `asset-catalog.ts` should be the real source of truth, but I would add four fields you do not currently list:

```ts
type AssetCatalogEntry = {
  key: string;
  kind: "sprite-sheet" | "image" | "audio";
  group: "ships" | "enemies" | "bosses" | "backgrounds" | "music" | "effects" | "projectiles";
  sourceMode: "placeholder" | "manual" | "openai-generate" | "openai-edit";
  generationTier: "cheap" | "canonical";
  promptId?: string;
  outputPath: string;

  // sprite-specific
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  frameOrder?: "horizontal" | "vertical" | "grid";
  margin?: number;
  spacing?: number;

  // generation-specific
  model?: "gpt-image-1.5" | "gpt-image-1-mini";
  api?: "images.generate" | "images.edit" | "responses.create";
  inputSize?: "1024x1024" | "1536x1024" | "1024x1536";
  quality?: "low" | "medium" | "high" | "auto";
  background?: "transparent" | "opaque" | "auto";
  outputFormat?: "png" | "webp" | "jpeg";

  // lineage
  parentKey?: string;
  maskStrategy?: "none" | "full-edit" | "masked-edit";
};
```

The two most useful additions are `generationTier` and `parentKey`. They let you explicitly say “this pickup icon is cheap exploration” versus “this ship is a canonical asset whose future variants must be edits of this parent.”

## Best current OpenAI settings for your asset types

OpenAI’s docs currently expose GPT Image models with `png`, `webp`, or `jpeg` output, quality levels `low|medium|high|auto`, sizes `1024x1024`, `1024x1536`, `1536x1024`, and transparent backgrounds for GPT Image models when using `png` or `webp`; transparency works best with `medium` or `high`. ([OpenAI Platform][3])

So I would standardize like this:

### Ships / enemies / bosses / pickups

* model: `gpt-image-1.5`
* size: `1024x1024`
* background: `transparent`
* output: `png`
* quality: `high`

Reason: you want transparent subject isolation, maximum cleanup headroom, and consistent square framing.

### Backgrounds

* model: `gpt-image-1.5`
* size: `1536x1024`
* background: `opaque`
* output: `png` during authoring, optionally convert later
* quality: `high`

Reason: you want more horizontal structure for landscape/parallax background plates.

### Cheap ideation batches

* model: `gpt-image-1-mini`
* size: `1024x1024`
* background: `transparent` for subjects, `opaque` for backgrounds
* quality: `medium`

Reason: low-cost silhouette exploration before you spend on final canonical runs. OpenAI’s docs explicitly position `gpt-image-1-mini` as the cost-efficient option and `gpt-image-1.5` as best overall quality. ([OpenAI Developers][1])

## Avoid streaming partial images in the CLI

For this asset system, I would **not** use partial-image streaming in the default generator.

OpenAI’s image guide says partial images are supported, but each partial image adds **100 extra image output tokens**. That is useful for interactive UX, not for a deterministic asset CLI. ([OpenAI Developers][1])

So:

* `generate --all`: no streaming
* `generate --key ship-viper --interactive`: streaming optional, only for a local human-in-the-loop preview mode

## Music and audio: keep this out of OpenAI image generation

Your manifest should still support `AudioAssetSchema`, but I would make the audio catalog entries `sourceMode: "manual"` for now.

OpenAI’s public API model surface currently exposes specialized models for image generation, video generation, text to speech, speech to text, deep research, embeddings, and moderation, but there is no public music-generation model category in the docs I found. So I would not try to force music generation into `@sg/asset-gen`; keep music as a manual asset lane while still manifesting and validating it. ([OpenAI Developers][4])

## Concrete script advice by command

## 1) `generate`

This command should do **one** of two things:

* `openai.images.generate()` for fresh assets
* `openai.images.edit()` for explicit image+mask edits

Do not start with Responses here unless the catalog entry explicitly says `api: "responses.create"`.

A good rule:

* `openai-generate` entries → `images.generate`
* `openai-edit` entries with image file + optional mask → `images.edit`
* curated lineage jobs → `responses.create`

That lines up with OpenAI’s separation of generate, edit, and multi-turn edit flows. The docs also show `images.edit` with a mask, plus Responses-based image editing with `input_image_mask` and input image file IDs. ([OpenAI Platform][3])

A strong modern `generate.ts` should therefore branch by mode, not by asset kind:

```ts
// tools/asset-gen/src/commands/generate.ts
import { generateImage, editImage, editImageWithResponses } from "../lib/openai-client";
import { catalog } from "../config/asset-catalog";
import { writeRecord, writeRawImage } from "../lib/io";

export async function generateCommand(opts: { key?: string; all?: boolean }) {
  const entries = opts.all
    ? catalog.filter((e) => e.sourceMode === "openai-generate" || e.sourceMode === "openai-edit")
    : catalog.filter((e) => e.key === opts.key);

  for (const entry of entries) {
    if (entry.sourceMode === "openai-generate") {
      const result = await generateImage(entry);
      await writeRawImage(entry.key, result);
      await writeRecord(entry.key, result.record);
      continue;
    }

    if (entry.sourceMode === "openai-edit" && entry.api === "images.edit") {
      const result = await editImage(entry);
      await writeRawImage(entry.key, result);
      await writeRecord(entry.key, result.record);
      continue;
    }

    if (entry.sourceMode === "openai-edit" && entry.api === "responses.create") {
      const result = await editImageWithResponses(entry);
      await writeRawImage(entry.key, result);
      await writeRecord(entry.key, result.record);
    }
  }
}
```

## 2) `assemble`

This command should stay deterministic and dumb:

* load raw frames
* normalize canvas size
* trim transparent bounds if desired
* downscale with nearest-neighbor
* optional palette reduction
* assemble horizontal grid
* write final PNG to `apps/web/static/assets/...`

For pixel-art results, the important thing is not the AI call. It is the postprocess.

I would do these image steps in this order:

1. alpha-trim optional
2. pad to standard square
3. resize with nearest-neighbor
4. quantize / reduce palette
5. composite into sheet
6. verify sheet dimensions against frame config
7. emit final PNG

## 3) `manifest`

This should scan the output directory and build only what Phaser needs.

I would also add:

* `sha256`
* `bytes`
* `generatedAt`

Not because Phaser needs them, but because CI and cache invalidation will.

Example runtime manifest entry:

```json
{
  "key": "enemy-drone",
  "type": "sprite-sheet",
  "path": "/assets/sprites/enemies/enemy-drone.png",
  "frameConfig": {
    "frameWidth": 32,
    "frameHeight": 32,
    "frameCount": 4,
    "margin": 0,
    "spacing": 0
  },
  "sha256": "…",
  "bytes": 1834
}
```

## 4) `validate`

Your validator should check more than existence.

It should verify:

* every content key resolves to a manifest entry
* every manifest entry points to a real file
* file dimensions are divisible by `frameWidth/frameHeight`
* `frameCount` does not exceed sheet capacity
* `backgrounds` are images, not accidentally sprite sheets
* `audio.paths[]` all exist
* no duplicate keys
* no catalog entry generates outside `apps/web/static/assets/`

That catches far more real mistakes than existence-only validation.

## 5) `placeholder`

I would change your placeholder strategy slightly.

For sprite sheets, **do not put tiny text labels into 16x16 or 32x32 frames**. That looks noisy and is not useful in gameplay. Instead:

* use solid-color silhouettes
* different geometric shapes per asset family
* correct frame count and grid dimensions
* optional key text only in a separate debug sheet or sidecar PNG

That makes placeholder gameplay actually readable.

## Best OpenAI wrapper design

Your `openai-client.ts` should expose three explicit paths:

```ts
export async function generateImage(entry: AssetCatalogEntry): Promise<GeneratedAssetResult>;
export async function editImage(entry: AssetCatalogEntry): Promise<GeneratedAssetResult>;
export async function editImageWithResponses(entry: AssetCatalogEntry): Promise<GeneratedAssetResult>;
```

### `generateImage`

Use the Image API for fresh subjects and backgrounds:

```ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImage(entry: AssetCatalogEntry) {
  const result = await client.images.generate({
    model: entry.model ?? "gpt-image-1.5",
    prompt: buildPrompt(entry),
    size: entry.inputSize ?? "1024x1024",
    background: entry.background ?? "transparent",
    quality: entry.quality ?? "high",
    output_format: entry.outputFormat ?? "png"
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image returned for ${entry.key}`);

  return {
    imageBuffer: Buffer.from(b64, "base64"),
    record: {
      key: entry.key,
      stage: "generated",
      model: entry.model ?? "gpt-image-1.5",
      api: "images.generate",
      prompt: buildPrompt(entry),
      outputFiles: [],
      createdAt: new Date().toISOString(),
      params: {
        size: entry.inputSize ?? "1024x1024",
        quality: entry.quality ?? "high",
        background: entry.background ?? "transparent",
        outputFormat: entry.outputFormat ?? "png"
      }
    }
  };
}
```

OpenAI’s current docs show `images.generate`, GPT Image model IDs, transparent background support, and base64 image output for GPT image models. ([OpenAI Developers][1])

### `editImage`

Use `images.edit` for direct file-based edits and masked edits:

```ts
export async function editImage(entry: AssetCatalogEntry) {
  const image = await fs.openAsBlob(entry.sourceImagePath!, { type: "image/png" });

  const mask = entry.maskPath
    ? await fs.openAsBlob(entry.maskPath, { type: "image/png" })
    : undefined;

  const result = await client.images.edit({
    model: entry.model ?? "gpt-image-1.5",
    image,
    ...(mask ? { mask } : {}),
    prompt: buildPrompt(entry)
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No edited image returned for ${entry.key}`);

  return {
    imageBuffer: Buffer.from(b64, "base64"),
    record: {
      key: entry.key,
      stage: "edited",
      model: entry.model ?? "gpt-image-1.5",
      api: "images.edit",
      prompt: buildPrompt(entry),
      parentKey: entry.parentKey,
      outputFiles: [],
      createdAt: new Date().toISOString(),
      params: {
        size: entry.inputSize ?? "1024x1024",
        quality: entry.quality ?? "high",
        background: entry.background ?? "transparent",
        outputFormat: entry.outputFormat ?? "png"
      }
    }
  };
}
```

The current guide explicitly documents `images.edit`, including image + mask editing. ([OpenAI Developers][1])

### `editImageWithResponses`

Use this only when you want lineage-aware iterative work:

```ts
export async function editImageWithResponses(entry: AssetCatalogEntry) {
  const fileId = await uploadFile(entry.sourceImagePath!);

  const response = await client.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: buildPrompt(entry) },
          { type: "input_image", file_id: fileId }
        ]
      }
    ],
    tools: [
      {
        type: "image_generation",
        quality: entry.quality ?? "high",
        background: entry.background ?? "transparent",
        action: "edit"
      }
    ]
  });

  const imageData = response.output
    .filter((o) => o.type === "image_generation_call")
    .map((o) => o.result);

  if (!imageData[0]) throw new Error(`No response image for ${entry.key}`);

  return {
    imageBuffer: Buffer.from(imageData[0], "base64"),
    record: {
      key: entry.key,
      stage: "edited",
      model: entry.model ?? "gpt-image-1.5",
      api: "responses.create",
      prompt: buildPrompt(entry),
      parentKey: entry.parentKey,
      outputFiles: [],
      createdAt: new Date().toISOString(),
      params: {
        size: entry.inputSize ?? "1024x1024",
        quality: entry.quality ?? "high",
        background: entry.background ?? "transparent",
        outputFormat: entry.outputFormat ?? "png"
      }
    }
  };
}
```

OpenAI’s current guide says the Responses API is the right choice for multi-turn image work, supports image inputs in context, and supports `action: "auto" | "generate" | "edit"` with `gpt-image-1.5` and `chatgpt-image-latest`. ([OpenAI Developers][1])

## Prompt system: treat prompts as code

I would not store giant raw prompts inline inside the catalog. I would store:

* `style-bible.ts`
* `asset prompt templates`
* `per-key prompt deltas`

Example:

```ts
// tools/asset-gen/src/config/style-bible.ts
export const STYLE_BIBLE = [
  "pixel art",
  "top-down vertical shoot-em-up",
  "gameplay-first readability",
  "crisp silhouette",
  "restrained palette",
  "clean separation from background",
  "no text",
  "no watermark",
  "no frame"
].join(", ");
```

```ts
// tools/asset-gen/src/config/prompt-templates.ts
export function buildPrompt(entry: AssetCatalogEntry): string {
  switch (entry.key) {
    case "ship-viper":
      return `${STYLE_BIBLE}, player ship, compact wedge interceptor, centered, isolated, bright cockpit stripe, two engines, simple readable silhouette, transparent background`;
    case "enemy-drone":
      return `${STYLE_BIBLE}, enemy ship, fragile drone, red hostile palette accents, centered, isolated, readable 3/4 symmetric top-down silhouette, transparent background`;
    case "boss-iron-sentinel":
      return `${STYLE_BIBLE}, stage boss, heavy armored sentinel, large top-down silhouette, glowing central weak point, readable boss-class form, transparent background`;
    default:
      throw new Error(`No prompt template for ${entry.key}`);
  }
}
```

That is much easier to govern than giant ad hoc prompt strings.

## Specific advice for your 13 current assets

Given your current inventory — 7 sprites, 3 backgrounds, 1 music track, 2 defaults — I would build them like this:

### The 7 sprite keys

Use:

* `gpt-image-1-mini` to generate 3 candidate concepts per key
* human pick one
* `gpt-image-1.5` to regenerate the selected direction cleanly
* edit from the approved parent for any frame variants

Do **not** try to bulk-generate all seven as final sprite sheets in one pass.

### The 3 background keys

Use:

* `gpt-image-1.5`
* `1536x1024`
* opaque PNG
* one generation each
* then derive parallax layers manually or with postprocess slicing

### The 1 music track

Mark it manual.
Generate placeholder manifest entries only.
Do not block Stage 2 on AI music.

### The 2 defaults

Treat these as:

* fallback texture
* fallback background

Keep them hand-authored, tiny, deterministic, and committed.

## Root scripts I would add

```json
{
  "scripts": {
    "asset:gen": "pnpm --filter @sg/asset-gen cli generate --all",
    "asset:gen:key": "pnpm --filter @sg/asset-gen cli generate --key",
    "asset:assemble": "pnpm --filter @sg/asset-gen cli assemble --all",
    "asset:manifest": "pnpm --filter @sg/asset-gen cli manifest",
    "asset:validate": "pnpm --filter @sg/asset-gen cli validate",
    "asset:placeholder": "pnpm --filter @sg/asset-gen cli placeholder --all",
    "asset:rebuild": "pnpm asset:gen && pnpm asset:assemble && pnpm asset:manifest && pnpm asset:validate"
  }
}
```

And I would make `pnpm validate` include `pnpm asset:validate`.

## One important March 2026 caveat

OpenAI’s image guide notes that you may need **API organization verification** before using GPT Image models, including `gpt-image-1.5`, `gpt-image-1`, and `gpt-image-1-mini`. I would check that before wiring the pipeline into CI. ([OpenAI Developers][1])

## Final recommendation

Keep your architecture, but modernize the generator around this rule:

**Generate canonical assets once, edit them for consistency, assemble deterministically, and validate the content → manifest → file chain in CI.**

The exact practical choice I would make on March 7, 2026 is:

* **`gpt-image-1.5`** for final ships, enemies, bosses, pickups, backgrounds
* **`gpt-image-1-mini`** for candidate sweeps
* **Image API** as the default CLI engine
* **Responses API** only for curated lineage-preserving edit sessions
* **PNG + transparent background + high quality** for sprites
* **1536x1024 opaque PNG** for backgrounds
* **no partial-image streaming** in batch mode
* **manual music lane**
* **runtime manifest kept minimal, provenance stored separately** ([OpenAI Developers][1])

The most useful next step is to turn this into a **concrete `asset-catalog.ts` plus prompt map for your 13 keys**.

[1]: https://developers.openai.com/api/docs/guides/image-generation/ "Image generation | OpenAI API"
[2]: https://svelte.dev/docs/kit/project-structure "Project structure • SvelteKit Docs"
[3]: https://platform.openai.com/docs/api-reference/images/create?_clear=true&lang=python "Images | OpenAI API Reference"
[4]: https://developers.openai.com/api/docs/models "Models | OpenAI API"

