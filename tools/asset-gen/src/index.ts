#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// @sg/asset-gen CLI — asset generation pipeline
// Usage: pnpm --filter @sg/asset-gen cli <command> [options]
// ---------------------------------------------------------------------------

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env from package root (tools/asset-gen/.env)
const envPath = resolve(import.meta.dirname, '../.env');
if (existsSync(envPath)) {
	for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();
		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

const [command, ...args] = process.argv.slice(2);

function parseFlag(flag: string): string | undefined {
	const idx = args.indexOf(flag);
	if (idx === -1) return undefined;
	return args[idx + 1];
}

function hasFlag(flag: string): boolean {
	return args.includes(flag);
}

async function main(): Promise<void> {
	switch (command) {
		case 'generate': {
			const { generateAll, generateKey } = await import('./commands/generate.js');
			const key = parseFlag('--key');
			if (hasFlag('--all') || !key) {
				await generateAll();
			} else {
				await generateKey(key);
			}
			break;
		}

		case 'staging': {
			const { listStaging } = await import('./commands/staging.js');
			const key = parseFlag('--key');
			listStaging(key ?? undefined);
			break;
		}

		case 'promote': {
			const { promoteKey } = await import('./commands/promote.js');
			const key = parseFlag('--key');
			if (!key) {
				console.error('Usage: promote --key <asset-key> [--timestamp <ts>]');
				process.exit(1);
			}
			const timestamp = parseFlag('--timestamp');
			promoteKey(key, timestamp ?? undefined);
			break;
		}

		case 'assemble': {
			const { assembleAll, assembleKey } = await import('./commands/assemble.js');
			const key = parseFlag('--key');
			if (hasFlag('--all') || !key) {
				await assembleAll();
			} else {
				await assembleKey(key);
			}
			break;
		}

		case 'manifest': {
			const { rebuildManifest } = await import('./commands/manifest.js');
			await rebuildManifest();
			break;
		}

		case 'validate': {
			const { runValidation } = await import('./commands/validate.js');
			const ok = await runValidation();
			if (!ok) process.exit(1);
			break;
		}

		case 'placeholder': {
			const { placeholderAll, placeholderKey } = await import('./commands/placeholder.js');
			const key = parseFlag('--key');
			if (hasFlag('--all') || !key) {
				await placeholderAll();
			} else {
				await placeholderKey(key);
			}
			break;
		}

		default:
			console.error(`Unknown command: ${command ?? '(none)'}`);
			console.error(
				'Available: generate, staging, promote, assemble, manifest, validate, placeholder',
			);
			process.exit(1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
