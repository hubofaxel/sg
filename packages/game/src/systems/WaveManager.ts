import { campaign, v1Enemies } from '@sg/content';
import type { Enemy, Level, SpawnEntry, Stage, Wave } from '@sg/contracts';
import Phaser from 'phaser';

/** Lookup enemy definitions by id */
const enemyById = new Map<string, Enemy>(v1Enemies.map((e) => [e.id, e]));

export interface WaveManagerConfig {
	scene: Phaser.Scene;
	enemies: Phaser.Physics.Arcade.Group;
	screenWidth: number;
	onEnemySpawned: (
		enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
		data: Enemy,
	) => void;
	onWaveCleared: (waveIndex: number) => void;
	onLevelCleared: (levelIndex: number) => void;
	onBossEncounter: (bossId: string) => void;
	onStageClear: () => void;
}

export class WaveManager {
	private scene: Phaser.Scene;
	private enemies: Phaser.Physics.Arcade.Group;
	private screenWidth: number;
	private onEnemySpawned: WaveManagerConfig['onEnemySpawned'];
	private onWaveCleared: WaveManagerConfig['onWaveCleared'];
	private onLevelCleared: WaveManagerConfig['onLevelCleared'];
	private onBossEncounter: WaveManagerConfig['onBossEncounter'];
	private onStageClear: WaveManagerConfig['onStageClear'];

	private stage: Stage;
	private currentLevelIndex = 0;
	private currentWaveIndex = 0;
	private enemiesAliveInWave = 0;
	private enemiesSpawnedInWave = 0;
	private totalExpectedInWave = 0;
	private spawnTimers: Phaser.Time.TimerEvent[] = [];
	private stopped = false;

	constructor(config: WaveManagerConfig) {
		this.scene = config.scene;
		this.enemies = config.enemies;
		this.screenWidth = config.screenWidth;
		this.onEnemySpawned = config.onEnemySpawned;
		this.onWaveCleared = config.onWaveCleared;
		this.onLevelCleared = config.onLevelCleared;
		this.onBossEncounter = config.onBossEncounter;
		this.onStageClear = config.onStageClear;

		// Use first stage from campaign
		this.stage = campaign.stages[0];
	}

	get currentLevel(): Level {
		return this.stage.levels[this.currentLevelIndex];
	}

	get currentWave(): Wave {
		return this.currentLevel.waves[this.currentWaveIndex];
	}

	get levelName(): string {
		return this.currentLevel.name;
	}

	get stageName(): string {
		return this.stage.name;
	}

	get waveNumber(): number {
		return this.currentWaveIndex + 1;
	}

	get totalWavesInLevel(): number {
		return this.currentLevel.waves.length;
	}

	get levelNumber(): number {
		return this.currentLevelIndex + 1;
	}

	get totalLevels(): number {
		return this.stage.levels.length;
	}

	get musicKey(): string | undefined {
		return this.stage.musicKey;
	}

	get bossId(): string {
		return this.stage.bossId;
	}

	start(): void {
		this.startWave();
	}

	/** Called by GameScene when an enemy is destroyed (killed or escaped) */
	onEnemyDestroyed(): void {
		if (this.stopped) return;
		this.enemiesAliveInWave--;

		if (this.enemiesAliveInWave <= 0 && this.enemiesSpawnedInWave >= this.totalExpectedInWave) {
			this.onWaveComplete();
		}
	}

	stop(): void {
		this.stopped = true;
		for (const timer of this.spawnTimers) {
			timer.destroy();
		}
		this.spawnTimers = [];
	}

	private startWave(): void {
		if (this.stopped) return;

		const wave = this.currentWave;
		this.enemiesAliveInWave = 0;
		this.enemiesSpawnedInWave = 0;
		this.totalExpectedInWave = wave.spawns.reduce((sum, s) => sum + s.count, 0);

		// Predelay then begin spawning
		const predelayMs = wave.predelaySeconds * 1000;
		const timer = this.scene.time.delayedCall(predelayMs, () => {
			if (this.stopped) return;
			for (const spawnEntry of wave.spawns) {
				this.scheduleSpawnGroup(spawnEntry);
			}
		});
		this.spawnTimers.push(timer);
	}

	private scheduleSpawnGroup(entry: SpawnEntry): void {
		const enemyDef = enemyById.get(entry.enemyId);
		if (!enemyDef) {
			console.warn(`[WaveManager] Unknown enemy id: ${entry.enemyId}`);
			this.enemiesSpawnedInWave += entry.count;
			return;
		}

		const delayMs = entry.delaySeconds * 1000;
		const intervalMs = entry.spawnInterval * 1000;

		for (let i = 0; i < entry.count; i++) {
			const spawnAt = delayMs + i * intervalMs;
			const timer = this.scene.time.delayedCall(spawnAt, () => {
				if (this.stopped) return;
				this.spawnSingleEnemy(enemyDef, entry.formation, i, entry.count);
			});
			this.spawnTimers.push(timer);
		}
	}

	private spawnSingleEnemy(def: Enemy, formation: string, index: number, total: number): void {
		const x = this.getFormationX(formation, index, total);

		let enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
		if (this.scene.textures.exists(def.spriteKey)) {
			enemy = this.scene.add.sprite(x, -20, def.spriteKey, 0);
		} else {
			const color = this.getEnemyColor(def.size);
			const w = def.hitbox.width;
			const h = def.hitbox.height;
			enemy = this.scene.add.rectangle(x, -20, w, h, color);
		}

		this.scene.physics.add.existing(enemy);
		this.enemies.add(enemy);

		const body = enemy.body as Phaser.Physics.Arcade.Body;
		body.setSize(def.hitbox.width, def.hitbox.height);

		enemy.setData('health', def.health);
		enemy.setData('scoreValue', def.scoreValue);
		enemy.setData('contactDamage', def.contactDamage);
		enemy.setData('enemyId', def.id);
		enemy.setData('speed', def.speed);
		enemy.setData('movementPattern', def.movementPattern);
		enemy.setData('spawnTime', this.scene.time.now);

		// Attack data — read by EnemyAttack system
		enemy.setData('attackType', def.attackType);
		if (def.fireInterval != null) enemy.setData('fireInterval', def.fireInterval);
		if (def.projectileDamage != null) enemy.setData('projectileDamage', def.projectileDamage);

		// Drop table — read by DropManager on kill
		if (def.drops.length > 0) enemy.setData('drops', def.drops);

		// Combat feedback overrides — read by CombatFeedback system
		if (def.combatFeedback) {
			enemy.setData('combatFeedback', def.combatFeedback);
		}

		this.enemiesAliveInWave++;
		this.enemiesSpawnedInWave++;

		this.onEnemySpawned(enemy, def);
	}

	private getFormationX(formation: string, index: number, total: number): number {
		const margin = 40;
		const usableWidth = this.screenWidth - margin * 2;

		switch (formation) {
			case 'row': {
				const spacing = usableWidth / (total + 1);
				return margin + spacing * (index + 1);
			}
			case 'v-formation': {
				const center = this.screenWidth / 2;
				const half = Math.floor(total / 2);
				const offset = (index - half) * 40;
				return center + offset;
			}
			case 'column':
				return this.screenWidth / 2;
			case 'grid': {
				const cols = Math.ceil(Math.sqrt(total));
				const col = index % cols;
				const colSpacing = usableWidth / (cols + 1);
				return margin + colSpacing * (col + 1);
			}
			case 'scatter':
				return Phaser.Math.Between(margin, this.screenWidth - margin);
			default:
				return Phaser.Math.Between(margin, this.screenWidth - margin);
		}
	}

	private getEnemyColor(size: string): number {
		switch (size) {
			case 'small':
				return 0xff4444;
			case 'medium':
				return 0xff8800;
			case 'large':
				return 0xff00ff;
			case 'boss':
				return 0xffff00;
			default:
				return 0xff4444;
		}
	}

	private onWaveComplete(): void {
		if (this.stopped) return;

		this.onWaveCleared(this.currentWaveIndex);

		// Next wave in this level?
		if (this.currentWaveIndex < this.currentLevel.waves.length - 1) {
			this.currentWaveIndex++;
			this.startWave();
			return;
		}

		// Level complete — next level in this stage?
		this.onLevelCleared(this.currentLevelIndex);

		if (this.currentLevelIndex < this.stage.levels.length - 1) {
			this.currentLevelIndex++;
			this.currentWaveIndex = 0;
			this.startWave();
			return;
		}

		// All waves cleared — trigger boss encounter
		this.onBossEncounter(this.stage.bossId);
	}
}
