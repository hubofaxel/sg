// ---------------------------------------------------------------------------
// validate command — deep cross-validation of content keys, manifest, files
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { type AssetManifest, AssetManifestSchema } from '@sg/contracts';
import sharp from 'sharp';
import { ASSET_CATALOG, CURRENT_PHASE } from '../config/asset-catalog.js';
import { verifySheetDimensions } from '../lib/image-processing.js';
import { ASSETS_ROOT, MANIFEST_PATH } from '../lib/manifest-builder.js';

interface ValidationResult {
	errors: string[];
	warnings: string[];
}

export async function validateAssets(): Promise<ValidationResult> {
	const result: ValidationResult = { errors: [], warnings: [] };

	// 1. Load and validate manifest schema
	if (!fs.existsSync(MANIFEST_PATH)) {
		result.errors.push(`Manifest file not found: ${MANIFEST_PATH}`);
		return result;
	}

	let manifest: AssetManifest;
	try {
		const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
		manifest = AssetManifestSchema.parse(raw);
	} catch (err) {
		result.errors.push(`Manifest schema validation failed: ${err}`);
		return result;
	}

	const manifestKeys = new Set(manifest.assets.map((a) => a.key));
	const catalogKeys = new Set(ASSET_CATALOG.map((e) => e.key));

	// 2. Every catalog key resolves to a manifest entry (skip future-phase entries)
	for (const entry of ASSET_CATALOG) {
		if (entry.phase && entry.phase > CURRENT_PHASE) continue;
		if (!manifestKeys.has(entry.key)) {
			result.errors.push(`Catalog key "${entry.key}" missing from manifest`);
		}
	}

	// 3. No duplicate keys in manifest
	const seen = new Set<string>();
	for (const asset of manifest.assets) {
		if (seen.has(asset.key)) {
			result.errors.push(`Duplicate manifest key: "${asset.key}"`);
		}
		seen.add(asset.key);
	}

	// 4. Orphaned manifest entries
	for (const asset of manifest.assets) {
		if (!catalogKeys.has(asset.key)) {
			result.warnings.push(`Orphaned manifest key: "${asset.key}" (no catalog entry)`);
		}
	}

	// 5. File existence and dimension checks
	for (const asset of manifest.assets) {
		if (asset.type === 'audio') {
			// Check audio paths
			let anyExists = false;
			for (const audioPath of asset.paths) {
				const fullPath = path.join(ASSETS_ROOT, audioPath);
				if (fs.existsSync(fullPath)) {
					anyExists = true;
				}
			}
			if (!anyExists) {
				// Audio placeholders don't exist on disk — warning not error
				result.warnings.push(`Audio "${asset.key}": no audio files found on disk`);
			}
			continue;
		}

		const fullPath = path.join(ASSETS_ROOT, asset.path);
		if (!fs.existsSync(fullPath)) {
			result.errors.push(`File not found: ${asset.path} (key: ${asset.key})`);
			continue;
		}

		// Verify file is inside assets root
		const resolved = path.resolve(fullPath);
		if (!resolved.startsWith(path.resolve(ASSETS_ROOT))) {
			result.errors.push(`File escapes assets root: ${asset.path} (key: ${asset.key})`);
			continue;
		}

		if (asset.type === 'sprite-sheet') {
			const metadata = await sharp(fullPath).metadata();
			if (!metadata.width || !metadata.height) {
				result.errors.push(`Cannot read dimensions: ${asset.path} (key: ${asset.key})`);
				continue;
			}

			const check = verifySheetDimensions(
				metadata.width,
				metadata.height,
				asset.frameConfig.frameWidth,
				asset.frameConfig.frameHeight,
				asset.frameConfig.frameCount,
			);
			if (!check.valid) {
				result.errors.push(`${asset.key}: ${check.message}`);
			}
		}

		if (asset.type === 'image') {
			const catalogEntry = ASSET_CATALOG.find((e) => e.key === asset.key);
			if (catalogEntry?.group === 'backgrounds') {
				// Backgrounds should be images, not sprite sheets
				const metadata = await sharp(fullPath).metadata();
				if (metadata.width && metadata.height && metadata.width === metadata.height) {
					result.warnings.push(
						`Background "${asset.key}" is square — may be accidentally a sprite sheet`,
					);
				}
			}
		}
	}

	return result;
}

export async function runValidation(): Promise<boolean> {
	console.log('Validating assets...\n');
	const { errors, warnings } = await validateAssets();

	for (const w of warnings) {
		console.log(`  WARN: ${w}`);
	}
	for (const e of errors) {
		console.log(`  ERROR: ${e}`);
	}

	console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
	return errors.length === 0;
}
