// ---------------------------------------------------------------------------
// OpenAI client — three explicit API paths for asset generation
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import type { AssetCatalogEntry } from '../config/asset-catalog.js';
import { buildPrompt } from '../config/prompt-templates.js';

let client: OpenAI | undefined;

function getClient(): OpenAI {
	if (!client) {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('OPENAI_API_KEY environment variable is required');
		}
		client = new OpenAI({ apiKey });
	}
	return client;
}

export interface GenerateResult {
	buffer: Buffer;
	revisedPrompt?: string;
}

/** Lane A — fresh generation via images.generate */
export async function generateImage(entry: AssetCatalogEntry): Promise<GenerateResult> {
	const ai = getClient();
	const prompt = buildPrompt(entry);

	const response = await ai.images.generate({
		model: entry.model ?? 'gpt-image-1.5',
		prompt,
		n: 1,
		size: entry.inputSize ?? '1024x1024',
		quality: entry.quality ?? 'high',
		background: entry.background ?? 'transparent',
		output_format: entry.outputFormat ?? 'png',
	});

	const imageData = response.data?.[0];
	if (!imageData?.b64_json) {
		throw new Error(`No image data returned for ${entry.key}`);
	}

	return {
		buffer: Buffer.from(imageData.b64_json, 'base64'),
		revisedPrompt: imageData.revised_prompt ?? undefined,
	};
}

/** Lane B — edit from canonical parent via images.edit */
export async function editImage(
	entry: AssetCatalogEntry,
	parentImagePath: string,
	maskPath?: string,
): Promise<GenerateResult> {
	const ai = getClient();
	const prompt = buildPrompt(entry);

	const imageFile = fs.createReadStream(parentImagePath);

	const params: OpenAI.ImageEditParams = {
		model: entry.model ?? 'gpt-image-1.5',
		image: imageFile,
		prompt,
		n: 1,
		size: entry.inputSize ?? '1024x1024',
	};

	if (maskPath) {
		params.mask = fs.createReadStream(maskPath);
	}

	const response = await ai.images.edit(params);

	const imageData = response.data?.[0];
	if (!imageData?.b64_json) {
		throw new Error(`No image data returned for edit of ${entry.key}`);
	}

	return {
		buffer: Buffer.from(imageData.b64_json, 'base64'),
	};
}

/** Lineage-preserving edits via responses.create — rare, explicit use only */
export async function editImageWithResponses(
	entry: AssetCatalogEntry,
	parentImagePath: string,
): Promise<GenerateResult> {
	const ai = getClient();
	const prompt = buildPrompt(entry);
	const imageBuffer = fs.readFileSync(parentImagePath);
	const base64Image = imageBuffer.toString('base64');
	const ext = path.extname(parentImagePath).slice(1) || 'png';
	const mediaType = `image/${ext}` as 'image/png' | 'image/jpeg' | 'image/webp';

	const response = await ai.responses.create({
		model: entry.model ?? 'gpt-image-1.5',
		input: [
			{
				role: 'user' as const,
				content: [
					{
						type: 'input_image' as const,
						image_url: `data:${mediaType};base64,${base64Image}`,
						detail: 'auto' as const,
					},
					{
						type: 'input_text' as const,
						text: prompt,
					},
				],
			},
		],
		tools: [{ type: 'image_generation' as const, quality: entry.quality ?? 'high' }],
	});

	// biome-ignore lint/suspicious/noExplicitAny: OpenAI response output types are complex unions
	const imageOutput = response.output.find((o: any) => o.type === 'image_generation_call');
	if (!imageOutput || !('result' in imageOutput)) {
		throw new Error(`No image output in responses.create for ${entry.key}`);
	}

	return {
		buffer: Buffer.from((imageOutput as { result: string }).result, 'base64'),
	};
}
