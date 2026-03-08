import { describe, expect, it } from 'vitest';
import {
	AssetEntrySchema,
	AssetManifestSchema,
	AudioAssetSchema,
	FrameConfigSchema,
	ImageAssetSchema,
	MANIFEST_VERSION,
	SpriteSheetAssetSchema,
} from './asset.schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAKE_SHA256 = 'a'.repeat(64);
const ISO_NOW = '2024-01-01T00:00:00.000Z';

const minimalSpriteSheet = {
	type: 'sprite-sheet' as const,
	key: 'ship-viper',
	path: 'sprites/ships/ship-viper.png',
	frameConfig: {
		frameWidth: 32,
		frameHeight: 32,
		frameCount: 3,
	},
	sha256: FAKE_SHA256,
	bytes: 4096,
};

const minimalImage = {
	type: 'image' as const,
	key: 'bg-stars',
	path: 'backgrounds/bg-stars.png',
	sha256: FAKE_SHA256,
	bytes: 102400,
};

const minimalAudio = {
	type: 'audio' as const,
	key: 'sfx-laser',
	paths: ['audio/sfx/sfx-laser.mp3'],
};

// ---------------------------------------------------------------------------
// MANIFEST_VERSION constant
// ---------------------------------------------------------------------------

describe('MANIFEST_VERSION', () => {
	it('is a positive integer', () => {
		expect(Number.isInteger(MANIFEST_VERSION)).toBe(true);
		expect(MANIFEST_VERSION).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// FrameConfig
// ---------------------------------------------------------------------------

describe('FrameConfigSchema', () => {
	it('parses minimal frame config with defaults', () => {
		const result = FrameConfigSchema.parse({
			frameWidth: 32,
			frameHeight: 32,
			frameCount: 4,
		});
		expect(result).toEqual({
			frameWidth: 32,
			frameHeight: 32,
			frameCount: 4,
			margin: 0,
			spacing: 0,
		});
	});

	it('parses frame config with explicit margin and spacing', () => {
		const result = FrameConfigSchema.parse({
			frameWidth: 48,
			frameHeight: 48,
			frameCount: 8,
			margin: 2,
			spacing: 1,
		});
		expect(result).toEqual(expect.objectContaining({ margin: 2, spacing: 1 }));
	});

	it('rejects zero frameWidth', () => {
		expect(() =>
			FrameConfigSchema.parse({ frameWidth: 0, frameHeight: 32, frameCount: 1 }),
		).toThrow();
	});

	it('rejects zero frameHeight', () => {
		expect(() =>
			FrameConfigSchema.parse({ frameWidth: 32, frameHeight: 0, frameCount: 1 }),
		).toThrow();
	});

	it('rejects zero frameCount', () => {
		expect(() =>
			FrameConfigSchema.parse({ frameWidth: 32, frameHeight: 32, frameCount: 0 }),
		).toThrow();
	});

	it('rejects negative margin', () => {
		expect(() =>
			FrameConfigSchema.parse({ frameWidth: 32, frameHeight: 32, frameCount: 1, margin: -1 }),
		).toThrow();
	});

	it('rejects non-integer dimensions', () => {
		expect(() =>
			FrameConfigSchema.parse({ frameWidth: 32.5, frameHeight: 32, frameCount: 1 }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// SpriteSheetAsset
// ---------------------------------------------------------------------------

describe('SpriteSheetAssetSchema', () => {
	it('parses a minimal sprite sheet asset with defaults', () => {
		const result = SpriteSheetAssetSchema.parse(minimalSpriteSheet);
		expect(result).toEqual(
			expect.objectContaining({
				type: 'sprite-sheet',
				key: 'ship-viper',
				frameConfig: expect.objectContaining({ frameWidth: 32, margin: 0 }),
			}),
		);
	});

	it('parses sprite sheet with full frame config', () => {
		const result = SpriteSheetAssetSchema.parse({
			...minimalSpriteSheet,
			frameConfig: { frameWidth: 64, frameHeight: 64, frameCount: 6, margin: 1, spacing: 2 },
		});
		expect(result.frameConfig).toEqual(
			expect.objectContaining({ frameWidth: 64, margin: 1, spacing: 2 }),
		);
	});

	it('rejects wrong type literal', () => {
		expect(() => SpriteSheetAssetSchema.parse({ ...minimalSpriteSheet, type: 'image' })).toThrow();
	});

	it('rejects sha256 that is not 64 characters', () => {
		expect(() => SpriteSheetAssetSchema.parse({ ...minimalSpriteSheet, sha256: 'abc' })).toThrow();
	});

	it('rejects negative bytes', () => {
		expect(() => SpriteSheetAssetSchema.parse({ ...minimalSpriteSheet, bytes: -1 })).toThrow();
	});

	it('rejects missing key', () => {
		const { key: _key, ...rest } = minimalSpriteSheet;
		expect(() => SpriteSheetAssetSchema.parse(rest)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// ImageAsset
// ---------------------------------------------------------------------------

describe('ImageAssetSchema', () => {
	it('parses minimal image asset', () => {
		const result = ImageAssetSchema.parse(minimalImage);
		expect(result).toEqual(
			expect.objectContaining({
				type: 'image',
				key: 'bg-stars',
				path: 'backgrounds/bg-stars.png',
			}),
		);
	});

	it('parses image asset with optional width and height', () => {
		const result = ImageAssetSchema.parse({ ...minimalImage, width: 1920, height: 1080 });
		expect(result).toEqual(expect.objectContaining({ width: 1920, height: 1080 }));
	});

	it('rejects wrong type literal', () => {
		expect(() => ImageAssetSchema.parse({ ...minimalImage, type: 'sprite-sheet' })).toThrow();
	});

	it('rejects sha256 with wrong length', () => {
		expect(() => ImageAssetSchema.parse({ ...minimalImage, sha256: `${FAKE_SHA256}x` })).toThrow();
	});

	it('rejects zero width', () => {
		expect(() => ImageAssetSchema.parse({ ...minimalImage, width: 0 })).toThrow();
	});

	it('rejects empty path', () => {
		expect(() => ImageAssetSchema.parse({ ...minimalImage, path: '' })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// AudioAsset
// ---------------------------------------------------------------------------

describe('AudioAssetSchema', () => {
	it('parses minimal audio asset with one path', () => {
		const result = AudioAssetSchema.parse(minimalAudio);
		expect(result).toEqual({
			type: 'audio',
			key: 'sfx-laser',
			paths: ['audio/sfx/sfx-laser.mp3'],
		});
	});

	it('parses audio asset with multiple paths (format fallbacks)', () => {
		const result = AudioAssetSchema.parse({
			...minimalAudio,
			paths: ['audio/sfx/sfx-laser.ogg', 'audio/sfx/sfx-laser.mp3'],
		});
		expect(result.paths).toHaveLength(2);
	});

	it('rejects wrong type literal', () => {
		expect(() => AudioAssetSchema.parse({ ...minimalAudio, type: 'image' })).toThrow();
	});

	it('rejects empty paths array', () => {
		expect(() => AudioAssetSchema.parse({ ...minimalAudio, paths: [] })).toThrow();
	});

	it('rejects empty string in paths', () => {
		expect(() => AudioAssetSchema.parse({ ...minimalAudio, paths: [''] })).toThrow();
	});

	it('rejects missing key', () => {
		const { key: _key, ...rest } = minimalAudio;
		expect(() => AudioAssetSchema.parse(rest)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// AssetEntry (discriminated union)
// ---------------------------------------------------------------------------

describe('AssetEntrySchema', () => {
	it('resolves to sprite-sheet variant', () => {
		const result = AssetEntrySchema.parse(minimalSpriteSheet);
		expect(result.type).toBe('sprite-sheet');
	});

	it('resolves to image variant', () => {
		const result = AssetEntrySchema.parse(minimalImage);
		expect(result.type).toBe('image');
	});

	it('resolves to audio variant', () => {
		const result = AssetEntrySchema.parse(minimalAudio);
		expect(result.type).toBe('audio');
	});

	it('rejects unknown type discriminant', () => {
		expect(() =>
			AssetEntrySchema.parse({ type: 'video', key: 'intro', path: 'video.mp4' }),
		).toThrow();
	});

	it('rejects missing type discriminant', () => {
		expect(() => AssetEntrySchema.parse({ key: 'bg-stars', path: 'bg.png' })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// AssetManifest
// ---------------------------------------------------------------------------

describe('AssetManifestSchema', () => {
	const minimalManifest = {
		version: MANIFEST_VERSION,
		generatedAt: ISO_NOW,
		assets: [],
	};

	it('parses minimal manifest with empty assets', () => {
		const result = AssetManifestSchema.parse(minimalManifest);
		expect(result).toEqual(
			expect.objectContaining({
				version: MANIFEST_VERSION,
				generatedAt: ISO_NOW,
			}),
		);
		expect(result.assets).toHaveLength(0);
	});

	it('parses manifest with all three asset types', () => {
		const result = AssetManifestSchema.parse({
			...minimalManifest,
			assets: [minimalSpriteSheet, minimalImage, minimalAudio],
		});
		expect(result.assets).toHaveLength(3);
		expect(result.assets.map((a) => a.type)).toEqual(['sprite-sheet', 'image', 'audio']);
	});

	it('rejects version 0', () => {
		expect(() => AssetManifestSchema.parse({ ...minimalManifest, version: 0 })).toThrow();
	});

	it('rejects non-integer version', () => {
		expect(() => AssetManifestSchema.parse({ ...minimalManifest, version: 1.5 })).toThrow();
	});

	it('rejects non-ISO generatedAt', () => {
		expect(() =>
			AssetManifestSchema.parse({ ...minimalManifest, generatedAt: '2024-01-01' }),
		).toThrow();
	});

	it('rejects missing generatedAt', () => {
		const { generatedAt: _ga, ...rest } = minimalManifest;
		expect(() => AssetManifestSchema.parse(rest)).toThrow();
	});

	it('rejects invalid asset entry in assets array', () => {
		expect(() =>
			AssetManifestSchema.parse({
				...minimalManifest,
				assets: [{ type: 'unknown', key: 'bad' }],
			}),
		).toThrow();
	});
});
