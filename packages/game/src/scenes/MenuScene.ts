import * as Phaser from 'phaser';
import type { GameEventBus } from '../events';
import { computeTextScaleFactor, scaleFontSize } from '../systems/HudScale';
import type { SafeAreaInsets } from '../systems/SafeAreaInsets';
import { toWorldInsets, ZERO_INSETS } from '../systems/SafeAreaInsets';
import { SCENE_KEYS } from './index';

/** Data passed when returning from GameScene */
export interface MenuSceneData {
	lastScore?: number;
}

// Starfield scroll speed in world pixels per second
const SCROLL_SPEED = 15;

export class MenuScene extends Phaser.Scene {
	private eventBus!: GameEventBus;
	private titleText!: Phaser.GameObjects.Text;
	private promptText!: Phaser.GameObjects.Text;
	private scoreText: Phaser.GameObjects.Text | null = null;
	private bg1: Phaser.GameObjects.Image | null = null;
	private bg2: Phaser.GameObjects.Image | null = null;
	private resizeListener: (() => void) | null = null;
	private lastScore: number | undefined;
	private launching = false;

	constructor() {
		super({ key: SCENE_KEYS.Menu });
	}

	init(data?: MenuSceneData): void {
		this.eventBus = this.registry.get('eventBus') as GameEventBus;
		this.lastScore = data?.lastScore;
		this.launching = false;
		this.scoreText = null;
	}

	create(): void {
		const { width, height } = this.scale;
		const textScale = this.getTextScale();
		const wi = this.getWorldInsets();

		// Scrolling starfield — two copies for seamless vertical loop
		const bgKey = 'bg-starfield-sparse';
		if (this.textures.exists(bgKey)) {
			this.bg1 = this.add.image(width / 2, height / 2, bgKey);
			this.bg1.setDisplaySize(width, height);
			this.bg1.setDepth(-1);

			this.bg2 = this.add.image(width / 2, -height / 2, bgKey);
			this.bg2.setDisplaySize(width, height);
			this.bg2.setDepth(-1);
		} else {
			this.cameras.main.setBackgroundColor('#0a0a1a');
		}

		// Title
		this.titleText = this.add
			.text(width / 2, height * 0.28, 'SHIP GAME', {
				fontSize: `${scaleFontSize(48, textScale)}px`,
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5)
			.setAlpha(0);

		// Last run score (shown when returning from game over)
		if (this.lastScore != null) {
			this.scoreText = this.add
				.text(width / 2, height * 0.42, `LAST SCORE: ${this.lastScore}`, {
					fontSize: `${scaleFontSize(16, textScale)}px`,
					fontFamily: 'monospace',
					color: '#888888',
				})
				.setOrigin(0.5)
				.setAlpha(0);
		}

		// Launch prompt
		const promptY = this.lastScore != null ? 0.55 : 0.5;
		this.promptText = this.add
			.text(width / 2, height * promptY, 'TAP TO LAUNCH', {
				fontSize: `${scaleFontSize(18, textScale)}px`,
				fontFamily: 'monospace',
				color: '#00ff88',
			})
			.setOrigin(0.5)
			.setAlpha(0);

		// Fade in UI elements
		this.tweens.add({
			targets: this.titleText,
			alpha: 1,
			duration: 600,
			ease: 'Sine.easeOut',
		});

		const fadeTargets = [this.promptText];
		if (this.scoreText) fadeTargets.push(this.scoreText);

		this.tweens.add({
			targets: fadeTargets,
			alpha: 1,
			duration: 600,
			delay: 300,
			ease: 'Sine.easeOut',
			onComplete: () => {
				// Pulse the prompt after it fades in
				this.tweens.add({
					targets: this.promptText,
					alpha: 0.3,
					duration: 1000,
					yoyo: true,
					repeat: -1,
				});
			},
		});

		// Input — tap/click/space to launch
		const launch = () => this.launchGame();
		this.input.keyboard?.once('keydown-SPACE', launch);
		this.input.once('pointerdown', launch);

		// Resize handling
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

	update(_time: number, delta: number): void {
		// Scroll starfield downward for a sense of motion
		if (this.bg1 && this.bg2) {
			const dy = (SCROLL_SPEED * delta) / 1000;
			this.bg1.y += dy;
			this.bg2.y += dy;

			const { height } = this.scale;
			// When the top image scrolls past the bottom, wrap it above the other
			if (this.bg1.y > height * 1.5) {
				this.bg1.y = this.bg2.y - height;
			}
			if (this.bg2.y > height * 1.5) {
				this.bg2.y = this.bg1.y - height;
			}
		}
	}

	private launchGame(): void {
		if (this.launching) return;
		this.launching = true;

		// Unlock audio context on first user gesture
		if (this.sound.locked) {
			this.sound.unlock();
		}

		// Launch transition: fade out UI, brief pause, then start game
		this.tweens.add({
			targets: [this.titleText, this.promptText, this.scoreText].filter(Boolean),
			alpha: 0,
			duration: 400,
			ease: 'Sine.easeIn',
		});

		this.cameras.main.fadeOut(600, 0, 0, 0);

		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(SCENE_KEYS.Game);
		});
	}

	private getTextScale(): number {
		return computeTextScaleFactor(this.scale.displaySize.width, this.scale.displaySize.height);
	}

	private getWorldInsets(): SafeAreaInsets {
		const raw = this.registry.get('safeAreaInsets') as SafeAreaInsets | undefined;
		if (!raw) return ZERO_INSETS;
		return toWorldInsets(
			raw,
			this.scale.width,
			this.scale.height,
			this.scale.displaySize.width,
			this.scale.displaySize.height,
		);
	}

	private layoutForResize(): void {
		const { width, height } = this.scale;
		const textScale = this.getTextScale();

		if (this.bg1) {
			this.bg1.setPosition(width / 2, this.bg1.y);
			this.bg1.setDisplaySize(width, height);
		}
		if (this.bg2) {
			this.bg2.setPosition(width / 2, this.bg2.y);
			this.bg2.setDisplaySize(width, height);
		}

		this.titleText.setPosition(width / 2, height * 0.28);
		this.titleText.setFontSize(scaleFontSize(48, textScale));

		const promptY = this.lastScore != null ? 0.55 : 0.5;
		this.promptText.setPosition(width / 2, height * promptY);
		this.promptText.setFontSize(scaleFontSize(18, textScale));

		if (this.scoreText) {
			this.scoreText.setPosition(width / 2, height * 0.42);
			this.scoreText.setFontSize(scaleFontSize(16, textScale));
		}
	}
}
