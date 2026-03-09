import { primaryWeapons, starterShips } from '@sg/content';
import type { WeaponLevelStats } from '@sg/contracts';
import * as Phaser from 'phaser';
import type { GameEventBus } from '../events';
import { AudioManager } from '../systems/AudioManager';
import { BossManager } from '../systems/BossManager';
import { deathBurst, flashOnHit, hitStop, screenShake, spawnIn } from '../systems/CombatFeedback';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DropManager } from '../systems/DropManager';
import { updateEnemyAttack } from '../systems/EnemyAttack';
import { updateEnemyMovement } from '../systems/EnemyMovement';
import { HudManager } from '../systems/HudManager';
import type { InputAdapter } from '../systems/InputIntent';
import { KeyboardInput } from '../systems/KeyboardInput';
import { BulletPool } from '../systems/ObjectPool';
import type { SafeZone } from '../systems/SafeZone';
import { updateEnemyAnimation, updateShipBanking } from '../systems/SpriteFrames';
import { TouchInput } from '../systems/TouchInput';
import { WaveManager } from '../systems/WaveManager';
import { SCENE_KEYS } from './index';

// Player constants from content data
const SHIP = starterShips[0];
const PLAYER_SPEED = SHIP.baseStats.speed;
const PLAYER_HITBOX = SHIP.baseStats.hitbox;
const PLAYER_MAX_LIVES = SHIP.baseStats.maxLives;

// Weapon — read level 1 stats from content
const maybeWeapon = primaryWeapons.find((w) => w.type === SHIP.baseStats.defaultWeaponType);
if (!maybeWeapon) throw new Error(`Default weapon "${SHIP.baseStats.defaultWeaponType}" not found`);
const DEFAULT_WEAPON = maybeWeapon;
const WEAPON_LEVEL = 1;

const INVINCIBLE_DURATION = 1500; // ms after taking a hit

export class GameScene extends Phaser.Scene {
	private eventBus!: GameEventBus;
	private player!: Phaser.GameObjects.Sprite;
	private inputAdapter!: InputAdapter;
	private playerBulletPool!: BulletPool;
	private enemyBulletPool!: BulletPool;
	private enemies!: Phaser.Physics.Arcade.Group;
	private debugOverlay!: DebugOverlay;
	private dropManager!: DropManager;
	private hud!: HudManager;
	private score = 0;
	private lives = PLAYER_MAX_LIVES;
	private lastFired = 0;
	private invincible = false;
	private gameOver = false;
	private waveManager!: WaveManager;
	private bossManager: BossManager | null = null;
	private audioManager!: AudioManager;
	private weaponStats!: WeaponLevelStats;
	private stageClear = false;
	private stageIndex = 0;
	private onGamePause: (() => void) | null = null;
	// biome-ignore lint/suspicious/noExplicitAny: Phaser registry event callbacks use varying signatures
	private registryListeners: Array<{ event: string; fn: (...args: any[]) => void }> = [];

	constructor() {
		super({ key: SCENE_KEYS.Game });
	}

	init(data?: { stageIndex?: number }): void {
		this.eventBus = this.registry.get('eventBus') as GameEventBus;
		this.score = 0;
		this.lives = PLAYER_MAX_LIVES;
		this.lastFired = 0;
		this.invincible = false;
		this.gameOver = false;
		this.stageClear = false;
		this.bossManager = null;
		this.weaponStats = DEFAULT_WEAPON.levels[WEAPON_LEVEL - 1];
		this.stageIndex = data?.stageIndex ?? 0;
		this.registryListeners = [];
	}

	create(): void {
		const { width, height } = this.scale;

		// Physics world bounds — match expanded canvas
		this.physics.world.setBounds(0, 0, width, height);

		// Audio — read initial volume from registry (set by mountGame from options)
		const volumes = this.registry.get('audioVolumes') as
			| import('../systems/AudioManager').AudioVolumes
			| undefined;
		this.audioManager = new AudioManager(this, volumes);

		// Background — use first level's background key from campaign
		this.setBackground(width, height);

		// Player
		if (this.textures.exists(SHIP.spriteKey)) {
			this.player = this.add.sprite(width / 2, height - 80, SHIP.spriteKey, 1);
		} else {
			const gfx = this.add.graphics();
			gfx.fillStyle(0x00ff88);
			gfx.fillRect(-12, -12, PLAYER_HITBOX.width, PLAYER_HITBOX.height);
			gfx.generateTexture('player-fallback', PLAYER_HITBOX.width, PLAYER_HITBOX.height);
			gfx.destroy();
			this.player = this.add.sprite(width / 2, height - 80, 'player-fallback');
		}
		this.physics.add.existing(this.player);
		const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
		playerBody.setCollideWorldBounds(true);
		playerBody.setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height);

		// Input adapter — select based on settings and device capability
		this.inputAdapter = this.selectInputAdapter();
		this.inputAdapter.create(this);

		// Clear input state on game-level pause (fired by Phaser's VisibilityHandler
		// and by explicit handle.pause() calls). Scene-level 'pause' does NOT fire
		// when game.pause() is called, only when scene.sys.pause() is called.
		this.onGamePause = () => {
			this.inputAdapter.clear();
		};
		this.game.events.on('pause', this.onGamePause);

		// Bullet pools — recycle instead of create/destroy each frame
		// Pool defaults match current weaponStats; if weapon-level-up changes
		// projectile size at runtime, pass config override to acquire()
		this.playerBulletPool = new BulletPool(this, {
			defaultWidth: this.weaponStats.projectileHitbox.width,
			defaultHeight: this.weaponStats.projectileHitbox.height,
			defaultColor: 0x00ffff,
			initialSize: 30,
		});

		this.enemyBulletPool = new BulletPool(this, {
			defaultWidth: 4,
			defaultHeight: 8,
			defaultColor: 0xff4444,
			initialSize: 60, // boss spread-shot + concurrent minions can burst 40+
		});

		// Enemy group (not pooled — low spawn frequency, varied textures)
		this.enemies = this.physics.add.group({
			runChildUpdate: false,
		});

		// Collisions — use pool's underlying physics group for overlap detection
		this.physics.add.overlap(
			this.playerBulletPool.physicsGroup,
			this.enemies,
			this.onBulletHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
			undefined,
			this,
		);
		this.physics.add.overlap(
			this.player,
			this.enemies,
			this.onPlayerHitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
			undefined,
			this,
		);
		this.physics.add.overlap(
			this.player,
			this.enemyBulletPool.physicsGroup,
			this.onEnemyBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
			undefined,
			this,
		);

		// Drop manager — spawns pickups on enemy kill, drifts toward player
		this.dropManager = new DropManager({
			scene: this,
			audioManager: this.audioManager,
		});

		// Player ↔ drop pickup collision
		this.physics.add.overlap(
			this.player,
			this.dropManager.physicsGroup,
			this.onPlayerCollectDrop as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
			undefined,
			this,
		);

		// HUD
		this.hud = new HudManager({ scene: this, initialLives: this.lives });

		// Wave manager — drives gameplay from campaign data
		// Spawning uses safe zone width so wave density stays consistent
		const safeZone = this.registry.get('safeZone') as SafeZone | undefined;
		const spawnWidth = safeZone ? safeZone.width : width;
		const spawnOffset = safeZone ? safeZone.x : 0;

		this.waveManager = new WaveManager({
			scene: this,
			enemies: this.enemies,
			screenWidth: spawnWidth,
			spawnOffsetX: spawnOffset,
			stageIndex: this.stageIndex,
			onEnemySpawned: (enemy, _data) => {
				spawnIn(enemy);
			},
			onWaveCleared: (waveIndex) => {
				this.hud.showBanner(`WAVE ${waveIndex + 2}`);
				this.updateWaveHud();
			},
			onLevelCleared: (levelIndex) => {
				this.hud.showBanner(`LEVEL ${levelIndex + 2} — ${this.waveManager.levelName}`);
				// Switch background for new level
				const { width: w, height: h } = this.scale;
				this.setBackground(w, h);
			},
			onBossEncounter: (bossId) => {
				this.startBossEncounter(bossId);
			},
			onStageClear: () => {
				this.handleStageClear();
			},
		});

		this.updateWaveHud();
		this.hud.showBanner(`${this.waveManager.stageName} — ${this.waveManager.levelName}`);
		this.waveManager.start();

		// Start background music
		const musicKey = this.waveManager.musicKey;
		if (musicKey) this.audioManager.playMusic(musicKey);

		// Debug overlay — toggle with backtick key
		this.debugOverlay = new DebugOverlay({
			scene: this,
			playerBullets: this.playerBulletPool,
			enemyBullets: this.enemyBulletPool,
			enemies: this.enemies,
		});

		// Show debug overlay if showFps was enabled at mount
		const initialShowFps = this.registry.get('showFps') as boolean | undefined;
		if (initialShowFps) this.debugOverlay.setVisible(true);

		// Runtime showFps toggle via registry
		const showFpsListener = (_: unknown, value: boolean) => {
			this.debugOverlay.setVisible(value);
		};
		this.registry.events.on('changedata-showFps', showFpsListener);
		this.registryListeners.push({ event: 'changedata-showFps', fn: showFpsListener });

		// Update physics bounds and spawn parameters on world resize
		const worldWidthListener = (_: unknown, newWidth: number) => {
			const newHeight = this.registry.get('worldHeight') as number;
			this.physics.world.setBounds(0, 0, newWidth, newHeight);
			const newSz = this.registry.get('safeZone') as SafeZone | undefined;
			if (newSz) {
				this.waveManager.updateSpawnBounds(newSz.width, newSz.x);
			}
		};
		this.registry.events.on('changedata-worldWidth', worldWidthListener);
		this.registryListeners.push({ event: 'changedata-worldWidth', fn: worldWidthListener });

		this.eventBus.emit('scene-change', 'game');
	}

	update(time: number): void {
		// Drops keep drifting/expiring even after stage-clear so player can collect them
		this.dropManager.update(time, this.player.x, this.player.y);
		this.debugOverlay.update(time);

		if (this.gameOver) return;

		// Allow movement during stage-clear so player can grab remaining drops
		if (this.stageClear) {
			this.handleMovement();
			return;
		}

		this.handleMovement();
		this.handleFiring(time);
		this.updateEnemies(time);
		this.bossManager?.update(time);
		this.cleanupOffscreen();
	}

	private updateEnemies(time: number): void {
		const { width } = this.scale;
		for (const obj of this.enemies.getChildren()) {
			const enemy = obj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
			updateEnemyMovement(enemy, width, this.player.x);
			updateEnemyAttack(enemy, this.enemyBulletPool, this.player.x, this.player.y, time);
			if (!enemy.getData('isBoss')) updateEnemyAnimation(enemy, time);
		}
	}

	private handleMovement(): void {
		const body = this.player.body as Phaser.Physics.Arcade.Body;
		const intent = this.inputAdapter.update();

		const vx = intent.moveVector.x * PLAYER_SPEED;
		const vy = intent.moveVector.y * PLAYER_SPEED;
		body.setVelocity(vx, vy);

		// Update ship sprite frame for banking visual
		if (this.player instanceof Phaser.GameObjects.Sprite && this.textures.exists(SHIP.spriteKey)) {
			updateShipBanking(this.player);
		}
	}

	private selectInputAdapter(): InputAdapter {
		const controlScheme = this.registry.get('controlScheme') as string | undefined;
		const touchEnabled = this.registry.get('touchControlsEnabled') as boolean | undefined;

		// Explicit keyboard override — user deliberately chose keyboard
		if (controlScheme === 'arrows') {
			return new KeyboardInput();
		}

		// Explicit touch override
		if (controlScheme === 'touch') {
			return new TouchInput();
		}

		// Auto-detect: use touch if device supports it and setting allows
		// Default controlScheme is 'wasd' which still allows auto-detection
		if (touchEnabled !== false) {
			const hasTouch =
				typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
			if (hasTouch) {
				return new TouchInput();
			}
		}

		return new KeyboardInput();
	}

	private handleFiring(time: number): void {
		const cooldownMs = this.weaponStats.cooldown.duration * 1000;
		if (time - this.lastFired < cooldownMs) return;
		this.lastFired = time;

		const { projectileCount, spreadAngle, projectileSpeed } = this.weaponStats;
		const startAngle = -90; // straight up
		const halfSpread = spreadAngle / 2;

		for (let i = 0; i < projectileCount; i++) {
			let angle = startAngle;
			if (projectileCount > 1) {
				angle = startAngle - halfSpread + (spreadAngle * i) / (projectileCount - 1);
			}

			const rad = Phaser.Math.DegToRad(angle);
			const vx = Math.cos(rad) * projectileSpeed;
			const vy = Math.sin(rad) * projectileSpeed;

			const bullet = this.playerBulletPool.acquire(this.player.x, this.player.y - 20, vx, vy);
			bullet.setData('damage', this.weaponStats.damage);
		}

		this.audioManager.playSfx('sfx-laser', 0.3);
	}

	private onBulletHitEnemy(
		bulletObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
		enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
	): void {
		const bullet = bulletObj as Phaser.GameObjects.Rectangle;
		if (!bullet.active) return; // already released this physics step
		const enemy = enemyObj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

		const damage = (bullet.getData('damage') as number) || this.weaponStats.damage;
		this.playerBulletPool.release(bullet);

		this.audioManager.playSfx('sfx-hit', 0.2);

		const health = (enemy.getData('health') as number) - damage;
		enemy.setData('health', health);

		if (health <= 0) {
			const scoreValue = (enemy.getData('scoreValue') as number) || 10;
			this.score += scoreValue;
			this.hud.updateScore(this.score);
			this.eventBus.emit('score', this.score);

			const isBoss = enemy.getData('isBoss') as boolean;
			if (isBoss && this.bossManager) {
				// Boss kill — let BossManager handle death sequence
				this.audioManager.playSfx('sfx-enemy-death', 0.8);
				this.bossManager.onBossHit(health);
			} else {
				// Regular enemy kill
				this.audioManager.playSfx('sfx-enemy-death', 0.4);
				hitStop(this, enemy);
				this.waveManager.onEnemyDestroyed();

				// Roll drops at death location before deathBurst moves/destroys the enemy
				const drops = enemy.getData('drops') as import('@sg/contracts').DropTable | undefined;
				if (drops) {
					this.dropManager.rollDrops(drops, enemy.x, enemy.y, false);
				}

				deathBurst(enemy);
			}
		} else {
			flashOnHit(enemy);
			// Notify boss manager of damage for health bar
			if (enemy.getData('isBoss') && this.bossManager) {
				this.bossManager.onBossHit(health);
			}
		}
	}

	private onPlayerHitEnemy(
		_playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
		enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
	): void {
		if (this.invincible || this.gameOver) return;

		const enemy = enemyObj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

		// Bosses don't die on contact — player takes damage, boss stays
		if (!enemy.getData('isBoss')) {
			enemy.destroy();
			this.waveManager.onEnemyDestroyed();
		}

		this.takeDamage();
	}

	private onEnemyBulletHitPlayer(
		_playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
		bulletObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
	): void {
		const bullet = bulletObj as Phaser.GameObjects.Rectangle;
		if (!bullet.active || this.invincible || this.gameOver) return;

		this.enemyBulletPool.release(bullet);
		this.takeDamage();
	}

	private onPlayerCollectDrop(
		_playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
		dropObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
	): void {
		const pickup = dropObj as Phaser.GameObjects.Rectangle;
		const result = this.dropManager.collectPickup(pickup);
		if (result) {
			this.hud.updateCurrency(this.dropManager.currency);
		}
	}

	private takeDamage(): void {
		this.lives--;
		this.hud.updateLives(this.lives);
		this.audioManager.playSfx('sfx-hit', 0.5);
		screenShake(this, 0.008, 150);

		if (this.lives <= 0) {
			this.triggerGameOver();
			return;
		}

		this.invincible = true;
		this.tweens.add({
			targets: this.player,
			alpha: 0.3,
			duration: 100,
			yoyo: true,
			repeat: Math.floor(INVINCIBLE_DURATION / 200),
			onComplete: () => {
				this.invincible = false;
				this.player.setAlpha(1);
			},
		});
	}

	private triggerGameOver(): void {
		this.gameOver = true;
		this.waveManager.stop();
		this.bossManager?.stop();
		this.playerBulletPool.releaseAll();
		this.enemyBulletPool.releaseAll();
		this.dropManager.releaseAll();
		this.audioManager.playSfx('sfx-player-death', 0.6);
		this.audioManager.stopMusic();
		this.player.setAlpha(0.3);

		this.eventBus.emit('death');
		this.hud.showGameOver(this.score, this.dropManager.currency, () => this.returnToMenu());
	}

	private startBossEncounter(bossId: string): void {
		const { width, height } = this.scale;
		const sz = this.registry.get('safeZone') as SafeZone | undefined;

		this.hud.setWaveTextBoss();

		this.bossManager = new BossManager({
			scene: this,
			bossId,
			enemies: this.enemies,
			screenWidth: width,
			screenHeight: height,
			safeZone: sz,
			onBossDefeated: () => {
				// Boss drops — guaranteed per content data
				const bossObj = this.bossManager?.bossGameObject;
				if (bossObj) {
					const drops = bossObj.getData('drops') as import('@sg/contracts').DropTable | undefined;
					const guaranteed = (bossObj.getData('guaranteedDropOnDeath') as boolean) ?? false;
					if (drops) {
						this.dropManager.rollDrops(drops, bossObj.x, bossObj.y, guaranteed);
					}
				}

				// Final death burst on boss sprite
				if (bossObj?.active) {
					deathBurst(bossObj);
				}

				// Destroy remaining minions (skip already-dying ones)
				for (const obj of this.enemies.getChildren()) {
					const e = obj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
					if (e.active && !e.getData('isBoss')) {
						deathBurst(e);
					}
				}

				// Brief delay then stage clear
				this.time.delayedCall(1000, () => {
					this.handleStageClear();
				});
			},
			onMinionSpawned: (enemy, _data) => {
				spawnIn(enemy);
			},
		});

		this.bossManager.start();
	}

	private handleStageClear(): void {
		this.stageClear = true;
		this.playerBulletPool.releaseAll();
		this.enemyBulletPool.releaseAll();
		// Don't releaseAll drops on stage clear — let player collect remaining pickups
		this.audioManager.stopMusic();
		this.audioManager.playSfx('sfx-stage-clear', 0.6);

		// Award stage clear reward
		const reward = this.waveManager.clearReward;
		this.dropManager.addCurrency(reward);
		this.hud.updateCurrency(this.dropManager.currency);

		this.eventBus.emit('stage-clear', this.stageIndex, this.score, this.dropManager.currency);

		const hasNext = this.waveManager.hasNextStage;
		const onContinue = hasNext ? () => this.startNextStage() : () => this.returnToMenu();

		this.hud.showStageClear(this.score, this.dropManager.currency, reward, hasNext, onContinue);
	}

	private startNextStage(): void {
		this.cleanupScene();
		this.scene.restart({ stageIndex: this.stageIndex + 1 });
	}

	private returnToMenu(): void {
		this.cleanupScene();
		this.scene.start(SCENE_KEYS.Menu);
	}

	private cleanupScene(): void {
		this.inputAdapter.destroy();
		this.debugOverlay.destroy();
		this.hud.destroy();
		this.playerBulletPool.destroy();
		this.enemyBulletPool.destroy();
		this.dropManager.destroy();
		this.audioManager.destroy();
		if (this.onGamePause) {
			this.game.events.off('pause', this.onGamePause);
			this.onGamePause = null;
		}
		for (const { event, fn } of this.registryListeners) {
			this.registry.events.off(event, fn);
		}
		this.registryListeners.length = 0;
	}

	private bgImage: Phaser.GameObjects.Image | null = null;

	private setBackground(width: number, height: number): void {
		const bgKey = this.waveManager?.currentLevel?.backgroundKey ?? 'bg-starfield-sparse';
		if (this.textures.exists(bgKey)) {
			if (this.bgImage) {
				this.bgImage.setTexture(bgKey);
			} else {
				this.bgImage = this.add.image(width / 2, height / 2, bgKey);
				this.bgImage.setDisplaySize(width, height);
				this.bgImage.setDepth(-1);
			}
		} else {
			this.cameras.main.setBackgroundColor('#0a0a1a');
		}
	}

	private cleanupOffscreen(): void {
		const { width, height } = this.scale;

		for (const obj of this.playerBulletPool.physicsGroup.getChildren()) {
			if (!obj.active) continue;
			const b = obj as Phaser.GameObjects.Rectangle;
			if (b.y < -20 || b.y > height + 20 || b.x < -20 || b.x > width + 20) {
				this.playerBulletPool.release(b);
			}
		}

		// Enemy bullets that leave the screen
		for (const obj of this.enemyBulletPool.physicsGroup.getChildren()) {
			if (!obj.active) continue;
			const b = obj as Phaser.GameObjects.Rectangle;
			if (b.y > height + 20 || b.y < -20 || b.x < -20 || b.x > width + 20) {
				this.enemyBulletPool.release(b);
			}
		}

		// Enemies that pass the bottom of the screen — penalty!
		for (const enemy of this.enemies.getChildren()) {
			const e = enemy as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
			if (e.getData('isBoss')) continue; // Boss managed by BossManager
			if (e.y > height + 20) {
				enemy.destroy();
				this.waveManager.onEnemyDestroyed();
				this.takeDamage();
				if (this.gameOver) return;
			}
		}
	}

	private updateWaveHud(): void {
		this.hud.updateWave(
			this.waveManager.levelNumber,
			this.waveManager.totalLevels,
			this.waveManager.waveNumber,
			this.waveManager.totalWavesInLevel,
		);
	}
}
