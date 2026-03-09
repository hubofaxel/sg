import type * as Phaser from 'phaser';
import { computeTextScaleFactor, HUD_TEXT_MIN_PX, scaleFontSize, scaleMargin } from './HudScale';
import type { SafeAreaInsets } from './SafeAreaInsets';
import { toWorldInsets, ZERO_INSETS } from './SafeAreaInsets';

// Base font sizes (at reference 800×600)
const BASE_HUD_SIZE = 16;
const BASE_WAVE_SIZE = 14;
const BASE_BANNER_SIZE = 22;
const BASE_TITLE_SIZE = 40;
const BASE_SCORE_SIZE = 24;
const BASE_CREDITS_SIZE = 18;
const BASE_PROMPT_SIZE = 16;
const BASE_BONUS_SIZE = 16;
const BASE_MARGIN = 10;

interface HudManagerConfig {
	scene: Phaser.Scene;
	initialLives: number;
}

export class HudManager {
	private scene: Phaser.Scene;
	private scoreText: Phaser.GameObjects.Text;
	private livesText: Phaser.GameObjects.Text;
	private currencyText: Phaser.GameObjects.Text;
	private waveText: Phaser.GameObjects.Text;
	private scaleFactor = 1;
	private resizeListener: (() => void) | null = null;
	private insetsListener: (() => void) | null = null;

	constructor(config: HudManagerConfig) {
		this.scene = config.scene;
		this.scaleFactor = computeTextScaleFactor(
			config.scene.scale.displaySize.width,
			config.scene.scale.displaySize.height,
		);

		const m = scaleMargin(BASE_MARGIN, this.scaleFactor);
		const hudSize = this.hudFontSize(BASE_HUD_SIZE);
		const waveSize = this.hudFontSize(BASE_WAVE_SIZE);
		const anchor = this.getHudAnchor(m);

		this.scoreText = config.scene.add.text(anchor.left, anchor.top, 'SCORE: 0', {
			fontSize: `${hudSize}px`,
			fontFamily: 'monospace',
			color: '#ffffff',
		});
		this.livesText = config.scene.add.text(
			anchor.left,
			anchor.top + hudSize + 4,
			`LIVES: ${config.initialLives}`,
			{
				fontSize: `${hudSize}px`,
				fontFamily: 'monospace',
				color: '#ff6666',
			},
		);
		this.currencyText = config.scene.add.text(
			anchor.left,
			anchor.top + (hudSize + 4) * 2,
			'CREDITS: 0',
			{
				fontSize: `${hudSize}px`,
				fontFamily: 'monospace',
				color: '#ffdd00',
			},
		);
		this.waveText = config.scene.add
			.text(anchor.centerX, anchor.top + 2, '', {
				fontSize: `${waveSize}px`,
				fontFamily: 'monospace',
				color: '#888888',
			})
			.setOrigin(0.5, 0);

		// Recompute on resize or inset change
		this.resizeListener = () => this.rescaleHud();
		this.scene.scale.on('resize', this.resizeListener);
		this.insetsListener = () => this.rescaleHud();
		this.scene.registry.events.on('changedata-safeAreaInsets', this.insetsListener);
	}

	updateScore(score: number): void {
		this.scoreText.setText(`SCORE: ${score}`);
	}

	updateLives(lives: number): void {
		this.livesText.setText(`LIVES: ${lives}`);
	}

	updateCurrency(currency: number): void {
		this.currencyText.setText(`CREDITS: ${currency}`);
	}

	updateWave(
		levelNumber: number,
		totalLevels: number,
		waveNumber: number,
		totalWaves: number,
	): void {
		this.waveText.setText(`LVL ${levelNumber}/${totalLevels}  WAVE ${waveNumber}/${totalWaves}`);
	}

	setWaveTextBoss(): void {
		this.waveText.setText('BOSS');
	}

	showBanner(text: string): void {
		const { width, height } = this.scene.scale;
		const fontSize = scaleFontSize(BASE_BANNER_SIZE, this.scaleFactor);
		const banner = this.scene.add
			.text(width / 2, height * 0.2, text, {
				fontSize: `${fontSize}px`,
				fontFamily: 'monospace',
				color: '#ffcc00',
			})
			.setOrigin(0.5)
			.setAlpha(0);

		this.scene.tweens.add({
			targets: banner,
			alpha: 1,
			duration: 300,
			hold: 1500,
			yoyo: true,
			onComplete: () => banner.destroy(),
		});
	}

	showGameOver(score: number, currency: number, onRestart: () => void): void {
		const { width, height } = this.scene.scale;
		const f = this.scaleFactor;

		this.scene.add
			.text(width / 2, height * 0.35, 'GAME OVER', {
				fontSize: `${scaleFontSize(BASE_TITLE_SIZE, f)}px`,
				fontFamily: 'monospace',
				color: '#ff4444',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.45, `SCORE: ${score}`, {
				fontSize: `${scaleFontSize(BASE_SCORE_SIZE, f)}px`,
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.52, `CREDITS: ${currency}`, {
				fontSize: `${scaleFontSize(BASE_CREDITS_SIZE, f)}px`,
				fontFamily: 'monospace',
				color: '#ffdd00',
			})
			.setOrigin(0.5);

		const restart = this.scene.add
			.text(width / 2, height * 0.6, 'PRESS SPACE OR CLICK TO RESTART', {
				fontSize: `${this.hudFontSize(BASE_PROMPT_SIZE)}px`,
				fontFamily: 'monospace',
				color: '#aaaaaa',
			})
			.setOrigin(0.5);

		this.scene.tweens.add({
			targets: restart,
			alpha: 0.3,
			duration: 800,
			yoyo: true,
			repeat: -1,
		});

		this.scene.time.delayedCall(500, () => {
			this.scene.input.keyboard?.once('keydown-SPACE', onRestart);
			this.scene.input.once('pointerdown', onRestart);
		});
	}

	showStageClear(
		score: number,
		currency: number,
		reward: number,
		hasNextStage: boolean,
		onContinue: () => void,
	): void {
		const { width, height } = this.scene.scale;
		const f = this.scaleFactor;

		this.scene.add
			.text(width / 2, height * 0.28, 'STAGE CLEAR!', {
				fontSize: `${scaleFontSize(BASE_TITLE_SIZE, f)}px`,
				fontFamily: 'monospace',
				color: '#00ff88',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.4, `SCORE: ${score}`, {
				fontSize: `${scaleFontSize(BASE_SCORE_SIZE, f)}px`,
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.48, `CREDITS: ${currency}`, {
				fontSize: `${scaleFontSize(BASE_CREDITS_SIZE, f)}px`,
				fontFamily: 'monospace',
				color: '#ffdd00',
			})
			.setOrigin(0.5);

		if (reward > 0) {
			this.scene.add
				.text(width / 2, height * 0.54, `BONUS: +${reward} CREDITS`, {
					fontSize: `${this.hudFontSize(BASE_BONUS_SIZE)}px`,
					fontFamily: 'monospace',
					color: '#88ff88',
				})
				.setOrigin(0.5);
		}

		const promptText = hasNextStage
			? 'PRESS SPACE OR CLICK FOR NEXT STAGE'
			: 'PRESS SPACE OR CLICK TO CONTINUE';

		const cont = this.scene.add
			.text(width / 2, height * 0.63, promptText, {
				fontSize: `${this.hudFontSize(BASE_PROMPT_SIZE)}px`,
				fontFamily: 'monospace',
				color: '#aaaaaa',
			})
			.setOrigin(0.5);

		this.scene.tweens.add({
			targets: cont,
			alpha: 0.3,
			duration: 800,
			yoyo: true,
			repeat: -1,
		});

		this.scene.time.delayedCall(500, () => {
			this.scene.input.keyboard?.once('keydown-SPACE', onContinue);
			this.scene.input.once('pointerdown', onContinue);
		});
	}

	destroy(): void {
		if (this.resizeListener) {
			this.scene.scale.off('resize', this.resizeListener);
			this.resizeListener = null;
		}
		if (this.insetsListener) {
			this.scene.registry.events.off('changedata-safeAreaInsets', this.insetsListener);
			this.insetsListener = null;
		}
	}

	/** Compute HUD font size with pixel floor */
	private hudFontSize(baseSize: number): number {
		return scaleFontSize(baseSize, this.scaleFactor, HUD_TEXT_MIN_PX);
	}

	private rescaleHud(): void {
		this.scaleFactor = computeTextScaleFactor(
			this.scene.scale.displaySize.width,
			this.scene.scale.displaySize.height,
		);

		const m = scaleMargin(BASE_MARGIN, this.scaleFactor);
		const hudSize = this.hudFontSize(BASE_HUD_SIZE);
		const waveSize = this.hudFontSize(BASE_WAVE_SIZE);
		const anchor = this.getHudAnchor(m);

		this.scoreText.setFontSize(hudSize);
		this.scoreText.setPosition(anchor.left, anchor.top);

		this.livesText.setFontSize(hudSize);
		this.livesText.setPosition(anchor.left, anchor.top + hudSize + 4);

		this.currencyText.setFontSize(hudSize);
		this.currencyText.setPosition(anchor.left, anchor.top + (hudSize + 4) * 2);

		this.waveText.setFontSize(waveSize);
		this.waveText.setPosition(anchor.centerX, anchor.top + 2);
	}

	/** Compute HUD anchor from safe area insets converted to world coordinates */
	private getHudAnchor(margin: number): { left: number; top: number; centerX: number } {
		const { width } = this.scene.scale;
		const insets = this.getWorldInsets();
		return {
			left: insets.left + margin,
			top: insets.top + margin,
			centerX: width / 2,
		};
	}

	private getWorldInsets(): SafeAreaInsets {
		const raw = this.scene.registry.get('safeAreaInsets') as SafeAreaInsets | undefined;
		if (!raw) return ZERO_INSETS;
		return toWorldInsets(
			raw,
			this.scene.scale.width,
			this.scene.scale.height,
			this.scene.scale.displaySize.width,
			this.scene.scale.displaySize.height,
		);
	}
}
