// ---------------------------------------------------------------------------
// RelativeTouchInput — 1:1 finger-tracking movement (Pew Pew style)
//
// Touch and drag on the left half: ship moves the same distance as your
// finger. No joystick visual, no dead zone. Direct and precise.
// ---------------------------------------------------------------------------

import type * as Phaser from 'phaser';
import type { InputAdapter, InputIntent } from './InputIntent';

export class RelativeTouchInput implements InputAdapter {
	private scene: Phaser.Scene | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private activePointerId: number | null = null;

	// Anchor = pointer position at touch start (world coords)
	private anchorX = 0;
	private anchorY = 0;
	// Ship position at touch start (world coords)
	private shipOriginX = 0;
	private shipOriginY = 0;
	// Current target position (world coords)
	private targetX = 0;
	private targetY = 0;
	private hasTarget = false;

	// Reference to the player sprite for reading current position
	private player: Phaser.GameObjects.Sprite | null = null;

	private intent: InputIntent = {
		moveVector: { x: 0, y: 0 },
		isPositionDelta: true,
		fireHeld: true,
		secondaryHeld: false,
		pausePressed: false,
	};

	// Bound listener references for cleanup
	private boundPointerDown!: (e: PointerEvent) => void;
	private boundPointerMove!: (e: PointerEvent) => void;
	private boundPointerUp!: (e: PointerEvent) => void;
	private boundPointerCancel!: (e: PointerEvent) => void;

	/** Pass the player sprite so we can read its position on touch start */
	setPlayer(player: Phaser.GameObjects.Sprite): void {
		this.player = player;
	}

	create(scene: Phaser.Scene): void {
		this.scene = scene;
		this.canvas = scene.game.canvas;

		this.boundPointerDown = (e: PointerEvent) => {
			if (this.activePointerId !== null) return;

			const worldPos = this.toWorldCoords(e);
			if (!worldPos) return;

			const { width } = scene.scale;
			if (worldPos.x > width / 2) return;

			this.activePointerId = e.pointerId;
			this.anchorX = worldPos.x;
			this.anchorY = worldPos.y;

			// Record ship position at touch start
			if (this.player) {
				this.shipOriginX = this.player.x;
				this.shipOriginY = this.player.y;
			}

			this.targetX = this.shipOriginX;
			this.targetY = this.shipOriginY;
			this.hasTarget = true;
		};

		this.boundPointerMove = (e: PointerEvent) => {
			if (e.pointerId !== this.activePointerId) return;

			const worldPos = this.toWorldCoords(e);
			if (!worldPos) return;

			// Target = ship origin + finger delta from anchor
			this.targetX = this.shipOriginX + (worldPos.x - this.anchorX);
			this.targetY = this.shipOriginY + (worldPos.y - this.anchorY);
		};

		this.boundPointerUp = (e: PointerEvent) => {
			if (e.pointerId !== this.activePointerId) return;
			this.releaseTouch();
		};

		this.boundPointerCancel = (e: PointerEvent) => {
			if (e.pointerId !== this.activePointerId) return;
			this.clear();
		};

		if (this.canvas) {
			this.canvas.addEventListener('pointerdown', this.boundPointerDown);
			this.canvas.addEventListener('pointermove', this.boundPointerMove);
			this.canvas.addEventListener('pointerup', this.boundPointerUp);
			this.canvas.addEventListener('pointercancel', this.boundPointerCancel);
		}
	}

	update(): InputIntent {
		if (this.hasTarget && this.player) {
			// Delta from current ship position to target
			this.intent.moveVector.x = this.targetX - this.player.x;
			this.intent.moveVector.y = this.targetY - this.player.y;
		} else {
			this.intent.moveVector.x = 0;
			this.intent.moveVector.y = 0;
		}
		return this.intent;
	}

	clear(): void {
		this.intent.moveVector.x = 0;
		this.intent.moveVector.y = 0;
		this.intent.fireHeld = true;
		this.intent.secondaryHeld = false;
		this.intent.pausePressed = false;
		this.activePointerId = null;
		this.hasTarget = false;
	}

	destroy(): void {
		if (this.canvas) {
			this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
			this.canvas.removeEventListener('pointermove', this.boundPointerMove);
			this.canvas.removeEventListener('pointerup', this.boundPointerUp);
			this.canvas.removeEventListener('pointercancel', this.boundPointerCancel);
		}

		this.canvas = null;
		this.scene = null;
		this.player = null;
	}

	/** Convert a DOM PointerEvent to Phaser world coordinates */
	private toWorldCoords(e: PointerEvent): { x: number; y: number } | null {
		if (!this.canvas || !this.scene) return null;

		const rect = this.canvas.getBoundingClientRect();
		const cssX = e.clientX - rect.left;
		const cssY = e.clientY - rect.top;

		const { width, height } = this.scene.scale;
		const worldX = (cssX / rect.width) * width;
		const worldY = (cssY / rect.height) * height;

		return { x: worldX, y: worldY };
	}

	private releaseTouch(): void {
		this.activePointerId = null;
		this.hasTarget = false;
		this.intent.moveVector.x = 0;
		this.intent.moveVector.y = 0;
	}
}
