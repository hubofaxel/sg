// ---------------------------------------------------------------------------
// mountGame — the ONE public entry point for the Phaser runtime
// ---------------------------------------------------------------------------

import * as Phaser from 'phaser';
import { GameEventBus } from './events';
import { BootScene, GameScene, MenuScene, PreloadScene } from './scenes/index';
import { computeWorldSize, createSafeZone } from './systems/SafeZone';
import type { GameHandle, GameMountOptions } from './types';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export function mountGame(container: HTMLElement, options: GameMountOptions = {}): GameHandle {
	const eventBus = new GameEventBus();

	// Compute initial world size from container dimensions
	const containerWidth = container.clientWidth || DEFAULT_WIDTH;
	const containerHeight = container.clientHeight || DEFAULT_HEIGHT;
	const minWidth = options.aspectRatio?.minWidth;
	const maxWidth = options.aspectRatio?.maxWidth;
	const { width: worldWidth, height: worldHeight } = computeWorldSize(
		containerWidth,
		containerHeight,
		minWidth,
		maxWidth,
	);

	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent: container,
		width: worldWidth,
		height: worldHeight,
		pixelArt: options.pixelArt ?? true,
		backgroundColor: '#000000',
		scale: {
			mode: Phaser.Scale.FIT,
			// Canvas is centered by the Svelte shell container.
			// Disable Phaser auto-centering to avoid competing layout systems.
			autoCenter: Phaser.Scale.NO_CENTER,
		},
		physics: {
			default: 'arcade',
			arcade: {
				fixedStep: true,
				gravity: { x: 0, y: 0 },
			},
		},
		scene: [BootScene, PreloadScene, MenuScene, GameScene],
		banner: false,
	});

	// Store world dimensions and safe zone in registry
	const safeZone = createSafeZone(worldWidth, worldHeight);
	game.registry.set('worldWidth', worldWidth);
	game.registry.set('worldHeight', worldHeight);
	game.registry.set('safeZone', safeZone);

	// Stash the event bus in the registry so scenes can access it
	game.registry.set('eventBus', eventBus);

	// Stash settings in registry so scenes can read them
	if (options.settings) {
		const s = options.settings;
		game.registry.set('masterVolume', s.masterVolume ?? 0.8);
		game.registry.set('sfxVolume', s.sfxVolume ?? 1.0);
		game.registry.set('musicVolume', s.musicVolume ?? 0.7);
		game.registry.set('showFps', s.showFps ?? false);
		game.registry.set('audioVolumes', {
			master: s.masterVolume ?? 0.8,
			sfx: s.sfxVolume ?? 1.0,
			music: s.musicVolume ?? 0.7,
		});
		game.registry.set('touchControlsEnabled', s.touchControlsEnabled ?? true);
		game.registry.set('controlScheme', s.controlScheme ?? 'wasd');
		game.registry.set('touchStyle', s.touchStyle ?? 'relative');
	}

	// Resize handler — recompute world size when container changes
	let resizeTimer: ReturnType<typeof setTimeout> | null = null;
	const onResize = () => {
		// Debounce at 100ms to avoid thrashing setGameSize
		if (resizeTimer) clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			const cw = container.clientWidth || DEFAULT_WIDTH;
			const ch = container.clientHeight || DEFAULT_HEIGHT;
			const newSize = computeWorldSize(cw, ch, minWidth, maxWidth);

			// Only update if dimensions actually changed
			const currentWidth = game.registry.get('worldWidth') as number;
			const currentHeight = game.registry.get('worldHeight') as number;
			if (newSize.width === currentWidth && newSize.height === currentHeight) return;

			game.scale.setGameSize(newSize.width, newSize.height);

			const newSafeZone = createSafeZone(newSize.width, newSize.height);
			game.registry.set('worldWidth', newSize.width);
			game.registry.set('worldHeight', newSize.height);
			game.registry.set('safeZone', newSafeZone);
		}, 100);
	};

	game.scale.on('resize', onResize);

	const handle: GameHandle = {
		destroy() {
			if (resizeTimer) clearTimeout(resizeTimer);
			game.scale.off('resize', onResize);
			eventBus.removeAll();
			game.destroy(true);
		},
		pause() {
			game.pause();
		},
		resume() {
			game.resume();
		},
		updateSettings(partial) {
			for (const [key, value] of Object.entries(partial)) {
				game.registry.set(key, value);
			}
		},
		emit(event, ...args) {
			eventBus.emit(event, ...args);
		},
		on(event, handler) {
			eventBus.on(event, handler);
		},
		off(event, handler) {
			eventBus.off(event, handler);
		},
	};

	return handle;
}
