import * as Phaser from 'phaser';
import { SCENE_KEYS } from './index';

/**
 * BootScene — first scene in the chain.
 * Sets up canvas background and immediately transitions to PreloadScene.
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super({ key: SCENE_KEYS.Boot });
	}

	create(): void {
		this.cameras.main.setBackgroundColor('#000000');
		this.scene.start(SCENE_KEYS.Preload);
	}
}
