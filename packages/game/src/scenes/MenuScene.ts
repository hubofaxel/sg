import * as Phaser from 'phaser';
import type { GameEventBus } from '../events';
import { SCENE_KEYS } from './index';

export class MenuScene extends Phaser.Scene {
	private eventBus!: GameEventBus;

	constructor() {
		super({ key: SCENE_KEYS.Menu });
	}

	init(): void {
		this.eventBus = this.registry.get('eventBus') as GameEventBus;
	}

	create(): void {
		const { width, height } = this.scale;

		// Starfield background
		if (this.textures.exists('bg-starfield-sparse')) {
			const bg = this.add.image(width / 2, height / 2, 'bg-starfield-sparse');
			bg.setDisplaySize(width, height);
		} else {
			this.cameras.main.setBackgroundColor('#0a0a1a');
		}

		// Title
		this.add
			.text(width / 2, height * 0.3, 'SHIP GAME', {
				fontSize: '48px',
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		// Prompt
		const prompt = this.add
			.text(width / 2, height * 0.55, 'PRESS SPACE OR CLICK TO PLAY', {
				fontSize: '18px',
				fontFamily: 'monospace',
				color: '#aaaaaa',
			})
			.setOrigin(0.5);

		// Blink the prompt
		this.tweens.add({
			targets: prompt,
			alpha: 0.3,
			duration: 800,
			yoyo: true,
			repeat: -1,
		});

		// Input handlers
		this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
		this.input.once('pointerdown', () => this.startGame());

		this.eventBus.emit('scene-change', 'menu');
	}

	private startGame(): void {
		this.scene.start(SCENE_KEYS.Game);
	}
}
