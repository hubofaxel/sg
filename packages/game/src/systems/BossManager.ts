import { bosses, v1Enemies } from '@sg/content';
import type { Boss, BossPhase, Enemy } from '@sg/contracts';
import * as Phaser from 'phaser';
import { screenShake } from './CombatFeedback';
import { BOSS_LABEL_MIN_PX, computeScaleFactor, scaleFontSize } from './HudScale';
import { applyBossPhaseFrame } from './SpriteFrames';

/** Lookup tables */
const bossById = new Map<string, Boss>(bosses.map((b) => [b.id, b]));
const enemyById = new Map<string, Enemy>(v1Enemies.map((e) => [e.id, e]));

export interface BossManagerConfig {
	scene: Phaser.Scene;
	bossId: string;
	enemies: Phaser.Physics.Arcade.Group;
	screenWidth: number;
	screenHeight: number;
	onBossDefeated: () => void;
	onMinionSpawned: (
		enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
		data: Enemy,
	) => void;
}

export class BossManager {
	private scene: Phaser.Scene;
	private boss: Boss;
	private enemies: Phaser.Physics.Arcade.Group;
	private screenWidth: number;
	private screenHeight: number;
	private onBossDefeated: () => void;
	private onMinionSpawned: BossManagerConfig['onMinionSpawned'];

	private bossSprite!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
	private currentPhaseIndex = 0;
	private maxHealth: number;
	private started = false;
	private defeated = false;
	private minionTimers: Phaser.Time.TimerEvent[] = [];

	// Health bar UI
	private healthBarBg!: Phaser.GameObjects.Rectangle;
	private healthBarFill!: Phaser.GameObjects.Rectangle;
	private healthBarWidth = 200;
	private bossNameText!: Phaser.GameObjects.Text;

	constructor(config: BossManagerConfig) {
		this.scene = config.scene;
		this.enemies = config.enemies;
		this.screenWidth = config.screenWidth;
		this.screenHeight = config.screenHeight;
		this.onBossDefeated = config.onBossDefeated;
		this.onMinionSpawned = config.onMinionSpawned;

		const bossDef = bossById.get(config.bossId);
		if (!bossDef) throw new Error(`Unknown boss: ${config.bossId}`);
		this.boss = bossDef;
		this.maxHealth = bossDef.health;
	}

	get bossGameObject(): Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle {
		return this.bossSprite;
	}

	/** Start the boss encounter: warning → entry animation → fight */
	start(): void {
		if (this.started) return;
		this.started = true;

		// Warning banner
		this.showWarningBanner(() => {
			this.spawnBoss();
		});
	}

	/** Called each frame from GameScene.update */
	update(_time: number): void {
		if (!this.started || this.defeated) return;
		if (!this.bossSprite?.active) return;

		this.checkPhaseTransition();
		this.updateMinionCounts();
	}

	/** Notify that boss was hit — returns true if boss died */
	onBossHit(currentHealth: number): boolean {
		if (this.defeated) return false;

		this.updateHealthBar(currentHealth);

		if (currentHealth <= 0) {
			this.handleBossDefeat();
			return true;
		}

		return false;
	}

	stop(): void {
		this.defeated = true;
		for (const timer of this.minionTimers) {
			timer.destroy();
		}
		this.minionTimers = [];
	}

	private showWarningBanner(onComplete: () => void): void {
		const { scene, screenWidth, screenHeight } = this;
		const factor = computeScaleFactor(
			scene.scale.displaySize.width,
			scene.scale.displaySize.height,
		);

		// Play boss alarm if available
		if (scene.cache.audio.exists('sfx-boss-alarm')) {
			scene.sound.play('sfx-boss-alarm', { volume: 0.5 });
		}

		// Flash warning text
		const warning = scene.add
			.text(screenWidth / 2, screenHeight * 0.35, 'WARNING', {
				fontSize: `${scaleFontSize(36, factor)}px`,
				fontFamily: 'monospace',
				color: '#ff0000',
			})
			.setOrigin(0.5)
			.setAlpha(0)
			.setDepth(10);

		const bossName = scene.add
			.text(screenWidth / 2, screenHeight * 0.45, this.boss.name.toUpperCase(), {
				fontSize: `${scaleFontSize(20, factor)}px`,
				fontFamily: 'monospace',
				color: '#ffcc00',
			})
			.setOrigin(0.5)
			.setAlpha(0)
			.setDepth(10);

		// Pulse the warning
		scene.tweens.add({
			targets: warning,
			alpha: 1,
			duration: 200,
			yoyo: true,
			repeat: 3,
		});

		scene.tweens.add({
			targets: bossName,
			alpha: 1,
			duration: 400,
			hold: 1200,
			yoyo: true,
			onComplete: () => {
				warning.destroy();
				bossName.destroy();
				onComplete();
			},
		});
	}

	private spawnBoss(): void {
		const def = this.boss;
		const centerX = this.screenWidth / 2;
		const entryY = def.entryPosition.y;
		const anchorY = def.anchorPosition.y;

		// Create boss game object
		if (this.scene.textures.exists(def.spriteKey)) {
			this.bossSprite = this.scene.add.sprite(centerX, entryY, def.spriteKey, 0);
		} else {
			this.bossSprite = this.scene.add.rectangle(
				centerX,
				entryY,
				def.hitbox.width,
				def.hitbox.height,
				0xffff00,
			);
		}

		this.scene.physics.add.existing(this.bossSprite);
		this.enemies.add(this.bossSprite);

		const body = this.bossSprite.body as Phaser.Physics.Arcade.Body;
		body.setSize(def.hitbox.width, def.hitbox.height);
		body.setCollideWorldBounds(true);

		// Set data keys (same pattern as regular enemies)
		this.bossSprite.setData('health', def.health);
		this.bossSprite.setData('maxHealth', def.health);
		this.bossSprite.setData('scoreValue', def.scoreValue);
		this.bossSprite.setData('contactDamage', def.contactDamage);
		this.bossSprite.setData('enemyId', def.id);
		this.bossSprite.setData('isBoss', true);
		this.bossSprite.setData('speed', def.speed);
		this.bossSprite.setData('spawnTime', this.scene.time.now);

		// Drop table — read by DropManager on boss kill
		if (def.drops.length > 0) this.bossSprite.setData('drops', def.drops);
		this.bossSprite.setData('guaranteedDropOnDeath', def.guaranteedDropOnDeath ?? false);

		if (def.combatFeedback) {
			this.bossSprite.setData('combatFeedback', def.combatFeedback);
		}

		// Apply phase 0 data
		this.applyPhaseData(this.boss.phases[0]);

		// Entry animation — slide to anchor position
		body.setVelocity(0, 0);
		body.setImmovable(true);

		this.scene.tweens.add({
			targets: this.bossSprite,
			y: anchorY,
			duration: 1500,
			ease: 'Power2',
			onComplete: () => {
				body.setImmovable(false);
				this.bossSprite.setData('spawnTime', this.scene.time.now);
				this.startMinionSpawns();
			},
		});

		// Create health bar
		this.createHealthBar();
	}

	private applyPhaseData(phase: BossPhase): void {
		const bs = this.bossSprite;
		bs.setData('movementPattern', phase.movementPattern);
		bs.setData('attackType', phase.attackType);
		bs.setData('speed', this.boss.speed * phase.speedMultiplier);

		if (phase.fireInterval != null) bs.setData('fireInterval', phase.fireInterval);
		if (phase.projectileDamage != null) bs.setData('projectileDamage', phase.projectileDamage);

		// Switch boss sprite frame for this phase (e.g. shields-up → core-exposed)
		applyBossPhaseFrame(bs, phase.spriteFrame);

		// Reset spawn time so movement patterns restart from phase transition
		bs.setData('spawnTime', this.scene.time.now);
		// Reset fire timer so boss fires promptly in new phase
		bs.setData('lastFired', 0);
	}

	private checkPhaseTransition(): void {
		const health = this.bossSprite.getData('health') as number;
		const ratio = health / this.maxHealth;

		// Find the correct phase for current health
		const phases = this.boss.phases;
		let targetPhase = 0;
		for (let i = phases.length - 1; i >= 0; i--) {
			if (ratio <= phases[i].healthThreshold) {
				targetPhase = i;
			}
		}

		if (targetPhase !== this.currentPhaseIndex) {
			this.currentPhaseIndex = targetPhase;
			this.applyPhaseData(phases[targetPhase]);
			this.restartMinionSpawns();

			// Phase transition screen shake
			screenShake(this.scene, 0.006, 200);
		}
	}

	private createHealthBar(): void {
		const barX = this.screenWidth / 2;
		const barY = 50;
		const barH = 8;
		const factor = computeScaleFactor(
			this.scene.scale.displaySize.width,
			this.scene.scale.displaySize.height,
		);

		this.healthBarBg = this.scene.add
			.rectangle(barX, barY, this.healthBarWidth + 4, barH + 4, 0x333333)
			.setDepth(5);

		this.healthBarFill = this.scene.add
			.rectangle(barX, barY, this.healthBarWidth, barH, 0xff4444)
			.setDepth(6);

		this.bossNameText = this.scene.add
			.text(barX, barY - 14, this.boss.name, {
				fontSize: `${scaleFontSize(12, factor, BOSS_LABEL_MIN_PX)}px`,
				fontFamily: 'monospace',
				color: '#ffcc00',
			})
			.setOrigin(0.5, 0.5)
			.setDepth(6);
	}

	private updateHealthBar(currentHealth: number): void {
		if (!this.healthBarFill) return;
		const ratio = Math.max(0, currentHealth / this.maxHealth);
		this.healthBarFill.setDisplaySize(this.healthBarWidth * ratio, 8);

		// Color shifts: green > yellow > red
		if (ratio > 0.6) {
			this.healthBarFill.setFillStyle(0x44ff44);
		} else if (ratio > 0.25) {
			this.healthBarFill.setFillStyle(0xffcc00);
		} else {
			this.healthBarFill.setFillStyle(0xff4444);
		}
	}

	private startMinionSpawns(): void {
		const phase = this.boss.phases[this.currentPhaseIndex];
		this.scheduleMinionSpawns(phase);
	}

	private restartMinionSpawns(): void {
		for (const timer of this.minionTimers) {
			timer.destroy();
		}
		this.minionTimers = [];
		this.startMinionSpawns();
	}

	private scheduleMinionSpawns(phase: BossPhase): void {
		for (const spawn of phase.minionSpawns) {
			const enemyDef = enemyById.get(spawn.enemyId);
			if (!enemyDef) continue;

			const intervalMs = spawn.interval * 1000;
			const timer = this.scene.time.addEvent({
				delay: intervalMs,
				loop: true,
				callback: () => {
					if (this.defeated || !this.bossSprite?.active) return;

					// Count current minions of this type
					const currentCount = this.countMinionsOfType(spawn.enemyId);
					if (currentCount >= spawn.maxConcurrent) return;

					this.spawnMinion(enemyDef);
				},
			});
			this.minionTimers.push(timer);
		}
	}

	private countMinionsOfType(enemyId: string): number {
		let count = 0;
		for (const obj of this.enemies.getChildren()) {
			const e = obj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
			if (e.getData('enemyId') === enemyId && !e.getData('isBoss')) {
				count++;
			}
		}
		return count;
	}

	private updateMinionCounts(): void {
		// Minion count enforcement is handled in scheduleMinionSpawns callback
	}

	private spawnMinion(def: Enemy): void {
		const margin = 40;
		const x = Phaser.Math.Between(margin, this.screenWidth - margin);

		let minion: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
		if (this.scene.textures.exists(def.spriteKey)) {
			minion = this.scene.add.sprite(x, -20, def.spriteKey, 0);
		} else {
			const color = def.size === 'small' ? 0xff4444 : 0xff8800;
			minion = this.scene.add.rectangle(x, -20, def.hitbox.width, def.hitbox.height, color);
		}

		this.scene.physics.add.existing(minion);
		this.enemies.add(minion);

		const body = minion.body as Phaser.Physics.Arcade.Body;
		body.setSize(def.hitbox.width, def.hitbox.height);

		minion.setData('health', def.health);
		minion.setData('scoreValue', def.scoreValue);
		minion.setData('contactDamage', def.contactDamage);
		minion.setData('enemyId', def.id);
		minion.setData('speed', def.speed);
		minion.setData('movementPattern', def.movementPattern);
		minion.setData('spawnTime', this.scene.time.now);
		minion.setData('attackType', def.attackType);
		if (def.fireInterval != null) minion.setData('fireInterval', def.fireInterval);
		if (def.projectileDamage != null) minion.setData('projectileDamage', def.projectileDamage);
		if (def.drops.length > 0) minion.setData('drops', def.drops);
		if (def.combatFeedback) minion.setData('combatFeedback', def.combatFeedback);

		this.onMinionSpawned(minion, def);
	}

	private handleBossDefeat(): void {
		this.defeated = true;

		// Stop minion spawns
		for (const timer of this.minionTimers) {
			timer.destroy();
		}
		this.minionTimers = [];

		// Dramatic screen shake
		screenShake(this.scene, 0.015, 500);

		// Chain explosions before final death burst
		this.chainExplosions(() => {
			// Remove health bar
			this.healthBarBg?.destroy();
			this.healthBarFill?.destroy();
			this.bossNameText?.destroy();

			// Final death burst (handled by GameScene's normal kill path via deathBurst)
			this.onBossDefeated();
		});
	}

	private chainExplosions(onComplete: () => void): void {
		const bx = this.bossSprite.x;
		const by = this.bossSprite.y;
		const offsets = [
			{ x: -20, y: -10, delay: 0 },
			{ x: 15, y: 5, delay: 150 },
			{ x: -5, y: -20, delay: 300 },
			{ x: 10, y: 15, delay: 450 },
			{ x: 0, y: 0, delay: 600 },
		];

		for (const { x, y, delay } of offsets) {
			this.scene.time.delayedCall(delay, () => {
				if (!this.scene) return;
				const burst = this.scene.add.rectangle(bx + x, by + y, 8, 8, 0xffaa00);
				burst.setDepth(8);
				this.scene.tweens.add({
					targets: burst,
					scaleX: 3,
					scaleY: 3,
					alpha: 0,
					duration: 200,
					onComplete: () => burst.destroy(),
				});
				screenShake(this.scene, 0.004, 80);
			});
		}

		// After chain completes, call onComplete
		this.scene.time.delayedCall(800, onComplete);
	}
}
