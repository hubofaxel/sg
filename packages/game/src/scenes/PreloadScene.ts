import { type AssetEntry, AssetManifestSchema } from '@sg/contracts';
import Phaser from 'phaser';
import type { GameEventBus } from '../events';
import { SCENE_KEYS } from './index';

/**
 * PreloadScene — fetches the asset manifest and queues all Phaser loader calls.
 * On completion, emits 'ready' to the Svelte shell.
 */
export class PreloadScene extends Phaser.Scene {
	private eventBus!: GameEventBus;

	constructor() {
		super({ key: SCENE_KEYS.Preload });
	}

	init(): void {
		this.eventBus = this.registry.get('eventBus') as GameEventBus;
	}

	preload(): void {
		this.load.json('asset-manifest', '/assets/asset-manifest.json');
	}

	create(): void {
		const raw = this.cache.json.get('asset-manifest');
		const result = AssetManifestSchema.safeParse(raw);

		if (!result.success) {
			const err = new Error(`Asset manifest validation failed: ${result.error.message}`);
			console.error(err);
			this.eventBus.emit('error', err);
			return;
		}

		const manifest = result.data;

		for (const entry of manifest.assets) {
			this.queueAsset(entry);
		}

		this.load.once('complete', () => {
			this.eventBus.emit('ready');
			// TODO: transition to MenuScene when it exists
			// this.scene.start(SCENE_KEYS.Menu);
		});

		this.load.start();
	}

	private assetUrl(relativePath: string): string {
		return `/assets/${relativePath}`;
	}

	private queueAsset(entry: AssetEntry): void {
		switch (entry.type) {
			case 'sprite-sheet':
				this.load.spritesheet(entry.key, this.assetUrl(entry.path), {
					frameWidth: entry.frameConfig.frameWidth,
					frameHeight: entry.frameConfig.frameHeight,
					endFrame: entry.frameConfig.frameCount - 1,
					margin: entry.frameConfig.margin,
					spacing: entry.frameConfig.spacing,
				});
				break;
			case 'image':
				this.load.image(entry.key, this.assetUrl(entry.path));
				break;
			case 'audio':
				this.load.audio(
					entry.key,
					entry.paths.map((p) => this.assetUrl(p)),
				);
				break;
		}
	}
}
