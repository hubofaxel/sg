import { z } from 'zod';

// ---------------------------------------------------------------------------
// Asset manifest schemas — runtime data for Phaser's asset loader
// No generation params, no prompts, no provenance — those live in asset-gen
// ---------------------------------------------------------------------------

/** Current manifest version — bump on every schema change */
export const MANIFEST_VERSION = 1;

export const FrameConfigSchema = z.object({
	frameWidth: z.number().int().positive(),
	frameHeight: z.number().int().positive(),
	frameCount: z.number().int().positive(),
	margin: z.number().int().nonnegative().default(0),
	spacing: z.number().int().nonnegative().default(0),
});
export type FrameConfig = z.infer<typeof FrameConfigSchema>;

export const SpriteSheetAssetSchema = z.object({
	type: z.literal('sprite-sheet'),
	key: z.string().min(1),
	path: z.string().min(1),
	frameConfig: FrameConfigSchema,
	sha256: z.string().length(64),
	bytes: z.number().int().nonnegative(),
});
export type SpriteSheetAsset = z.infer<typeof SpriteSheetAssetSchema>;

export const ImageAssetSchema = z.object({
	type: z.literal('image'),
	key: z.string().min(1),
	path: z.string().min(1),
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	sha256: z.string().length(64),
	bytes: z.number().int().nonnegative(),
});
export type ImageAsset = z.infer<typeof ImageAssetSchema>;

export const AudioAssetSchema = z.object({
	type: z.literal('audio'),
	key: z.string().min(1),
	paths: z.array(z.string().min(1)).min(1),
});
export type AudioAsset = z.infer<typeof AudioAssetSchema>;

export const AssetEntrySchema = z.discriminatedUnion('type', [
	SpriteSheetAssetSchema,
	ImageAssetSchema,
	AudioAssetSchema,
]);
export type AssetEntry = z.infer<typeof AssetEntrySchema>;

export const AssetManifestSchema = z.object({
	version: z.number().int().positive(),
	generatedAt: z.string().datetime(),
	assets: z.array(AssetEntrySchema),
});
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
