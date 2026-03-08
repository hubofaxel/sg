// ---------------------------------------------------------------------------
// Manifest builder — reads catalog, scans files, hashes, writes manifest
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AssetEntry, AssetManifest } from '@sg/contracts';
import { AssetManifestSchema, MANIFEST_VERSION } from '@sg/contracts';
import sharp from 'sharp';
import { ASSET_CATALOG, type AssetCatalogEntry } from '../config/asset-catalog.js';

const ASSETS_ROOT = path.resolve(import.meta.dirname, '../../../../apps/web/static/assets');
const MANIFEST_PATH = path.join(ASSETS_ROOT, 'asset-manifest.json');

function hashFile(filePath: string): { sha256: string; bytes: number } {
	const data = fs.readFileSync(filePath);
	const sha256 = crypto.createHash('sha256').update(data).digest('hex');
	return { sha256, bytes: data.length };
}

async function buildEntry(entry: AssetCatalogEntry): Promise<AssetEntry | null> {
	const fullPath = path.join(ASSETS_ROOT, entry.outputPath);

	if (entry.kind === 'audio') {
		// Audio entries reference multiple format fallbacks
		const basePath = fullPath;
		const extensions = ['.ogg', '.mp3'];
		const paths: string[] = [];
		for (const ext of extensions) {
			const audioPath = basePath + ext;
			if (fs.existsSync(audioPath)) {
				paths.push(entry.outputPath + ext);
			}
		}
		// Include placeholder entry even if no files exist yet
		if (paths.length === 0) {
			paths.push(`${entry.outputPath}.ogg`);
		}
		return {
			type: 'audio',
			key: entry.key,
			paths,
		};
	}

	if (!fs.existsSync(fullPath)) {
		console.warn(`  SKIP: ${entry.key} — file not found at ${fullPath}`);
		return null;
	}

	const { sha256, bytes } = hashFile(fullPath);

	if (entry.kind === 'sprite-sheet') {
		return {
			type: 'sprite-sheet',
			key: entry.key,
			path: entry.outputPath,
			frameConfig: {
				frameWidth: entry.frameWidth ?? 32,
				frameHeight: entry.frameHeight ?? 32,
				frameCount: entry.frameCount ?? 1,
				margin: entry.margin ?? 0,
				spacing: entry.spacing ?? 0,
			},
			sha256,
			bytes,
		};
	}

	// image
	const metadata = await sharp(fullPath).metadata();
	return {
		type: 'image',
		key: entry.key,
		path: entry.outputPath,
		width: metadata.width,
		height: metadata.height,
		sha256,
		bytes,
	};
}

export async function buildManifest(): Promise<AssetManifest> {
	const assets: AssetEntry[] = [];

	for (const entry of ASSET_CATALOG) {
		const assetEntry = await buildEntry(entry);
		if (assetEntry) {
			assets.push(assetEntry);
		}
	}

	const manifest: AssetManifest = {
		version: MANIFEST_VERSION,
		generatedAt: new Date().toISOString(),
		assets,
	};

	// Validate against schema
	AssetManifestSchema.parse(manifest);

	return manifest;
}

export function writeManifest(manifest: AssetManifest): void {
	fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
	fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, '\t')}\n`);
	console.log(`Manifest written to ${MANIFEST_PATH} (${manifest.assets.length} assets)`);
}

export { ASSETS_ROOT, MANIFEST_PATH };
