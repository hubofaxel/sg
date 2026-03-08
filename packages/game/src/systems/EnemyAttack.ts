import type Phaser from 'phaser';

/**
 * EnemyAttack — handles enemy ranged attacks each frame.
 * Reads attackType, fireInterval, projectileDamage from enemy data.
 */

export function updateEnemyAttack(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	enemyBullets: Phaser.Physics.Arcade.Group,
	playerX: number,
	playerY: number,
	time: number,
): void {
	const attackType = enemy.getData('attackType') as string;
	if (!attackType || attackType === 'contact-only' || attackType === 'ram') return;

	const fireInterval = (enemy.getData('fireInterval') as number) || 2.0;
	const lastFired = (enemy.getData('lastFired') as number) || 0;
	const fireIntervalMs = fireInterval * 1000;

	if (time - lastFired < fireIntervalMs) return;
	enemy.setData('lastFired', time);

	const damage = (enemy.getData('projectileDamage') as number) || 5;

	switch (attackType) {
		case 'aimed-shot':
			fireAimed(enemy, enemyBullets, playerX, playerY, damage);
			break;
		case 'spread-shot':
			fireSpread(enemy, enemyBullets, damage);
			break;
		default:
			break;
	}
}

function fireAimed(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	group: Phaser.Physics.Arcade.Group,
	playerX: number,
	playerY: number,
	damage: number,
): void {
	const scene = enemy.scene;
	const speed = 200;

	const dx = playerX - enemy.x;
	const dy = playerY - enemy.y;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len === 0) return;

	const vx = (dx / len) * speed;
	const vy = (dy / len) * speed;

	spawnBullet(scene, group, enemy.x, enemy.y + 10, vx, vy, damage);
}

function fireSpread(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	group: Phaser.Physics.Arcade.Group,
	damage: number,
): void {
	const scene = enemy.scene;
	const speed = 180;
	const angles = [-20, 0, 20]; // degrees offset from straight down

	for (const offset of angles) {
		const rad = ((90 + offset) * Math.PI) / 180;
		const vx = Math.cos(rad) * speed;
		const vy = Math.sin(rad) * speed;
		spawnBullet(scene, group, enemy.x, enemy.y + 10, vx, vy, damage * 0.6);
	}
}

function spawnBullet(
	scene: Phaser.Scene,
	group: Phaser.Physics.Arcade.Group,
	x: number,
	y: number,
	vx: number,
	vy: number,
	damage: number,
): void {
	const bullet = scene.add.rectangle(x, y, 4, 8, 0xff4444);
	scene.physics.add.existing(bullet);
	group.add(bullet);
	const body = bullet.body as Phaser.Physics.Arcade.Body;
	body.setVelocity(vx, vy);
	body.setSize(4, 8);
	bullet.setData('damage', damage);
}
