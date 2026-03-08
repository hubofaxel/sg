// ---------------------------------------------------------------------------
// generate command — generate assets via OpenAI API
// Branches by sourceMode, not by asset kind
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { ASSET_CATALOG, type AssetCatalogEntry, getCatalogEntry } from '../config/asset-catalog.js';
import { ASSETS_ROOT } from '../lib/manifest-builder.js';
import { editImage, editImageWithResponses, generateImage } from '../lib/openai-client.js';

function resolveOutputPath(entry: AssetCatalogEntry): string {
	let outputPath = entry.outputPath;
	// Audio entries don't have extension in catalog
	if (entry.kind === 'audio') {
		outputPath += '.ogg';
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
			fs.mkdirSync(path.dirname(outputPath), { recursive: true });
			fs.writeFileSync(outputPath, result.buffer);
			console.log(`  OK: ${outputPath} (${result.buffer.length} bytes)`);
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

			fs.mkdirSync(path.dirname(outputPath), { recursive: true });
			fs.writeFileSync(outputPath, result.buffer);
			console.log(`  OK: ${outputPath} (${result.buffer.length} bytes)`);
			break;
		}

		default:
			throw new Error(`Unknown sourceMode: ${entry.sourceMode}`);
	}
}

export async function generateAll(): Promise<void> {
	const entries = ASSET_CATALOG.filter(
		(e) => e.sourceMode === 'openai-generate' || e.sourceMode === 'openai-edit',
	);
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
