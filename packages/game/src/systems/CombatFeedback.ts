import type { CombatFeedback } from '@sg/contracts';
import type Phaser from 'phaser';

/**
 * CombatFeedback — visual juice for hits, deaths, and spawns.
 *
 * Each function reads data-driven durations from the target's `combatFeedback`
 * data key (set by WaveManager from enemy content). Falls back to schema
 * defaults when the key is absent.
 */

// Schema defaults — must match CombatFeedbackSchema defaults in contracts
const DEFAULTS: CombatFeedback = {
	hitFlashMs: 80,
	hitPauseMs: 30,
	screenShake: 0,
	screenShakeMs: 100,
	deathBurstMs: 150,
	spawnInMs: 200,
};

/** Read combatFeedback from a game object's data store, falling back to defaults */
function getFeedback(
	target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
): CombatFeedback {
	const data = target.getData('combatFeedback') as Partial<CombatFeedback> | undefined;
	if (!data) return DEFAULTS;
	return { ...DEFAULTS, ...data };
}

/** Flash an enemy white on hit, then restore original tint */
export function flashOnHit(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle): void {
	const scene = target.scene;
	if (!scene) return;

	const { hitFlashMs } = getFeedback(target);
	if (hitFlashMs <= 0) return;

	if ('setTint' in target) {
		(target as Phaser.GameObjects.Sprite).setTint(0xffffff);
		scene.time.delayedCall(hitFlashMs, () => {
			if (!target.active) return;
			(target as Phaser.GameObjects.Sprite).clearTint();
		});
	} else {
		const orig = target.alpha;
		target.setAlpha(1);
		scene.time.delayedCall(hitFlashMs, () => {
			if (!target.active) return;
			target.setAlpha(orig);
		});
	}
}

/** Shake the camera briefly — uses target's feedback data for intensity */
export function screenShake(scene: Phaser.Scene, intensity = 0.005, durationMs = 100): void {
	if (intensity <= 0 || durationMs <= 0) return;
	scene.cameras.main.shake(durationMs, intensity);
}

/** Brief hit-stop: pause physics for a few frames */
export function hitStop(
	scene: Phaser.Scene,
	target?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle,
): void {
	const durationMs = target ? getFeedback(target).hitPauseMs : DEFAULTS.hitPauseMs;
	if (durationMs <= 0) return;
	scene.physics.pause();
	scene.time.delayedCall(durationMs, () => {
		scene.physics.resume();
	});
}

/** Enemy death burst: quick scale-up + fade-out, then destroy */
export function deathBurst(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle): void {
	const scene = target.scene;
	if (!scene) {
		target.destroy();
		return;
	}

	const { deathBurstMs } = getFeedback(target);
	if (deathBurstMs <= 0) {
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
		duration: deathBurstMs,
		ease: 'Power2',
		onComplete: () => {
			target.destroy();
		},
	});
}

/** Spawn-in: enemies fade and scale in instead of popping */
export function spawnIn(target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle): void {
	const scene = target.scene;
	if (!scene) return;

	const { spawnInMs } = getFeedback(target);
	if (spawnInMs <= 0) return;

	target.setAlpha(0);
	target.setScale(0.3);

	scene.tweens.add({
		targets: target,
		alpha: 1,
		scaleX: 1,
		scaleY: 1,
		duration: spawnInMs,
		ease: 'Back.easeOut',
	});
}
