// ---------------------------------------------------------------------------
// Image processing — Sharp operations for the asset pipeline
// ---------------------------------------------------------------------------

import sharp from 'sharp';

/** Trim transparent pixels from edges */
export async function alphaTrim(input: Buffer): Promise<Buffer> {
	return sharp(input).trim().toBuffer();
}

/** Pad image to exact square dimensions with transparent background */
export async function padToSquare(input: Buffer, size: number): Promise<Buffer> {
	const metadata = await sharp(input).metadata();
	const w = metadata.width ?? size;
	const h = metadata.height ?? size;

	if (w === size && h === size) return input;

	return sharp(input)
		.resize(size, size, {
			fit: 'contain',
			background: { r: 0, g: 0, b: 0, alpha: 0 },
			kernel: 'nearest',
		})
		.toBuffer();
}

/** Resize with nearest-neighbor interpolation (preserves pixel art) */
export async function resizeNearest(input: Buffer, width: number, height: number): Promise<Buffer> {
	return sharp(input).resize(width, height, { kernel: 'nearest' }).toBuffer();
}

/** Reduce color palette by quantizing to N colors */
export async function quantize(input: Buffer, colors: number = 16): Promise<Buffer> {
	return sharp(input).png({ palette: true, colours: colors, quality: 100 }).toBuffer();
}

/** Assemble multiple frame buffers into a horizontal grid sprite sheet */
export async function assembleGrid(
	frames: Buffer[],
	frameWidth: number,
	frameHeight: number,
	columns?: number,
): Promise<Buffer> {
	const cols = columns ?? frames.length;
	const rows = Math.ceil(frames.length / cols);
	const sheetWidth = cols * frameWidth;
	const sheetHeight = rows * frameHeight;

	const composites = await Promise.all(
		frames.map(async (frame, i) => {
			const resized = await resizeNearest(frame, frameWidth, frameHeight);
			const col = i % cols;
			const row = Math.floor(i / cols);
			return {
				input: resized,
				left: col * frameWidth,
				top: row * frameHeight,
			};
		}),
	);

	return sharp({
		create: {
			width: sheetWidth,
			height: sheetHeight,
			channels: 4,
			background: { r: 0, g: 0, b: 0, alpha: 0 },
		},
	})
		.composite(composites)
		.png()
		.toBuffer();
}

/** Verify sprite sheet dimensions match frame config */
export function verifySheetDimensions(
	width: number,
	height: number,
	frameWidth: number,
	frameHeight: number,
	frameCount: number,
): { valid: boolean; message?: string } {
	if (width % frameWidth !== 0) {
		return {
			valid: false,
			message: `Sheet width ${width} not divisible by frameWidth ${frameWidth}`,
		};
	}
	if (height % frameHeight !== 0) {
		return {
			valid: false,
			message: `Sheet height ${height} not divisible by frameHeight ${frameHeight}`,
		};
	}

	const cols = width / frameWidth;
	const rows = height / frameHeight;
	const capacity = cols * rows;

	if (frameCount > capacity) {
		return {
			valid: false,
			message: `frameCount ${frameCount} exceeds sheet capacity ${capacity} (${cols}x${rows})`,
		};
	}

	return { valid: true };
}
