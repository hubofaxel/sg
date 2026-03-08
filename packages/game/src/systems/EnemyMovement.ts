import type * as Phaser from 'phaser';

/**
 * EnemyMovement — applies movement patterns to enemies each frame.
 * Called from GameScene.update() for each active enemy.
 */

/** Apply the movement pattern for one enemy per-frame */
export function updateEnemyMovement(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	screenWidth: number,
	playerX: number,
): void {
	const body = enemy.body as Phaser.Physics.Arcade.Body;
	if (!body) return;

	const pattern = enemy.getData('movementPattern') as string;
	const baseSpeed = (enemy.getData('speed') as number) || 100;
	const spawnTime = (enemy.getData('spawnTime') as number) || 0;
	const elapsed = (enemy.scene.time.now - spawnTime) / 1000;

	switch (pattern) {
		case 'sine-wave': {
			const amplitude = screenWidth * 0.15;
			const frequency = 2;
			body.setVelocityX(Math.cos(elapsed * frequency * Math.PI) * amplitude);
			body.setVelocityY(baseSpeed);
			break;
		}

		case 'zigzag': {
			const period = 1.5;
			const phase = (elapsed % period) / period;
			const direction = phase < 0.5 ? 1 : -1;
			body.setVelocityX(direction * baseSpeed * 0.8);
			body.setVelocityY(baseSpeed * 0.6);
			break;
		}

		case 'spiral': {
			// Spiral toward player X, descending
			const dx = playerX - enemy.x;
			const homingX = Math.sign(dx) * Math.min(Math.abs(dx), baseSpeed * 0.6);
			const wobble = Math.sin(elapsed * 6) * baseSpeed * 0.3;
			body.setVelocityX(homingX + wobble);
			body.setVelocityY(baseSpeed);
			break;
		}

		case 'strafe-hover': {
			// Descend to a hover line, then strafe horizontally
			const hoverY = 120;
			if (enemy.y < hoverY) {
				body.setVelocityY(baseSpeed);
				body.setVelocityX(0);
			} else {
				body.setVelocityY(baseSpeed * 0.1);
				const strafeSpeed = baseSpeed * 0.5;
				const strafeDir = Math.sin(elapsed * 1.5) > 0 ? 1 : -1;
				body.setVelocityX(strafeDir * strafeSpeed);

				// Bounce off edges
				if (enemy.x < 40) body.setVelocityX(Math.abs(body.velocity.x));
				if (enemy.x > screenWidth - 40) body.setVelocityX(-Math.abs(body.velocity.x));
			}
			break;
		}

		default: {
			body.setVelocityY(baseSpeed);
			body.setVelocityX(0);
			break;
		}
	}
}
