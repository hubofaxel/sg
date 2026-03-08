import { starterShips } from '@sg/content';
import Phaser from 'phaser';
import type { GameEventBus } from '../events';
import { WaveManager } from '../systems/WaveManager';
import { SCENE_KEYS } from './index';

// Player constants from content data
const SHIP = starterShips[0];
const PLAYER_SPEED = SHIP.baseStats.speed;
const PLAYER_HITBOX = SHIP.baseStats.hitbox;
const PLAYER_MAX_LIVES = SHIP.baseStats.maxLives;

// Weapon constants (level 1 basic laser from content)
const BULLET_SPEED = 600;
const FIRE_RATE = 250; // ms
const BULLET_DAMAGE = 10;

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
	private bullets!: Phaser.Physics.Arcade.Group;
	private enemies!: Phaser.Physics.Arcade.Group;
	private score = 0;
	private lives = PLAYER_MAX_LIVES;
	private lastFired = 0;
	private invincible = false;
	private scoreText!: Phaser.GameObjects.Text;
	private livesText!: Phaser.GameObjects.Text;
	private waveText!: Phaser.GameObjects.Text;
	private gameOver = false;
	private waveManager!: WaveManager;
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
	}

	create(): void {
		const { width, height } = this.scale;

		// Background
		if (this.textures.exists('bg-starfield-sparse')) {
			const bg = this.add.image(width / 2, height / 2, 'bg-starfield-sparse');
			bg.setDisplaySize(width, height);
		} else {
			this.cameras.main.setBackgroundColor('#0a0a1a');
		}

		// Player
		if (this.textures.exists(SHIP.spriteKey)) {
			this.player = this.add.sprite(width / 2, height - 80, SHIP.spriteKey, 0);
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

		// Bullet group
		this.bullets = this.physics.add.group({
			classType: Phaser.GameObjects.Rectangle,
			runChildUpdate: false,
			maxSize: 50,
		});

		// Enemy group
		this.enemies = this.physics.add.group({
			runChildUpdate: false,
		});

		// Collisions
		this.physics.add.overlap(
			this.bullets,
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
		this.waveText = this.add
			.text(width / 2, 10, '', {
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
			onEnemySpawned: () => {},
			onWaveCleared: (waveIndex) => {
				this.showWaveBanner(`WAVE ${waveIndex + 2}`);
				this.updateWaveHud();
			},
			onLevelCleared: (levelIndex) => {
				this.showWaveBanner(`LEVEL ${levelIndex + 2} — ${this.waveManager.levelName}`);
			},
			onStageClear: () => {
				this.handleStageClear();
			},
		});

		this.updateWaveHud();
		this.showWaveBanner(`${this.waveManager.stageName} — ${this.waveManager.levelName}`);
		this.waveManager.start();

		this.eventBus.emit('scene-change', 'game');
	}

	update(time: number): void {
		if (this.gameOver || this.stageClear) return;

		this.handleMovement();
		this.handleFiring(time);
		this.cleanupOffscreen();
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
	}

	private handleFiring(time: number): void {
		if (time - this.lastFired < FIRE_RATE) return;
		this.lastFired = time;

		const bullet = this.add.rectangle(this.player.x, this.player.y - 20, 4, 12, 0x00ffff);
		this.physics.add.existing(bullet);
		this.bullets.add(bullet);
		const bulletBody = bullet.body as Phaser.Physics.Arcade.Body;
		bulletBody.setVelocityY(-BULLET_SPEED);
		bulletBody.setSize(4, 12);
	}

	private onBulletHitEnemy(
		bulletObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
		enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
	): void {
		const bullet = bulletObj as Phaser.GameObjects.Rectangle;
		const enemy = enemyObj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;

		bullet.destroy();

		const health = (enemy.getData('health') as number) - BULLET_DAMAGE;
		enemy.setData('health', health);

		if (health <= 0) {
			const scoreValue = (enemy.getData('scoreValue') as number) || 10;
			this.score += scoreValue;
			this.scoreText.setText(`SCORE: ${this.score}`);
			this.eventBus.emit('score', this.score);
			enemy.destroy();
			this.waveManager.onEnemyDestroyed();
		}
	}

	private onPlayerHitEnemy(
		_playerObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
		enemyObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
	): void {
		if (this.invincible || this.gameOver) return;

		const enemy = enemyObj as Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle;
		enemy.destroy();
		this.waveManager.onEnemyDestroyed();

		this.takeDamage();
	}

	private takeDamage(): void {
		this.lives--;
		this.livesText.setText(`LIVES: ${this.lives}`);

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

	private handleStageClear(): void {
		this.stageClear = true;
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
		this.scene.start(SCENE_KEYS.Menu);
	}

	private cleanupOffscreen(): void {
		const { height } = this.scale;

		for (const bullet of this.bullets.getChildren()) {
			if ((bullet as Phaser.GameObjects.Rectangle).y < -20) {
				bullet.destroy();
			}
		}

		// Enemies that pass the bottom of the screen — penalty!
		for (const enemy of this.enemies.getChildren()) {
			if ((enemy as Phaser.GameObjects.Sprite).y > height + 20) {
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
