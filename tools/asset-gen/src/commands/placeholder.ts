// ---------------------------------------------------------------------------
// placeholder command — generate colored-silhouette placeholder PNGs
// No text labels — geometric shapes with distinct colors per asset family
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ASSET_CATALOG, type AssetCatalogEntry, getCatalogEntry } from '../config/asset-catalog.js';
import { ASSETS_ROOT } from '../lib/manifest-builder.js';

// Shape colors per group
const GROUP_COLORS: Record<string, { r: number; g: number; b: number }> = {
	ships: { r: 64, g: 160, b: 255 }, // blue
	enemies: { r: 255, g: 64, b: 64 }, // red
	bosses: { r: 200, g: 50, b: 200 }, // purple
	backgrounds: { r: 16, g: 16, b: 32 }, // dark navy
	music: { r: 0, g: 0, b: 0 }, // n/a
	effects: { r: 255, g: 200, b: 50 }, // yellow
	projectiles: { r: 50, g: 255, b: 128 }, // green
};

/** Generate an SVG shape for the placeholder */
function makeShapeSvg(
	width: number,
	height: number,
	color: { r: number; g: number; b: number },
	shape: 'triangle' | 'diamond' | 'hexagon' | 'circle',
): string {
	const fill = `rgb(${color.r},${color.g},${color.b})`;
	const cx = width / 2;
	const cy = height / 2;
	const rx = width * 0.35;
	const ry = height * 0.35;

	let path: string;
	switch (shape) {
		case 'triangle':
			path = `M ${cx} ${cy - ry} L ${cx + rx} ${cy + ry} L ${cx - rx} ${cy + ry} Z`;
			break;
		case 'diamond':
			path = `M ${cx} ${cy - ry} L ${cx + rx} ${cy} L ${cx} ${cy + ry} L ${cx - rx} ${cy} Z`;
			break;
		case 'hexagon': {
			const pts: string[] = [];
			for (let i = 0; i < 6; i++) {
				const angle = (Math.PI / 3) * i - Math.PI / 2;
				pts.push(`${cx + rx * Math.cos(angle)},${cy + ry * Math.sin(angle)}`);
			}
			path = `M ${pts.join(' L ')} Z`;
			break;
		}
		case 'circle':
			return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
				<circle cx="${cx}" cy="${cy}" r="${Math.min(rx, ry)}" fill="${fill}" />
			</svg>`;
	}

	return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
		<path d="${path}" fill="${fill}" />
	</svg>`;
}

function getShape(group: string): 'triangle' | 'diamond' | 'hexagon' | 'circle' {
	switch (group) {
		case 'ships':
			return 'triangle';
		case 'enemies':
			return 'diamond';
		case 'bosses':
			return 'hexagon';
		default:
			return 'circle';
	}
}

async function generateSpriteSheetPlaceholder(entry: AssetCatalogEntry): Promise<Buffer> {
	const frameWidth = entry.frameWidth ?? 32;
	const frameHeight = entry.frameHeight ?? 32;
	const frameCount = entry.frameCount ?? 1;
	const color = GROUP_COLORS[entry.group] ?? GROUP_COLORS.effects;
	const shape = getShape(entry.group);

	// Generate individual frames
	const frames: Buffer[] = [];
	for (let i = 0; i < frameCount; i++) {
		const svg = makeShapeSvg(frameWidth, frameHeight, color, shape);
		const frame = await sharp(Buffer.from(svg)).png().toBuffer();
		frames.push(frame);
	}

	// Assemble into horizontal strip
	const sheetWidth = frameWidth * frameCount;
	const composites = await Promise.all(
		frames.map(async (frame, i) => ({
			input: await sharp(frame).resize(frameWidth, frameHeight, { kernel: 'nearest' }).toBuffer(),
			left: i * frameWidth,
			top: 0,
		})),
	);

	return sharp({
		create: {
			width: sheetWidth,
			height: frameHeight,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.composite(composites)
		.png()
		.toBuffer();
}

async function generateBackgroundPlaceholder(
	width: number,
	height: number,
	color: { r: number; g: number; b: number },
): Promise<Buffer> {
	// Solid dark gradient with a few "star" dots
	const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="rgb(${color.r},${color.g},${color.b})" />
				<stop offset="100%" stop-color="rgb(${Math.max(0, color.r - 8)},${Math.max(0, color.g - 8)},${Math.max(0, color.b - 16)})" />
			</linearGradient>
		</defs>
		<rect width="${width}" height="${height}" fill="url(#bg)" />
		<circle cx="100" cy="80" r="1" fill="white" opacity="0.6" />
		<circle cx="300" cy="200" r="1" fill="white" opacity="0.4" />
		<circle cx="500" cy="50" r="1" fill="white" opacity="0.7" />
		<circle cx="200" cy="400" r="1" fill="white" opacity="0.5" />
		<circle cx="700" cy="300" r="1" fill="white" opacity="0.3" />
	</svg>`;

	return sharp(Buffer.from(svg)).png().toBuffer();
}

async function placeholderOne(entry: AssetCatalogEntry): Promise<void> {
	if (entry.kind === 'audio') {
		console.log(`  SKIP: ${entry.key} — audio placeholder not needed`);
		return;
	}

	const outputPath = path.join(ASSETS_ROOT, entry.outputPath);
	const color = GROUP_COLORS[entry.group] ?? GROUP_COLORS.effects;

	console.log(`Placeholder: ${entry.key}`);

	let buffer: Buffer;

	if (entry.kind === 'sprite-sheet') {
		buffer = await generateSpriteSheetPlaceholder(entry);
	} else if (entry.group === 'backgrounds') {
		// Backgrounds get gradient + stars
		const width = entry.inputSize ? parseInt(entry.inputSize.split('x')[0], 10) : 480;
		const height = entry.inputSize ? parseInt(entry.inputSize.split('x')[1], 10) : 320;
		buffer = await generateBackgroundPlaceholder(width, height, color);
	} else {
		// Generic image placeholder
		const size = 64;
		const shape = getShape(entry.group);
		const svg = makeShapeSvg(size, size, color, shape);
		buffer = await sharp(Buffer.from(svg)).png().toBuffer();
	}

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, buffer);
	console.log(`  OK: ${outputPath} (${buffer.length} bytes)`);
}

export async function placeholderAll(): Promise<void> {
	const entries = ASSET_CATALOG.filter((e) => e.kind !== 'audio');
	console.log(`Generating ${entries.length} placeholders...\n`);

	for (const entry of entries) {
		await placeholderOne(entry);
	}

	console.log('\nDone.');
}

export async function placeholderKey(key: string): Promise<void> {
	const entry = getCatalogEntry(key);
	if (!entry) {
		throw new Error(`Unknown asset key: ${key}`);
	}
	await placeholderOne(entry);
}
