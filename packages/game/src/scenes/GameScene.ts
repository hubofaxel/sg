import { primaryWeapons, starterShips } from '@sg/content';
import type { WeaponLevelStats } from '@sg/contracts';
import Phaser from 'phaser';
import type { GameEventBus } from '../events';
import { AudioManager } from '../systems/AudioManager';
import { BossManager } from '../systems/BossManager';
import { deathBurst, flashOnHit, hitStop, screenShake, spawnIn } from '../systems/CombatFeedback';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DropManager } from '../systems/DropManager';
import { updateEnemyAttack } from '../systems/EnemyAttack';
import { updateEnemyMovement } from '../systems/EnemyMovement';
import { BulletPool } from '../systems/ObjectPool';
import { updateEnemyAnimation, updateShipBanking } from '../systems/SpriteFrames';
import { WaveManager } from '../systems/WaveManager';
import { SCENE_KEYS } from './index';

// Player constants from content data
const SHIP = starterShips[0];
const PLAYER_SPEED = SHIP.baseStats.speed;
const PLAYER_HITBOX = SHIP.baseStats.hitbox;
const PLAYER_MAX_LIVES = SHIP.baseStats.maxLives;

// Weapon — read level 1 stats from content
const DEFAULT_WEAPON = primaryWeapons.find((w) => w.type === SHIP.baseStats.defaultWeaponType)!;
const WEAPON_LEVEL = 1;

const INVINCIBLE_DURATION = 1500; // ms after taking a hit

export class GameScene extends Phaser.Scene {
	private eventBus!: GameEventBus;
	private player!: Phaser.GameObjects.Sprite;
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private wasd!: {
		W: Phaser.Input.Keyboard.Key;
		A: Phaser.Input.Keyboard.Key;
		S: Phaser.Input.Keyboard.Key;
		D: Phaser.Input.Keyboard.Key;
	};
	private playerBulletPool!: BulletPool;
	private enemyBulletPool!: BulletPool;
	private enemies!: Phaser.Physics.Arcade.Group;
	private debugOverlay!: DebugOverlay;
	private dropManager!: DropManager;
	private score = 0;
	private lives = PLAYER_MAX_LIVES;
	private lastFired = 0;
	private invincible = false;
	private scoreText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private currencyText!: Phaser.GameObjects.Text;
	private waveText!: Phaser.GameObjects.Text;
	private gameOver = false;
	private waveManager!: WaveManager;
	private bossManager: BossManager | null = null;
	private audioManager!: AudioManager;
	private weaponStats!: WeaponLevelStats;
	private stageClear = false;

	constructor() {
		super({ key: SCENE_KEYS.Game });
	}

	init(): void {
		this.eventBus = this.registry.get('eventBus') as GameEventBus;
		this.score = 0;
		this.lives = PLAYER_MAX_LIVES;
		this.lastFired = 0;
		this.invincible = false;
		this.gameOver = false;
		this.stageClear = false;
		this.bossManager = null;
		this.weaponStats = DEFAULT_WEAPON.levels[WEAPON_LEVEL - 1];
	}

	create(): void {
		const { width, height } = this.scale;

		// Audio
		this.audioManager = new AudioManager(this);

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

		// Input
		this.cursors = this.input.keyboard!.createCursorKeys();
		this.wasd = {
			W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
			A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
			S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
			D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
		};

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
		this.scoreText = this.add.text(10, 10, 'SCORE: 0', {
			fontSize: '16px',
			fontFamily: 'monospace',
			color: '#ffffff',
		});
		this.livesText = this.add.text(10, 30, `LIVES: ${this.lives}`, {
			fontSize: '16px',
			fontFamily: 'monospace',
			color: '#ff6666',
		});
		this.currencyText = this.add.text(10, 50, 'CREDITS: 0', {
			fontSize: '16px',
			fontFamily: 'monospace',
			color: '#ffdd00',
		});
		this.waveText = this.add
			.text(width / 2, 12, '', {
				fontSize: '14px',
				fontFamily: 'monospace',
				color: '#888888',
			})
			.setOrigin(0.5, 0);

		// Wave manager — drives gameplay from campaign data
		this.waveManager = new WaveManager({
			scene: this,
			enemies: this.enemies,
			screenWidth: width,
			onEnemySpawned: (enemy, _data) => {
				spawnIn(enemy);
			},
			onWaveCleared: (waveIndex) => {
				this.showWaveBanner(`WAVE ${waveIndex + 2}`);
				this.updateWaveHud();
			},
			onLevelCleared: (levelIndex) => {
				this.showWaveBanner(`LEVEL ${levelIndex + 2} — ${this.waveManager.levelName}`);
				// Switch background for new level
				this.setBackground(width, height);
			},
			onBossEncounter: (bossId) => {
				this.startBossEncounter(bossId);
			},
			onStageClear: () => {
				this.handleStageClear();
			},
		});

		this.updateWaveHud();
		this.showWaveBanner(`${this.waveManager.stageName} — ${this.waveManager.levelName}`);
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
		body.setVelocity(0);

		const left = this.cursors.left.isDown || this.wasd.A.isDown;
		const right = this.cursors.right.isDown || this.wasd.D.isDown;
		const up = this.cursors.up.isDown || this.wasd.W.isDown;
		const down = this.cursors.down.isDown || this.wasd.S.isDown;

		if (left) body.setVelocityX(-PLAYER_SPEED);
		else if (right) body.setVelocityX(PLAYER_SPEED);

		if (up) body.setVelocityY(-PLAYER_SPEED);
		else if (down) body.setVelocityY(PLAYER_SPEED);

		if ((left || right) && (up || down)) {
			body.velocity.normalize().scale(PLAYER_SPEED);
		}

		// Update ship sprite frame for banking visual
		if (this.player instanceof Phaser.GameObjects.Sprite && this.textures.exists(SHIP.spriteKey)) {
			updateShipBanking(this.player);
		}
	}

	private handleFiring(time: number): void {
		const cooldownMs = this.weaponStats.cooldown.duration * 1000;
		if (time - this.lastFired < cooldownMs) return;
		this.lastFired = time;

		const { projectileCount, spreadAngle, projectileSpeed, projectileHitbox } = this.weaponStats;
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
			this.scoreText.setText(`SCORE: ${this.score}`);
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
			this.currencyText.setText(`CREDITS: ${this.dropManager.currency}`);
		}
	}

	private takeDamage(): void {
		this.lives--;
		this.livesText.setText(`LIVES: ${this.lives}`);
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

		const { width, height } = this.scale;

		this.add
			.text(width / 2, height * 0.35, 'GAME OVER', {
				fontSize: '40px',
				fontFamily: 'monospace',
				color: '#ff4444',
			})
			.setOrigin(0.5);

		this.add
			.text(width / 2, height * 0.45, `SCORE: ${this.score}`, {
				fontSize: '24px',
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		this.add
			.text(width / 2, height * 0.52, `CREDITS: ${this.dropManager.currency}`, {
				fontSize: '18px',
				fontFamily: 'monospace',
				color: '#ffdd00',
			})
			.setOrigin(0.5);

		const restart = this.add
			.text(width / 2, height * 0.6, 'PRESS SPACE OR CLICK TO RESTART', {
				fontSize: '16px',
				fontFamily: 'monospace',
				color: '#aaaaaa',
			})
			.setOrigin(0.5);

		this.tweens.add({
			targets: restart,
			alpha: 0.3,
			duration: 800,
			yoyo: true,
			repeat: -1,
		});

		this.eventBus.emit('death');

		this.time.delayedCall(500, () => {
			this.input.keyboard?.once('keydown-SPACE', () => this.returnToMenu());
			this.input.once('pointerdown', () => this.returnToMenu());
		});
	}

	private startBossEncounter(bossId: string): void {
		const { width, height } = this.scale;

		this.waveText.setText('BOSS');

		this.bossManager = new BossManager({
			scene: this,
			bossId,
			enemies: this.enemies,
			screenWidth: width,
			screenHeight: height,
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
		const { width, height } = this.scale;

		this.add
			.text(width / 2, height * 0.3, 'STAGE CLEAR!', {
				fontSize: '40px',
				fontFamily: 'monospace',
				color: '#00ff88',
			})
			.setOrigin(0.5);

		this.add
			.text(width / 2, height * 0.42, `SCORE: ${this.score}`, {
				fontSize: '24px',
				fontFamily: 'monospace',
				color: '#ffffff',
			})
			.setOrigin(0.5);

		this.add
			.text(width / 2, height * 0.5, `CREDITS: ${this.dropManager.currency}`, {
				fontSize: '18px',
				fontFamily: 'monospace',
				color: '#ffdd00',
			})
			.setOrigin(0.5);

		const cont = this.add
			.text(width / 2, height * 0.6, 'PRESS SPACE OR CLICK TO CONTINUE', {
				fontSize: '16px',
				fontFamily: 'monospace',
				color: '#aaaaaa',
			})
			.setOrigin(0.5);

		this.tweens.add({
			targets: cont,
			alpha: 0.3,
			duration: 800,
			yoyo: true,
			repeat: -1,
		});

		this.time.delayedCall(500, () => {
			this.input.keyboard?.once('keydown-SPACE', () => this.returnToMenu());
			this.input.once('pointerdown', () => this.returnToMenu());
		});
	}

	private returnToMenu(): void {
		this.debugOverlay.destroy();
		this.playerBulletPool.destroy();
		this.enemyBulletPool.destroy();
		this.dropManager.destroy();
		this.audioManager.destroy();
		this.scene.start(SCENE_KEYS.Menu);
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
		this.waveText.setText(
			`LVL ${this.waveManager.levelNumber}/${this.waveManager.totalLevels}  WAVE ${this.waveManager.waveNumber}/${this.waveManager.totalWavesInLevel}`,
		);
	}

	private showWaveBanner(text: string): void {
		const { width, height } = this.scale;
		const banner = this.add
			.text(width / 2, height * 0.2, text, {
				fontSize: '22px',
				fontFamily: 'monospace',
				color: '#ffcc00',
			})
			.setOrigin(0.5)
			.setAlpha(0);

		this.tweens.add({
			targets: banner,
			alpha: 1,
			duration: 300,
			hold: 1500,
			yoyo: true,
			onComplete: () => banner.destroy(),
		});
	}
}
