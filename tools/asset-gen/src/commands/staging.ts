// ---------------------------------------------------------------------------
// staging command — list staging candidates for review
// ---------------------------------------------------------------------------

import { listStagingCandidates } from '../lib/staging.js';

export function listStaging(filterKey?: string): void {
	const candidates = listStagingCandidates(filterKey);

	if (candidates.length === 0) {
		if (filterKey) {
			console.log(`No staging candidates for key: ${filterKey}`);
		} else {
			console.log('No staging candidates. Run `generate` to create some.');
		}
		return;
	}

	// Group by key
	const byKey = new Map<string, typeof candidates>();
	for (const c of candidates) {
		const list = byKey.get(c.key) ?? [];
		list.push(c);
		byKey.set(c.key, list);
	}

	for (const [key, entries] of byKey) {
		console.log(`\n${key} (${entries.length} candidate${entries.length > 1 ? 's' : ''}):`);
		for (const c of entries) {
			const status = c.metadata.accepted ? 'accepted' : 'pending';
			const size = formatBytes(c.metadata.bytes);
			console.log(`  ${c.timestamp}  ${status}  ${size}  ${c.metadata.sha256.slice(0, 12)}...`);
		}
	}

	const pending = candidates.filter((c) => !c.metadata.accepted).length;
	const accepted = candidates.filter((c) => c.metadata.accepted).length;
	console.log(
		`\nTotal: ${candidates.length} candidate(s) — ${pending} pending, ${accepted} accepted`,
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
