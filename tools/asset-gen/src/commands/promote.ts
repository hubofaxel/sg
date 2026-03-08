// ---------------------------------------------------------------------------
// promote command — copy accepted staging candidate to runtime asset path
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getCatalogEntry } from '../config/asset-catalog.js';
import { ASSETS_ROOT } from '../lib/manifest-builder.js';
import { acceptCandidate, listStagingCandidates } from '../lib/staging.js';

function resolveRuntimePath(key: string): string {
	const entry = getCatalogEntry(key);
	if (!entry) throw new Error(`Unknown asset key: ${key}`);

	let outputPath = entry.outputPath;
	if (entry.kind === 'audio') {
		outputPath += `.${entry.audioFormat ?? 'mp3'}`;
	}
	return path.join(ASSETS_ROOT, outputPath);
}

export function promoteKey(key: string, timestamp?: string): void {
	const candidates = listStagingCandidates(key);

	if (candidates.length === 0) {
		console.error(`No staging candidates for key: ${key}`);
		console.error('Run `pnpm --filter @sg/asset-gen cli generate --key <key>` first.');
		process.exit(1);
	}

	let candidate: (typeof candidates)[number] | undefined;
	if (timestamp) {
		candidate = candidates.find((c) => c.timestamp === timestamp);
		if (!candidate) {
			console.error(`No staging candidate for ${key} at timestamp ${timestamp}`);
			console.error('Available timestamps:');
			for (const c of candidates) {
				console.error(`  ${c.timestamp} (${c.metadata.accepted ? 'accepted' : 'pending'})`);
			}
			process.exit(1);
		}
	} else {
		// Default: latest unaccepted candidate, or latest overall
		const unaccepted = candidates.filter((c) => !c.metadata.accepted);
		candidate =
			unaccepted.length > 0 ? unaccepted[unaccepted.length - 1] : candidates[candidates.length - 1];
	}

	if (!fs.existsSync(candidate.filePath)) {
		console.error(`Staging file missing: ${candidate.filePath}`);
		process.exit(1);
	}

	const runtimePath = resolveRuntimePath(key);

	// Check for overwrite
	if (fs.existsSync(runtimePath)) {
		const existingSha = candidate.metadata.sha256;
		const existingData = fs.readFileSync(runtimePath);
		const existingHash = crypto.createHash('sha256').update(existingData).digest('hex');

		if (existingHash === existingSha) {
			console.log(`SKIP: ${key} — staging candidate is identical to runtime file.`);
			return;
		}
		console.log(`Overwriting: ${runtimePath}`);
		console.log(`  Old hash: ${existingHash}`);
		console.log(`  New hash: ${existingSha}`);
	}

	acceptCandidate(candidate, runtimePath);
	console.log(`PROMOTED: ${key}`);
	console.log(`  From: ${candidate.dir}`);
	console.log(`  To:   ${runtimePath}`);
	console.log(`  Hash: ${candidate.metadata.sha256}`);
	console.log('\nRun `pnpm asset:manifest` to rebuild the manifest.');
}
