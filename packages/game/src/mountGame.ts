// ---------------------------------------------------------------------------
// mountGame — the ONE public entry point for the Phaser runtime
// ---------------------------------------------------------------------------

import * as Phaser from 'phaser';
import { GameEventBus } from './events';
import { BootScene, GameScene, MenuScene, PreloadScene } from './scenes/index';
import type { GameHandle, GameMountOptions } from './types';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export function mountGame(container: HTMLElement, options: GameMountOptions = {}): GameHandle {
	const eventBus = new GameEventBus();

	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent: container,
		width: options.width ?? DEFAULT_WIDTH,
		height: options.height ?? DEFAULT_HEIGHT,
		pixelArt: options.pixelArt ?? true,
		backgroundColor: '#000000',
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
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

	// Stash the event bus in the registry so scenes can access it
	game.registry.set('eventBus', eventBus);

	const handle: GameHandle = {
		destroy() {
			eventBus.removeAll();
			game.destroy(true);
		},
		pause() {
			game.pause();
		},
		resume() {
			game.resume();
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
