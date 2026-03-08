import type Phaser from 'phaser';

/**
 * CombatFeedback — visual juice for hits, deaths, and spawns.
 * All durations are in milliseconds.
 */

/** Flash an enemy white on hit, then restore original tint */
export function flashOnHit(
	target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	durationMs = 80,
): void {
	const scene = target.scene;
	if (!scene) return;

	if ('setTint' in target) {
		(target as Phaser.GameObjects.Sprite).setTint(0xffffff);
		scene.time.delayedCall(durationMs, () => {
			if (!target.active) return;
			(target as Phaser.GameObjects.Sprite).clearTint();
		});
	} else {
		const orig = target.alpha;
		target.setAlpha(1);
		scene.time.delayedCall(durationMs, () => {
			if (!target.active) return;
			target.setAlpha(orig);
		});
	}
}

/** Shake the camera briefly */
export function screenShake(scene: Phaser.Scene, intensity = 0.005, durationMs = 100): void {
	scene.cameras.main.shake(durationMs, intensity);
}

/** Brief hit-stop: pause physics for a few frames */
export function hitStop(scene: Phaser.Scene, durationMs = 50): void {
	if (durationMs <= 0) return;
	scene.physics.pause();
	scene.time.delayedCall(durationMs, () => {
		scene.physics.resume();
	});
}

/** Enemy death burst: quick scale-up + fade-out, then destroy */
export function deathBurst(
	target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
): void {
	const scene = target.scene;
	if (!scene) {
		target.destroy();
		return;
	}

	// Detach from physics so it doesn't collide during the effect
	const body = target.body as Phaser.Physics.Arcade.Body | null;
	if (body) body.enable = false;

	scene.tweens.add({
		targets: target,
		scaleX: 1.5,
		scaleY: 1.5,
		alpha: 0,
		duration: 150,
		ease: 'Power2',
		onComplete: () => {
			target.destroy();
		},
	});
}

/** Spawn-in: enemies fade and scale in instead of popping */
export function spawnIn(
	target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
	durationMs = 200,
): void {
	const scene = target.scene;
	if (!scene) return;

	target.setAlpha(0);
	target.setScale(0.3);

	scene.tweens.add({
		targets: target,
		alpha: 1,
		scaleX: 1,
		scaleY: 1,
		duration: durationMs,
		ease: 'Back.easeOut',
	});
}
