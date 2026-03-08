// ---------------------------------------------------------------------------
// Asset catalog — single source of truth for every asset key
// Maps content data keys to generation parameters and output paths
// ---------------------------------------------------------------------------

export type AssetKind = 'sprite-sheet' | 'image' | 'audio';
export type AssetGroup =
	| 'ships'
	| 'enemies'
	| 'bosses'
	| 'backgrounds'
	| 'music'
	| 'effects'
	| 'projectiles';
export type SourceMode = 'placeholder' | 'manual' | 'openai-generate' | 'openai-edit';
export type GenerationTier = 'cheap' | 'canonical';
export type OpenAIModel = 'gpt-image-1.5' | 'gpt-image-1-mini';
export type OpenAIApi = 'images.generate' | 'images.edit' | 'responses.create';
export type InputSize = '1024x1024' | '1536x1024' | '1024x1536';
export type ImageQuality = 'low' | 'medium' | 'high' | 'auto';
export type ImageBackground = 'transparent' | 'opaque' | 'auto';
export type OutputFormat = 'png' | 'webp' | 'jpeg';
export type MaskStrategy = 'none' | 'full-edit' | 'masked-edit';

export interface AssetCatalogEntry {
	key: string;
	kind: AssetKind;
	group: AssetGroup;
	sourceMode: SourceMode;
	generationTier: GenerationTier;
	promptId?: string;
	outputPath: string;

	// sprite-specific
	frameWidth?: number;
	frameHeight?: number;
	frameCount?: number;
	frameOrder?: 'horizontal' | 'vertical' | 'grid';
	margin?: number;
	spacing?: number;

	// generation-specific
	model?: OpenAIModel;
	api?: OpenAIApi;
	inputSize?: InputSize;
	quality?: ImageQuality;
	background?: ImageBackground;
	outputFormat?: OutputFormat;

	// lineage
	parentKey?: string;
	maskStrategy?: MaskStrategy;
}

// ---------------------------------------------------------------------------
// Catalog entries for the 13 existing content keys + 2 defaults
// ---------------------------------------------------------------------------

export const ASSET_CATALOG: AssetCatalogEntry[] = [
	// --- Ships ---
	{
		key: 'ship-viper',
		kind: 'sprite-sheet',
		group: 'ships',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'ship-viper',
		outputPath: 'sprites/ships/ship-viper.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 3,
		frameOrder: 'horizontal',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1024x1024',
		quality: 'high',
		background: 'transparent',
		outputFormat: 'png',
	},

	// --- Enemies ---
	{
		key: 'enemy-drone',
		kind: 'sprite-sheet',
		group: 'enemies',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'enemy-drone',
		outputPath: 'sprites/enemies/enemy-drone.png',
		frameWidth: 32,
		frameHeight: 32,
		frameCount: 2,
		frameOrder: 'horizontal',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1024x1024',
		quality: 'high',
		background: 'transparent',
		outputFormat: 'png',
	},
	{
		key: 'enemy-weaver',
		kind: 'sprite-sheet',
		group: 'enemies',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'enemy-weaver',
		outputPath: 'sprites/enemies/enemy-weaver.png',
		frameWidth: 32,
		frameHeight: 32,
		frameCount: 2,
		frameOrder: 'horizontal',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1024x1024',
		quality: 'high',
		background: 'transparent',
		outputFormat: 'png',
	},
	{
		key: 'enemy-bruiser',
		kind: 'sprite-sheet',
		group: 'enemies',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'enemy-bruiser',
		outputPath: 'sprites/enemies/enemy-bruiser.png',
		frameWidth: 48,
		frameHeight: 48,
		frameCount: 2,
		frameOrder: 'horizontal',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1024x1024',
		quality: 'high',
		background: 'transparent',
		outputFormat: 'png',
	},
	{
		key: 'enemy-kamikaze',
		kind: 'sprite-sheet',
		group: 'enemies',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'enemy-kamikaze',
		outputPath: 'sprites/enemies/enemy-kamikaze.png',
		frameWidth: 32,
		frameHeight: 32,
		frameCount: 2,
		frameOrder: 'horizontal',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1024x1024',
		quality: 'high',
		background: 'transparent',
		outputFormat: 'png',
	},
	{
		key: 'enemy-zigzagger',
		kind: 'sprite-sheet',
		group: 'enemies',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'enemy-zigzagger',
		outputPath: 'sprites/enemies/enemy-zigzagger.png',
		frameWidth: 32,
		frameHeight: 32,
		frameCount: 2,
		frameOrder: 'horizontal',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1024x1024',
		quality: 'high',
		background: 'transparent',
		outputFormat: 'png',
	},

	// --- Bosses ---
	{
		key: 'boss-iron-sentinel',
		kind: 'sprite-sheet',
		group: 'bosses',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'boss-iron-sentinel',
		outputPath: 'sprites/bosses/boss-iron-sentinel.png',
		frameWidth: 128,
		frameHeight: 128,
		frameCount: 2,
		frameOrder: 'horizontal',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1024x1024',
		quality: 'high',
		background: 'transparent',
		outputFormat: 'png',
	},

	// --- Backgrounds ---
	{
		key: 'bg-starfield-sparse',
		kind: 'image',
		group: 'backgrounds',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'bg-starfield-sparse',
		outputPath: 'backgrounds/bg-starfield-sparse.png',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1536x1024',
		quality: 'high',
		background: 'opaque',
		outputFormat: 'png',
	},
	{
		key: 'bg-starfield-dense',
		kind: 'image',
		group: 'backgrounds',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'bg-starfield-dense',
		outputPath: 'backgrounds/bg-starfield-dense.png',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1536x1024',
		quality: 'high',
		background: 'opaque',
		outputFormat: 'png',
	},
	{
		key: 'bg-endless-void',
		kind: 'image',
		group: 'backgrounds',
		sourceMode: 'openai-generate',
		generationTier: 'canonical',
		promptId: 'bg-endless-void',
		outputPath: 'backgrounds/bg-endless-void.png',
		model: 'gpt-image-1.5',
		api: 'images.generate',
		inputSize: '1536x1024',
		quality: 'high',
		background: 'opaque',
		outputFormat: 'png',
	},

	// --- Music ---
	{
		key: 'music-outer-rim',
		kind: 'audio',
		group: 'music',
		sourceMode: 'manual',
		generationTier: 'canonical',
		outputPath: 'audio/music/music-outer-rim',
	},

	// --- Defaults ---
	{
		key: 'default-bg',
		kind: 'image',
		group: 'backgrounds',
		sourceMode: 'manual',
		generationTier: 'canonical',
		outputPath: 'backgrounds/default-bg.png',
	},
	{
		key: 'default-music',
		kind: 'audio',
		group: 'music',
		sourceMode: 'manual',
		generationTier: 'canonical',
		outputPath: 'audio/music/default-music',
	},
];

export function getCatalogEntry(key: string): AssetCatalogEntry | undefined {
	return ASSET_CATALOG.find((e) => e.key === key);
}

export function getCatalogEntries(filter?: {
	group?: AssetGroup;
	kind?: AssetKind;
	sourceMode?: SourceMode;
}): AssetCatalogEntry[] {
	if (!filter) return ASSET_CATALOG;
	return ASSET_CATALOG.filter((e) => {
		if (filter.group && e.group !== filter.group) return false;
		if (filter.kind && e.kind !== filter.kind) return false;
		if (filter.sourceMode && e.sourceMode !== filter.sourceMode) return false;
		return true;
	});
}
