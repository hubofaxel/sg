#!/usr/bin/env tsx
// ---------------------------------------------------------------------------
// @sg/asset-gen CLI — asset generation pipeline
// Usage: pnpm --filter @sg/asset-gen cli <command> [options]
// ---------------------------------------------------------------------------

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
			console.error('Available: generate, assemble, manifest, validate, placeholder');
			process.exit(1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
