import type { DropEntry, DropTable } from '@sg/contracts';
import * as Phaser from 'phaser';
import type { AudioManager } from './AudioManager';

/**
 * DropManager — rolls drops from enemy loot tables, spawns pickup objects,
 * manages pity timer, and drifts pickups toward the player.
 *
 * Drop pickups are code-drawn (16x16, under the 32px AI-gen threshold).
 * Currency = gold circle, upgrade-token = cyan diamond, weapon-recipe = green star.
 *
 * Pity timer: tracks kills-since-last-drop. When the bucket fills, the next
 * kill forces the highest-chance drop to fire regardless of RNG.
 */

const PICKUP_SIZE = 16;
const DRIFT_SPEED = 120; // px/sec toward player
const MAGNET_RADIUS = 80; // px — pickups within this range accelerate toward player
const MAGNET_SPEED = 300; // px/sec when magnetized
const PICKUP_LIFETIME_MS = 8000; // pickups expire after 8s
const PITY_THRESHOLD = 10; // kills without any drop before pity fires
const INITIAL_POOL_SIZE = 20;

// Colors for each drop type
const DROP_COLORS: Record<string, number> = {
	currency: 0xffdd00,
	'upgrade-token': 0x00ddff,
	'weapon-recipe': 0x44ff44,
};

export interface DropManagerConfig {
	scene: Phaser.Scene;
	audioManager: AudioManager;
}

export interface DropPickupStats {
	active: number;
	created: number;
	highWater: number;
	totalCollected: number;
}

export class DropManager {
	private scene: Phaser.Scene;
	private audioManager: AudioManager;
	private group: Phaser.Physics.Arcade.Group;
	private created = 0;
	private highWater = 0;
	private pityBucket = 0;
	private totalCollected = 0;
	private runCurrency = 0;

	constructor(config: DropManagerConfig) {
		this.scene = config.scene;
		this.audioManager = config.audioManager;

		this.group = this.scene.physics.add.group({
			classType: Phaser.GameObjects.Rectangle,
			runChildUpdate: false,
		});

		// Pre-populate pool
		for (let i = 0; i < INITIAL_POOL_SIZE; i++) {
			this.createPickup();
		}
	}

	/** The underlying physics group — pass to physics.add.overlap for player collision */
	get physicsGroup(): Phaser.Physics.Arcade.Group {
		return this.group;
	}

	/** Current run currency total */
	get currency(): number {
		return this.runCurrency;
	}

	get stats(): DropPickupStats {
		let active = 0;
		for (const obj of this.group.getChildren()) {
			if (obj.active) active++;
		}
		return {
			active,
			created: this.created,
			highWater: this.highWater,
			totalCollected: this.totalCollected,
		};
	}

	/**
	 * Roll drops from an enemy's drop table and spawn pickups at the death location.
	 * @param drops The enemy's DropTable (from getData('drops'))
	 * @param x Death x position
	 * @param y Death y position
	 * @param guaranteed If true, force at least one drop (boss kill)
	 */
	rollDrops(drops: DropTable, x: number, y: number, guaranteed: boolean): void {
		if (!drops || drops.length === 0) return;

		let anyDropped = false;

		for (const entry of drops) {
			if (Math.random() < entry.chance) {
				this.spawnDrop(entry, x, y);
				anyDropped = true;
			}
		}

		if (!anyDropped) {
			// Accumulate pity — use max contribution from the table per kill.
			// Rationale: a kill is worth "the most important missed drop's contribution."
			const maxContribution = Math.max(...drops.map((d) => d.pityBucketContribution ?? 1));
			this.pityBucket += maxContribution;

			if (this.pityBucket >= PITY_THRESHOLD || guaranteed) {
				// Pity or guaranteed fires: force the highest-chance drop
				const best = drops.reduce((a, b) => (a.chance >= b.chance ? a : b));
				this.spawnDrop(best, x, y);
				this.pityBucket = 0;
			}
		} else {
			// Successful drop resets pity
			this.pityBucket = 0;
		}
	}

	/**
	 * Called when player overlaps a pickup. Returns the currency/item value.
	 * Caller handles the actual overlap registration.
	 */
	collectPickup(pickup: Phaser.GameObjects.Rectangle): { type: string; quantity: number } | null {
		if (!pickup.active) return null;

		const type = pickup.getData('dropType') as string;
		const quantity = (pickup.getData('quantity') as number) || 1;

		if (type === 'currency') {
			this.runCurrency += quantity;
		}

		this.totalCollected++;
		this.audioManager.playSfx('sfx-pickup', 0.4);
		this.releasePickup(pickup);

		return { type, quantity };
	}

	/** Per-frame update: drift pickups toward player, expire old ones */
	update(time: number, playerX: number, playerY: number): void {
		for (const obj of this.group.getChildren()) {
			if (!obj.active) continue;
			const pickup = obj as Phaser.GameObjects.Rectangle;

			const spawnTime = pickup.getData('spawnTime') as number;
			const elapsed = time - spawnTime;

			// Fade out during the final second of life
			const fadeStart = PICKUP_LIFETIME_MS - 1000;
			if (elapsed > fadeStart) {
				const fadeRatio = 1 - (elapsed - fadeStart) / 1000;
				pickup.setAlpha(Math.max(0, fadeRatio));
			}

			// Release when expired and fully faded
			if (elapsed > PICKUP_LIFETIME_MS) {
				this.releasePickup(pickup);
				continue;
			}

			// Drift toward player — accelerate when close (magnet effect)
			const dx = playerX - pickup.x;
			const dy = playerY - pickup.y;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist > 1) {
				const speed = dist < MAGNET_RADIUS ? MAGNET_SPEED : DRIFT_SPEED;
				const nx = dx / dist;
				const ny = dy / dist;
				const body = pickup.body as Phaser.Physics.Arcade.Body;
				body.setVelocity(nx * speed, ny * speed);
			}

			// Bob animation — gentle sine-wave scale pulse
			const age = time - spawnTime;
			const pulse = 1 + Math.sin(age * 0.005) * 0.1;
			pickup.setScale(pulse);
		}
	}

	/** Release all active pickups (game-over, stage-clear) */
	releaseAll(): void {
		for (const obj of this.group.getChildren()) {
			if (obj.active) {
				this.releasePickup(obj as Phaser.GameObjects.Rectangle);
			}
		}
	}

	destroy(): void {
		this.group.destroy(true);
	}

	private spawnDrop(entry: DropEntry, x: number, y: number): void {
		const pickup = this.acquirePickup();
		const color = DROP_COLORS[entry.type] ?? 0xffffff;

		// Scatter slightly from death position
		const offsetX = Phaser.Math.Between(-15, 15);
		const offsetY = Phaser.Math.Between(-15, 15);

		pickup.setPosition(x + offsetX, y + offsetY);
		pickup.setSize(PICKUP_SIZE, PICKUP_SIZE);
		pickup.setDisplaySize(PICKUP_SIZE, PICKUP_SIZE);
		pickup.setFillStyle(color);
		pickup.setActive(true);
		pickup.setVisible(true);
		pickup.setAlpha(1);
		pickup.setScale(1);
		pickup.setRotation(0);
		pickup.setDepth(3);

		const body = pickup.body as Phaser.Physics.Arcade.Body;
		body.enable = true;
		body.setSize(PICKUP_SIZE, PICKUP_SIZE);
		body.setVelocity(0, 0);

		pickup.setData('dropType', entry.type);
		pickup.setData('quantity', entry.quantity);
		pickup.setData('itemId', entry.itemId ?? null);
		pickup.setData('spawnTime', this.scene.time.now);

		// Pop-out tween — small upward bounce from scattered position
		this.scene.tweens.add({
			targets: pickup,
			y: pickup.y - 20,
			duration: 200,
			ease: 'Back.easeOut',
		});

		// Track high-water
		const active = this.countActive();
		if (active > this.highWater) this.highWater = active;
	}

	private acquirePickup(): Phaser.GameObjects.Rectangle {
		// Find inactive
		for (const obj of this.group.getChildren()) {
			if (!obj.active) return obj as Phaser.GameObjects.Rectangle;
		}
		// Grow pool
		return this.createPickup();
	}

	private createPickup(): Phaser.GameObjects.Rectangle {
		const pickup = this.scene.add.rectangle(-200, -200, PICKUP_SIZE, PICKUP_SIZE, 0xffffff);
		this.scene.physics.add.existing(pickup);
		this.group.add(pickup);

		pickup.setActive(false);
		pickup.setVisible(false);
		const body = pickup.body as Phaser.Physics.Arcade.Body;
		body.enable = false;

		this.created++;
		return pickup;
	}

	private releasePickup(pickup: Phaser.GameObjects.Rectangle): void {
		if (!pickup.active) {
			if (typeof console !== 'undefined') {
				console.warn('[DropManager] double-release detected — pickup already inactive');
			}
			return;
		}

		// Kill any running tweens (pop-out) so they don't fight the parked position
		this.scene.tweens.killTweensOf(pickup);

		pickup.setActive(false);
		pickup.setVisible(false);
		pickup.setAlpha(1);
		pickup.setScale(1);
		pickup.setRotation(0);

		const body = pickup.body as Phaser.Physics.Arcade.Body;
		if (body) {
			body.setVelocity(0, 0);
			body.setAcceleration(0, 0);
			body.enable = false;
		}

		pickup.setData('dropType', undefined);
		pickup.setData('quantity', undefined);
		pickup.setData('itemId', undefined);
		pickup.setData('spawnTime', undefined);

		pickup.setPosition(-200, -200);
	}

	private countActive(): number {
		let n = 0;
		for (const obj of this.group.getChildren()) {
			if (obj.active) n++;
		}
		return n;
	}
}
