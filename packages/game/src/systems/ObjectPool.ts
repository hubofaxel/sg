import * as Phaser from 'phaser';

/**
 * BulletPool — recycles Rectangle game objects for projectiles.
 *
 * In a shmup, player fires every few frames and multiple enemies fire
 * simultaneously. Without pooling, each bullet is a full create/destroy
 * cycle: allocate Rectangle, create physics body, add to group, then GC
 * on destroy. At 60fps with rapid fire, that's 20-30+ allocs/sec for
 * player bullets alone, plus enemy spread-shots creating bursts of 15.
 *
 * Pooling pre-creates objects and recycles them:
 *   acquire → use → release → reuse
 * A released bullet returns to a canonical zero state: inactive, invisible,
 * body disabled, zero velocity, neutral transform, no stale data.
 *
 * Lifecycle contract:
 * - acquire() returns a fully reset bullet ready for use
 * - release() is idempotent — double-release logs a warning but does not corrupt
 * - Every inactive bullet must be: invisible, body-disabled, zero-velocity,
 *   neutral alpha/scale/tint, parked offscreen, not referenced by any tween
 */

export interface PoolStats {
	active: number;
	available: number;
	created: number;
	highWater: number;
	growthEvents: number;
}

export class BulletPool {
	private group: Phaser.Physics.Arcade.Group;
	private scene: Phaser.Scene;
	private defaultWidth: number;
	private defaultHeight: number;
	private defaultColor: number;
	private created = 0;
	private initialSize: number;
	private highWater = 0;
	private growthEvents = 0;

	constructor(
		scene: Phaser.Scene,
		config: {
			defaultWidth?: number;
			defaultHeight?: number;
			defaultColor?: number;
			initialSize?: number;
		} = {},
	) {
		this.scene = scene;
		this.defaultWidth = config.defaultWidth ?? 4;
		this.defaultHeight = config.defaultHeight ?? 8;
		this.defaultColor = config.defaultColor ?? 0xffffff;
		this.initialSize = config.initialSize ?? 0;

		// No maxSize on the group — pool controls creation, not the group
		this.group = scene.physics.add.group({
			classType: Phaser.GameObjects.Rectangle,
			runChildUpdate: false,
		});

		// Pre-populate with inactive objects to avoid first-frame allocation spike
		for (let i = 0; i < this.initialSize; i++) {
			this.createObject();
		}
	}

	/** The underlying Phaser group — pass to physics.add.overlap for collisions */
	get physicsGroup(): Phaser.Physics.Arcade.Group {
		return this.group;
	}

	/**
	 * Acquire a bullet from the pool.
	 * Reuses an inactive one if available, otherwise grows the pool
	 * (logged as a growth event for sizing diagnostics).
	 */
	acquire(
		x: number,
		y: number,
		vx: number,
		vy: number,
		config?: {
			width?: number;
			height?: number;
			color?: number;
		},
	): Phaser.GameObjects.Rectangle {
		let bullet = this.findInactive();

		if (!bullet) {
			bullet = this.createObject();
			this.growthEvents++;
		}

		const w = config?.width ?? this.defaultWidth;
		const h = config?.height ?? this.defaultHeight;
		const color = config?.color ?? this.defaultColor;

		// Full state reset — canonical acquire state
		bullet.setPosition(x, y);
		bullet.setSize(w, h);
		bullet.setDisplaySize(w, h);
		bullet.setFillStyle(color);
		bullet.setActive(true);
		bullet.setVisible(true);
		bullet.setAlpha(1);
		bullet.setScale(1);
		bullet.setRotation(0);

		const body = bullet.body as Phaser.Physics.Arcade.Body;
		body.enable = true;
		body.setSize(w, h);
		body.setVelocity(vx, vy);
		body.setAcceleration(0, 0);

		// Track high-water mark for sizing diagnostics
		const active = this.countActive();
		if (active > this.highWater) {
			this.highWater = active;
		}

		return bullet;
	}

	/**
	 * Release a bullet back to the pool.
	 * Idempotent — double-release logs a warning but does not corrupt state.
	 */
	release(bullet: Phaser.GameObjects.Rectangle): void {
		if (!bullet.active) {
			if (typeof console !== 'undefined') {
				console.warn('[BulletPool] double-release detected — bullet already inactive');
			}
			return;
		}

		// Full state reset — canonical inactive state
		bullet.setActive(false);
		bullet.setVisible(false);
		bullet.setAlpha(1);
		bullet.setScale(1);
		bullet.setRotation(0);

		const body = bullet.body as Phaser.Physics.Arcade.Body;
		if (body) {
			body.setVelocity(0, 0);
			body.setAcceleration(0, 0);
			body.enable = false;
		}

		// Clear gameplay data so stale values don't leak to next user
		bullet.setData('damage', undefined);

		// Park offscreen — belt-and-suspenders after body disable
		bullet.setPosition(-200, -200);
	}

	/** Release all active bullets (game-over, stage-clear, scene restart) */
	releaseAll(): void {
		for (const obj of this.group.getChildren()) {
			if (obj.active) {
				this.release(obj as Phaser.GameObjects.Rectangle);
			}
		}
	}

	get stats(): PoolStats {
		let active = 0;
		let available = 0;
		for (const obj of this.group.getChildren()) {
			if (obj.active) active++;
			else available++;
		}
		return {
			active,
			available,
			created: this.created,
			highWater: this.highWater,
			growthEvents: this.growthEvents,
		};
	}

	destroy(): void {
		this.group.destroy(true);
	}

	private countActive(): number {
		let n = 0;
		for (const obj of this.group.getChildren()) {
			if (obj.active) n++;
		}
		return n;
	}

	private findInactive(): Phaser.GameObjects.Rectangle | null {
		for (const obj of this.group.getChildren()) {
			if (!obj.active) return obj as Phaser.GameObjects.Rectangle;
		}
		return null;
	}

	private createObject(): Phaser.GameObjects.Rectangle {
		const bullet = this.scene.add.rectangle(
			-200,
			-200,
			this.defaultWidth,
			this.defaultHeight,
			this.defaultColor,
		);
		this.scene.physics.add.existing(bullet);
		this.group.add(bullet);

		// Start inactive — waiting in the pool
		bullet.setActive(false);
		bullet.setVisible(false);
		const body = bullet.body as Phaser.Physics.Arcade.Body;
		body.enable = false;

		this.created++;
		return bullet;
	}
}
