// ---------------------------------------------------------------------------
// generate command — generate assets via OpenAI API
// Branches by sourceMode, not by asset kind
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { ASSET_CATALOG, type AssetCatalogEntry, getCatalogEntry } from '../config/asset-catalog.js';
import { composeMusic, generateSfx, writeAudioFile } from '../lib/elevenlabs-client.js';
import { resizeNearest } from '../lib/image-processing.js';
import { ASSETS_ROOT } from '../lib/manifest-builder.js';
import { editImage, editImageWithResponses, generateImage } from '../lib/openai-client.js';

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

function resolveOutputPath(entry: AssetCatalogEntry): string {
	let outputPath = entry.outputPath;
	// Audio entries don't have extension in catalog — add format extension
	if (entry.kind === 'audio') {
		outputPath += `.${entry.audioFormat ?? 'mp3'}`;
	}
	return path.join(ASSETS_ROOT, outputPath);
}

async function generateOne(entry: AssetCatalogEntry): Promise<void> {
	const outputPath = resolveOutputPath(entry);

	console.log(`Generating: ${entry.key} (${entry.sourceMode})`);

	switch (entry.sourceMode) {
		case 'placeholder':
		case 'manual': {
			console.log(`  SKIP: ${entry.key} — sourceMode is ${entry.sourceMode}`);
			return;
		}

		case 'openai-generate': {
			const result = await generateImage(entry);
			const resized = await resizeToSheetDimensions(result.buffer, entry);
			fs.mkdirSync(path.dirname(outputPath), { recursive: true });
			fs.writeFileSync(outputPath, resized);
			console.log(`  OK: ${outputPath} (${resized.length} bytes)`);
			if (result.revisedPrompt) {
				console.log(`  Revised prompt: ${result.revisedPrompt}`);
			}
			break;
		}

		case 'openai-edit': {
			if (!entry.parentKey) {
				throw new Error(`${entry.key} has sourceMode=openai-edit but no parentKey`);
			}
			const parent = getCatalogEntry(entry.parentKey);
			if (!parent) {
				throw new Error(`Parent key ${entry.parentKey} not found in catalog`);
			}
			const parentPath = path.join(ASSETS_ROOT, parent.outputPath);
			if (!fs.existsSync(parentPath)) {
				throw new Error(`Parent image not found: ${parentPath}`);
			}

			const result =
				entry.api === 'responses.create'
					? await editImageWithResponses(entry, parentPath)
					: await editImage(entry, parentPath);

			const resized = await resizeToSheetDimensions(result.buffer, entry);
			fs.mkdirSync(path.dirname(outputPath), { recursive: true });
			fs.writeFileSync(outputPath, resized);
			console.log(`  OK: ${outputPath} (${resized.length} bytes)`);
			break;
		}

		case 'elevenlabs-sfx': {
			const sfxResult = await generateSfx(entry);
			const sfxPath = writeAudioFile(ASSETS_ROOT, entry.outputPath, sfxResult);
			console.log(`  OK: ${sfxPath} (${sfxResult.buffer.length} bytes)`);
			break;
		}

		case 'elevenlabs-music': {
			const musicResult = await composeMusic(entry);
			const musicPath = writeAudioFile(ASSETS_ROOT, entry.outputPath, musicResult);
			console.log(`  OK: ${musicPath} (${musicResult.buffer.length} bytes)`);
			break;
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
	console.log(`Generating ${entries.length} assets...\n`);

	for (const entry of entries) {
		await generateOne(entry);
	}

	console.log('\nDone.');
}

export async function generateKey(key: string): Promise<void> {
	const entry = getCatalogEntry(key);
	if (!entry) {
		throw new Error(`Unknown asset key: ${key}`);
	}
	await generateOne(entry);
}
