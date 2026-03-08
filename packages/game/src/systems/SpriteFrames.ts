import * as Phaser from 'phaser';

/**
 * SpriteFrames — manages sprite frame switching for ships, enemies, and bosses.
 *
 * Three concerns:
 * 1. Ship banking — frame based on horizontal velocity
 * 2. Enemy idle animation — 2-frame oscillation
 * 3. Boss phase frame — set explicitly on phase transition
 */

// ---------------------------------------------------------------------------
// Ship banking (3 frames: bank-left=0, neutral=1, bank-right=2)
// ---------------------------------------------------------------------------

const BANK_DEADZONE = 20; // px/s velocity threshold before banking activates

/** Update player ship sprite frame based on horizontal velocity. */
export function updateShipBanking(ship: Phaser.GameObjects.Sprite): void {
	const body = ship.body as Phaser.Physics.Arcade.Body;
	if (!body) return;

	const vx = body.velocity.x;

	if (vx < -BANK_DEADZONE) {
		ship.setFrame(0); // bank-left
	} else if (vx > BANK_DEADZONE) {
		ship.setFrame(2); // bank-right
	} else {
		ship.setFrame(1); // neutral
	}
}

// ---------------------------------------------------------------------------
// Enemy idle animation (2-frame oscillation)
// ---------------------------------------------------------------------------

const ENEMY_FRAME_INTERVAL_MS = 500;

/** Animate enemy sprite between frame 0 and 1 on a timer. */
export function updateEnemyAnimation(
	enemy: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	time: number,
): void {
	if (!(enemy instanceof Phaser.GameObjects.Sprite)) return;

	// Only animate sprites with 2+ frames
	const texture = enemy.texture;
	if (!texture || texture.frameTotal <= 2) return; // frameTotal includes __BASE, so 2 means 1 real frame

	const spawnTime = (enemy.getData('spawnTime') as number) || 0;
	const elapsed = time - spawnTime;
	const frame = Math.floor(elapsed / ENEMY_FRAME_INTERVAL_MS) % 2;
	enemy.setFrame(frame);
}

// ---------------------------------------------------------------------------
// Boss phase frame (set explicitly from phase data)
// ---------------------------------------------------------------------------

/** Set boss sprite frame from phase data. Only applies to Sprite game objects. */
export function applyBossPhaseFrame(
	boss: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	spriteFrame: number | undefined,
): void {
	if (spriteFrame == null) return;
	if (!(boss instanceof Phaser.GameObjects.Sprite)) return;
	boss.setFrame(spriteFrame);
}
