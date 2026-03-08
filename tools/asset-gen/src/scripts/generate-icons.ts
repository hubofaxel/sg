// One-shot script: generate all icon sizes from logo-mark.png
// Run via: pnpm --filter @sg/asset-gen tsx src/scripts/generate-icons.ts

import path from 'node:path';
import sharp from 'sharp';
import { ASSETS_ROOT } from '../lib/manifest-builder.js';

const src = path.join(ASSETS_ROOT, 'branding/logo-mark.png');
const staticDir = path.resolve(ASSETS_ROOT, '../../static');

const sizes = [
	{ name: 'favicon-16.png', size: 16 },
	{ name: 'favicon-32.png', size: 32 },
	{ name: 'favicon-48.png', size: 48 },
	{ name: 'apple-touch-icon.png', size: 180 },
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
];

async function run() {
	const meta = await sharp(src).metadata();
	console.log(`Source: ${meta.width}x${meta.height}`);

	for (const { name, size } of sizes) {
		await sharp(src)
			.resize(size, size, { kernel: 'nearest' })
			.png()
			.toFile(path.join(staticDir, name));
		console.log(`  Created: ${name} (${size}x${size})`);
	}

	// Maskable icon: solid background + mark scaled to 70% for safe-zone compliance
	const markSize = Math.round(512 * 0.7);
	const markBuffer = await sharp(src)
		.resize(markSize, markSize, { kernel: 'nearest' })
		.png()
		.toBuffer();
	const offset = Math.round((512 - markSize) / 2);

	await sharp({
		create: {
			width: 512,
			height: 512,
			channels: 4,
			background: { r: 10, g: 10, b: 26, alpha: 255 },
		},
	})
		.composite([{ input: markBuffer, top: offset, left: offset }])
		.png()
		.toFile(path.join(staticDir, 'icon-maskable-512.png'));
	console.log('  Created: icon-maskable-512.png (512x512, maskable)');

	console.log(`\nAll icons written to: ${staticDir}`);
}

run().catch(console.error);
