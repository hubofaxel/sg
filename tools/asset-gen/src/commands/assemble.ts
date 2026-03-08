// ---------------------------------------------------------------------------
// assemble command — combine individual frame images into grid sprite sheets
// Deterministic Sharp operations, no AI
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { ASSET_CATALOG, type AssetCatalogEntry, getCatalogEntry } from '../config/asset-catalog.js';
import {
	alphaTrim,
	assembleGrid,
	padToSquare,
	verifySheetDimensions,
} from '../lib/image-processing.js';
import { ASSETS_ROOT } from '../lib/manifest-builder.js';

/**
 * Assemble individual frame PNGs into a sprite sheet for a given entry.
 * Expects frames at: <outputDir>/frames/<key>-frame-0.png, -frame-1.png, etc.
 */
async function assembleOne(entry: AssetCatalogEntry): Promise<void> {
	if (entry.kind !== 'sprite-sheet') {
		console.log(`  SKIP: ${entry.key} — not a sprite sheet`);
		return;
	}

	const outputDir = path.join(ASSETS_ROOT, path.dirname(entry.outputPath));
	const framesDir = path.join(outputDir, 'frames');

	if (!fs.existsSync(framesDir)) {
		console.log(`  SKIP: ${entry.key} — no frames directory at ${framesDir}`);
		return;
	}

	const frameCount = entry.frameCount ?? 1;
	const frameWidth = entry.frameWidth ?? 32;
	const frameHeight = entry.frameHeight ?? 32;

	console.log(`Assembling: ${entry.key} (${frameCount} frames, ${frameWidth}x${frameHeight})`);

	const frames: Buffer[] = [];
	for (let i = 0; i < frameCount; i++) {
		const framePath = path.join(framesDir, `${entry.key}-frame-${i}.png`);
		if (!fs.existsSync(framePath)) {
			throw new Error(`Missing frame: ${framePath}`);
		}
		const raw = fs.readFileSync(framePath);
		const trimmed = await alphaTrim(raw);
		const padded = await padToSquare(trimmed, Math.max(frameWidth, frameHeight));
		frames.push(padded);
	}

	const sheet = await assembleGrid(frames, frameWidth, frameHeight);

	// Verify dimensions
	const sharpMeta = await (await import('sharp')).default(sheet).metadata();
	const check = verifySheetDimensions(
		sharpMeta.width ?? 0,
		sharpMeta.height ?? 0,
		frameWidth,
		frameHeight,
		frameCount,
	);
	if (!check.valid) {
		throw new Error(`Sheet verification failed for ${entry.key}: ${check.message}`);
	}

	const outputPath = path.join(ASSETS_ROOT, entry.outputPath);
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, sheet);
	console.log(`  OK: ${outputPath} (${sheet.length} bytes)`);
}

export async function assembleAll(): Promise<void> {
	const entries = ASSET_CATALOG.filter((e) => e.kind === 'sprite-sheet');
	console.log(`Assembling ${entries.length} sprite sheets...\n`);

	for (const entry of entries) {
		await assembleOne(entry);
	}

	console.log('\nDone.');
}

export async function assembleKey(key: string): Promise<void> {
	const entry = getCatalogEntry(key);
	if (!entry) {
		throw new Error(`Unknown asset key: ${key}`);
	}
	await assembleOne(entry);
}
