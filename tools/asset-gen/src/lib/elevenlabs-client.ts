// ---------------------------------------------------------------------------
// ElevenLabs client — SFX generation and music composition
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { AssetCatalogEntry } from '../config/asset-catalog.js';
import { buildAudioPrompt } from '../config/prompt-templates.js';

let client: ElevenLabsClient | undefined;

function getClient(): ElevenLabsClient {
	if (!client) {
		const apiKey = process.env.ELEVENLABS_API_KEY;
		if (!apiKey) {
			throw new Error('ELEVENLABS_API_KEY environment variable is required');
		}
		client = new ElevenLabsClient({ apiKey });
	}
	return client;
}

export interface AudioResult {
	buffer: Buffer;
	format: string;
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) chunks.push(value);
	}
	return Buffer.concat(chunks);
}

/** Generate a sound effect via ElevenLabs text-to-sound-effects */
export async function generateSfx(entry: AssetCatalogEntry): Promise<AudioResult> {
	const el = getClient();
	const prompt = buildAudioPrompt(entry);

	const response = await el.textToSoundEffects.convert({
		text: prompt,
		durationSeconds: entry.audioDuration,
	});

	const buffer = await streamToBuffer(response);
	return { buffer, format: entry.audioFormat ?? 'mp3' };
}

/** Compose music via ElevenLabs music API */
export async function composeMusic(entry: AssetCatalogEntry): Promise<AudioResult> {
	const el = getClient();

	// biome-ignore lint/suspicious/noExplicitAny: ElevenLabs compose params vary by mode
	let response: any;

	if (entry.compositionPlan) {
		// Composition plan mode — structured multi-section generation
		response = await el.music.compose({
			compositionPlan: entry.compositionPlan,
		});
	} else {
		// Prompt mode — simple text-based generation
		const prompt = buildAudioPrompt(entry);
		response = await el.music.compose({
			prompt,
			musicLengthMs: entry.musicLengthMs ?? 120_000,
			forceInstrumental: true,
		});
	}

	const buffer = await streamToBuffer(response);
	return { buffer, format: entry.audioFormat ?? 'mp3' };
}

/** Save audio result to disk with the correct extension */
export function writeAudioFile(outputDir: string, basePath: string, result: AudioResult): string {
	const ext = `.${result.format}`;
	const fullPath = path.join(outputDir, `${basePath}${ext}`);
	fs.mkdirSync(path.dirname(fullPath), { recursive: true });
	fs.writeFileSync(fullPath, result.buffer);
	return fullPath;
}
