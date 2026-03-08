// ---------------------------------------------------------------------------
// Staging — write generated assets to .work/staging/ for review before promotion
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AssetCatalogEntry } from '../config/asset-catalog.js';

const WORK_ROOT = path.resolve(import.meta.dirname, '../../.work');
const STAGING_ROOT = path.join(WORK_ROOT, 'staging');

export interface StagingMetadata {
	key: string;
	promptTemplateId: string | undefined;
	sourceMode: string;
	model: string | undefined;
	quality: string | undefined;
	inputSize: string | undefined;
	background: string | undefined;
	audioDuration: number | undefined;
	musicLengthMs: number | undefined;
	filename: string;
	sha256: string;
	bytes: number;
	createdAt: string;
	accepted: boolean;
	reviewerNote: string;
}

export interface StagingCandidate {
	key: string;
	timestamp: string;
	dir: string;
	metadata: StagingMetadata;
	filePath: string;
}

/** Write a generated asset to staging with metadata. Returns the staging directory. */
export function stageAsset(entry: AssetCatalogEntry, buffer: Buffer, filename: string): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const dir = path.join(STAGING_ROOT, entry.key, timestamp);
	fs.mkdirSync(dir, { recursive: true });

	const filePath = path.join(dir, filename);
	fs.writeFileSync(filePath, buffer);

	const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

	const metadata: StagingMetadata = {
		key: entry.key,
		promptTemplateId: entry.promptId,
		sourceMode: entry.sourceMode,
		model: entry.model,
		quality: entry.quality,
		inputSize: entry.inputSize,
		background: entry.background,
		audioDuration: entry.audioDuration,
		musicLengthMs: entry.musicLengthMs,
		filename,
		sha256,
		bytes: buffer.length,
		createdAt: new Date().toISOString(),
		accepted: false,
		reviewerNote: '',
	};

	fs.writeFileSync(path.join(dir, 'metadata.json'), `${JSON.stringify(metadata, null, '\t')}\n`);

	return dir;
}

/** List all staging candidates, optionally filtered by key. */
export function listStagingCandidates(filterKey?: string): StagingCandidate[] {
	if (!fs.existsSync(STAGING_ROOT)) return [];

	const candidates: StagingCandidate[] = [];
	const keyDirs = fs.readdirSync(STAGING_ROOT);

	for (const key of keyDirs) {
		if (filterKey && key !== filterKey) continue;

		const keyDir = path.join(STAGING_ROOT, key);
		if (!fs.statSync(keyDir).isDirectory()) continue;

		const timestamps = fs.readdirSync(keyDir).sort();
		for (const ts of timestamps) {
			const dir = path.join(keyDir, ts);
			if (!fs.statSync(dir).isDirectory()) continue;

			const metaPath = path.join(dir, 'metadata.json');
			if (!fs.existsSync(metaPath)) continue;

			const metadata: StagingMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
			const filePath = path.join(dir, metadata.filename);

			candidates.push({ key, timestamp: ts, dir, metadata, filePath });
		}
	}

	return candidates;
}

/** Mark a staging candidate as accepted and copy to runtime path. */
export function acceptCandidate(candidate: StagingCandidate, runtimePath: string): void {
	// Update metadata
	candidate.metadata.accepted = true;
	candidate.metadata.reviewerNote = `Promoted to ${runtimePath}`;
	fs.writeFileSync(
		path.join(candidate.dir, 'metadata.json'),
		`${JSON.stringify(candidate.metadata, null, '\t')}\n`,
	);

	// Copy file to runtime path
	fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
	fs.copyFileSync(candidate.filePath, runtimePath);
}

export { STAGING_ROOT };
