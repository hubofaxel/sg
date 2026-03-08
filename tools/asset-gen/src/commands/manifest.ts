// ---------------------------------------------------------------------------
// manifest command — rebuild asset-manifest.json from catalog + disk scan
// ---------------------------------------------------------------------------

import { buildManifest, writeManifest } from '../lib/manifest-builder.js';

export async function rebuildManifest(): Promise<void> {
	console.log('Building asset manifest...\n');
	const manifest = await buildManifest();
	writeManifest(manifest);
}
