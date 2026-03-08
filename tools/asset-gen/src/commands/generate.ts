// ---------------------------------------------------------------------------
// generate command — generate assets via AI APIs, write to staging
// Assets land in .work/staging/<key>/<timestamp>/ for review before promotion.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { ASSET_CATALOG, type AssetCatalogEntry, getCatalogEntry } from '../config/asset-catalog.js';
import { composeMusic, generateSfx } from '../lib/elevenlabs-client.js';
import { resizeNearest } from '../lib/image-processing.js';
import { ASSETS_ROOT } from '../lib/manifest-builder.js';
import { editImage, editImageWithResponses, generateImage } from '../lib/openai-client.js';
import { stageAsset } from '../lib/staging.js';

/** Resize raw OpenAI output to expected sprite sheet dimensions */
async function resizeToSheetDimensions(buffer: Buffer, entry: AssetCatalogEntry): Promise<Buffer> {
	if (entry.kind !== 'sprite-sheet') return buffer;

	const frameWidth = entry.frameWidth ?? 32;
	const frameHeight = entry.frameHeight ?? 32;
	const frameCount = entry.frameCount ?? 1;
	const cols = entry.frameOrder === 'horizontal' ? frameCount : 1;
	const rows = entry.frameOrder === 'horizontal' ? 1 : frameCount;
	const sheetWidth = cols * frameWidth;
	const sheetHeight = rows * frameHeight;

	console.log(`  Resizing: ${buffer.length} bytes → ${sheetWidth}x${sheetHeight}`);
	return resizeNearest(buffer, sheetWidth, sheetHeight);
}

function resolveFilename(entry: AssetCatalogEntry): string {
	const base = path.basename(entry.outputPath);
	if (entry.kind === 'audio') {
		return `${base}.${entry.audioFormat ?? 'mp3'}`;
	}
	return base;
}

async function generateOne(entry: AssetCatalogEntry): Promise<string | null> {
	console.log(`Generating: ${entry.key} (${entry.sourceMode})`);
	const filename = resolveFilename(entry);

	switch (entry.sourceMode) {
		case 'placeholder':
		case 'manual': {
			console.log(`  SKIP: ${entry.key} — sourceMode is ${entry.sourceMode}`);
			return null;
		}

		case 'openai-generate': {
			const result = await generateImage(entry);
			const resized = await resizeToSheetDimensions(result.buffer, entry);
			const dir = stageAsset(entry, resized, filename);
			console.log(`  STAGED: ${dir}`);
			if (result.revisedPrompt) {
				console.log(`  Revised prompt: ${result.revisedPrompt}`);
			}
			return dir;
		}

		case 'openai-edit': {
			if (!entry.parentKey) {
				throw new Error(`${entry.key} has sourceMode=openai-edit but no parentKey`);
			}
			const parent = getCatalogEntry(entry.parentKey);
			if (!parent) {
				throw new Error(`Parent key ${entry.parentKey} not found in catalog`);
			}
			// Parent must be in runtime (already promoted)
			const parentPath = path.join(ASSETS_ROOT, parent.outputPath);

			const result =
				entry.api === 'responses.create'
					? await editImageWithResponses(entry, parentPath)
					: await editImage(entry, parentPath);

			const resized = await resizeToSheetDimensions(result.buffer, entry);
			const dir = stageAsset(entry, resized, filename);
			console.log(`  STAGED: ${dir}`);
			return dir;
		}

		case 'elevenlabs-sfx': {
			const sfxResult = await generateSfx(entry);
			const dir = stageAsset(entry, sfxResult.buffer, filename);
			console.log(`  STAGED: ${dir}`);
			return dir;
		}

		case 'elevenlabs-music': {
			const musicResult = await composeMusic(entry);
			const dir = stageAsset(entry, musicResult.buffer, filename);
			console.log(`  STAGED: ${dir}`);
			return dir;
		}

		default:
			throw new Error(`Unknown sourceMode: ${entry.sourceMode}`);
	}
}

export async function generateAll(): Promise<void> {
	const generatable: Set<string> = new Set([
		'openai-generate',
		'openai-edit',
		'elevenlabs-sfx',
		'elevenlabs-music',
	]);
	const entries = ASSET_CATALOG.filter((e) => generatable.has(e.sourceMode));
	console.log(`Generating ${entries.length} assets to staging...\n`);

	const staged: string[] = [];
	for (const entry of entries) {
		const dir = await generateOne(entry);
		if (dir) staged.push(dir);
	}

	console.log(`\n${staged.length} asset(s) staged for review.`);
	console.log('Run `pnpm --filter @sg/asset-gen cli staging` to list candidates.');
	console.log('Run `pnpm --filter @sg/asset-gen cli promote --key <key>` to promote.');
}

export async function generateKey(key: string): Promise<void> {
	const entry = getCatalogEntry(key);
	if (!entry) {
		throw new Error(`Unknown asset key: ${key}`);
	}
	const dir = await generateOne(entry);
	if (dir) {
		console.log(`\nStaged to: ${dir}`);
		console.log(`Promote with: pnpm --filter @sg/asset-gen cli promote --key ${key}`);
	}
}
