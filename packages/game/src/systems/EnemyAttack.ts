import type * as Phaser from 'phaser';
import type { BulletPool } from './ObjectPool';

/**
 * EnemyAttack — handles enemy ranged attacks each frame.
 * Reads attackType, fireInterval, projectileDamage from enemy data.
 * Uses BulletPool for projectile recycling instead of create/destroy.
 */

export function updateEnemyAttack(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	bulletPool: BulletPool,
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
			fireAimed(enemy, bulletPool, playerX, playerY, damage);
			break;
		case 'spread-shot':
			fireSpread(enemy, bulletPool, damage);
			break;
		default:
			break;
	}
}

function fireAimed(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	pool: BulletPool,
	playerX: number,
	playerY: number,
	damage: number,
): void {
	const speed = 200;

	const dx = playerX - enemy.x;
	const dy = playerY - enemy.y;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len === 0) return;

	const vx = (dx / len) * speed;
	const vy = (dy / len) * speed;

	spawnBullet(pool, enemy.x, enemy.y + 10, vx, vy, damage);
}

function fireSpread(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	pool: BulletPool,
	damage: number,
): void {
	const speed = 180;
	const angles = [-20, 0, 20]; // degrees offset from straight down

	for (const offset of angles) {
		const rad = ((90 + offset) * Math.PI) / 180;
		const vx = Math.cos(rad) * speed;
		const vy = Math.sin(rad) * speed;
		spawnBullet(pool, enemy.x, enemy.y + 10, vx, vy, damage * 0.6);
	}
}

function spawnBullet(
	pool: BulletPool,
	x: number,
	y: number,
	vx: number,
	vy: number,
	damage: number,
): void {
	const bullet = pool.acquire(x, y, vx, vy);
	bullet.setData('damage', damage);
}
