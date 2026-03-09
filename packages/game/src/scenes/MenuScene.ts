import * as Phaser from 'phaser';
import type { GameEventBus } from '../events';
import { computeTextScaleFactor, scaleFontSize } from '../systems/HudScale';
import { SCENE_KEYS } from './index';

export class MenuScene extends Phaser.Scene {
	private eventBus!: GameEventBus;
	private titleText!: Phaser.GameObjects.Text;
	private promptText!: Phaser.GameObjects.Text;
	private backgroundImage: Phaser.GameObjects.Image | null = null;
	private resizeListener: (() => void) | null = null;

	constructor() {
		super({ key: SCENE_KEYS.Menu });
	}

	init(): void {
		this.eventBus = this.registry.get('eventBus') as GameEventBus;
	}

	create(): void {
		const { width, height } = this.scale;
		const textScale = this.getTextScale();

		// Starfield background
		if (this.textures.exists('bg-starfield-sparse')) {
			this.backgroundImage = this.add.image(width / 2, height / 2, 'bg-starfield-sparse');
			this.backgroundImage.setDisplaySize(width, height);
		} else {
			this.cameras.main.setBackgroundColor('#0a0a1a');
		}

		// Title
		this.titleText = this.add
			.text(width / 2, height * 0.3, 'SHIP GAME', {
				fontSize: `${scaleFontSize(48, textScale)}px`,
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		// Prompt
		this.promptText = this.add
			.text(width / 2, height * 0.55, 'PRESS SPACE OR CLICK TO PLAY', {
				fontSize: `${scaleFontSize(18, textScale)}px`,
				fontFamily: 'monospace',
				color: '#aaaaaa',
			})
			.setOrigin(0.5);

		// Blink the prompt
		this.tweens.add({
			targets: this.promptText,
			alpha: 0.3,
			duration: 800,
			yoyo: true,
			repeat: -1,
		});

		// Input handlers
		this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
		this.input.once('pointerdown', () => this.startGame());

		this.resizeListener = () => this.layoutForResize();
		this.scale.on('resize', this.resizeListener);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			if (this.resizeListener) {
				this.scale.off('resize', this.resizeListener);
				this.resizeListener = null;
			}
		});

		this.eventBus.emit('scene-change', 'menu');
	}

	private startGame(): void {
		this.scene.start(SCENE_KEYS.Game);
	}

	private getTextScale(): number {
		return computeTextScaleFactor(this.scale.displaySize.width, this.scale.displaySize.height);
	}

	private layoutForResize(): void {
		const { width, height } = this.scale;
		const textScale = this.getTextScale();

		this.backgroundImage?.setPosition(width / 2, height / 2);
		this.backgroundImage?.setDisplaySize(width, height);

		this.titleText.setPosition(width / 2, height * 0.3);
		this.titleText.setFontSize(scaleFontSize(48, textScale));

		this.promptText.setPosition(width / 2, height * 0.55);
		this.promptText.setFontSize(scaleFontSize(18, textScale));
	}
}
