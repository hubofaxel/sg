import Phaser from 'phaser';
import type { BulletPool, PoolStats } from './ObjectPool';

/**
 * DebugOverlay — toggled with backtick key.
 *
 * Shows pool utilization, active object counts, and frame timing
 * so we can verify pooling works and spot performance issues.
 *
 * Samples at ~4Hz when visible (every 250ms) to keep overhead negligible.
 * When hidden, update() is a single boolean check.
 */

const SAMPLE_INTERVAL_MS = 250;

export interface DebugOverlayConfig {
	scene: Phaser.Scene;
	playerBullets: BulletPool;
	enemyBullets: BulletPool;
	enemies: Phaser.Physics.Arcade.Group;
}

export class DebugOverlay {
	private scene: Phaser.Scene;
	private text: Phaser.GameObjects.Text;
	private visible = false;
	private playerBullets: BulletPool;
	private enemyBullets: BulletPool;
	private enemies: Phaser.Physics.Arcade.Group;
	private toggleKey: Phaser.Input.Keyboard.Key | null = null;
	private lastSampleTime = 0;

	constructor(config: DebugOverlayConfig) {
		this.scene = config.scene;
		this.playerBullets = config.playerBullets;
		this.enemyBullets = config.enemyBullets;
		this.enemies = config.enemies;

		const { width } = this.scene.scale;

		this.text = this.scene.add
			.text(width - 10, 10, '', {
				fontSize: '11px',
				fontFamily: 'monospace',
				color: '#00ff00',
				backgroundColor: '#000000aa',
				padding: { x: 6, y: 4 },
			})
			.setOrigin(1, 0)
			.setDepth(100)
			.setScrollFactor(0)
			.setVisible(false);

		// Toggle on backtick
		this.toggleKey =
			this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.BACKTICK) ?? null;
		this.toggleKey?.on('down', () => {
			this.toggle();
		});
	}

	update(time: number): void {
		if (!this.visible) return;

		// Throttle to ~4Hz — no need to rebuild text every frame
		if (time - this.lastSampleTime < SAMPLE_INTERVAL_MS) return;
		this.lastSampleTime = time;

		const fps = Math.round(this.scene.game.loop.actualFps);
		const frameMs = this.scene.game.loop.delta.toFixed(1);
		const pb = this.playerBullets.stats;
		const eb = this.enemyBullets.stats;
		const enemyCount = this.countActiveEnemies();
		const tweenCount = this.scene.tweens.getTweens().length;

		const lines = [
			`FPS: ${fps}  (${frameMs}ms)`,
			'',
			`P-Bullets: ${fmtPool(pb)}`,
			`E-Bullets: ${fmtPool(eb)}`,
			`Enemies:   ${enemyCount}`,
			`Tweens:    ${tweenCount}`,
		];

		this.text.setText(lines.join('\n'));
	}

	destroy(): void {
		this.toggleKey?.removeAllListeners();
		this.text.destroy();
	}

	private toggle(): void {
		this.visible = !this.visible;
		this.text.setVisible(this.visible);
		if (this.visible) {
			// Force immediate sample on toggle-on
			this.lastSampleTime = 0;
		}
	}

	private countActiveEnemies(): number {
		let count = 0;
		for (const obj of this.enemies.getChildren()) {
			if (obj.active) count++;
		}
		return count;
	}
}

function fmtPool(s: PoolStats): string {
	const growth = s.growthEvents > 0 ? ` +${s.growthEvents}!` : '';
	return `${s.active}/${s.created} (hw:${s.highWater})${growth}`;
}
