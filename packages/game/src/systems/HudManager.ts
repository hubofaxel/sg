import type * as Phaser from 'phaser';

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

	constructor(config: HudManagerConfig) {
		this.scene = config.scene;
		const { width } = config.scene.scale;

		this.scoreText = config.scene.add.text(10, 10, 'SCORE: 0', {
			fontSize: '16px',
			fontFamily: 'monospace',
			color: '#ffffff',
		});
		this.livesText = config.scene.add.text(10, 30, `LIVES: ${config.initialLives}`, {
			fontSize: '16px',
			fontFamily: 'monospace',
			color: '#ff6666',
		});
		this.currencyText = config.scene.add.text(10, 50, 'CREDITS: 0', {
			fontSize: '16px',
			fontFamily: 'monospace',
			color: '#ffdd00',
		});
		this.waveText = config.scene.add
			.text(width / 2, 12, '', {
				fontSize: '14px',
				fontFamily: 'monospace',
				color: '#888888',
			})
			.setOrigin(0.5, 0);
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
		const banner = this.scene.add
			.text(width / 2, height * 0.2, text, {
				fontSize: '22px',
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

		this.scene.add
			.text(width / 2, height * 0.35, 'GAME OVER', {
				fontSize: '40px',
				fontFamily: 'monospace',
				color: '#ff4444',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.45, `SCORE: ${score}`, {
				fontSize: '24px',
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.52, `CREDITS: ${currency}`, {
				fontSize: '18px',
				fontFamily: 'monospace',
				color: '#ffdd00',
			})
			.setOrigin(0.5);

		const restart = this.scene.add
			.text(width / 2, height * 0.6, 'PRESS SPACE OR CLICK TO RESTART', {
				fontSize: '16px',
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

	showStageClear(score: number, currency: number, onContinue: () => void): void {
		const { width, height } = this.scene.scale;

		this.scene.add
			.text(width / 2, height * 0.3, 'STAGE CLEAR!', {
				fontSize: '40px',
				fontFamily: 'monospace',
				color: '#00ff88',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.42, `SCORE: ${score}`, {
				fontSize: '24px',
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		this.scene.add
			.text(width / 2, height * 0.5, `CREDITS: ${currency}`, {
				fontSize: '18px',
				fontFamily: 'monospace',
				color: '#ffdd00',
			})
			.setOrigin(0.5);

		const cont = this.scene.add
			.text(width / 2, height * 0.6, 'PRESS SPACE OR CLICK TO CONTINUE', {
				fontSize: '16px',
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
}
