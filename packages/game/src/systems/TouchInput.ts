// ---------------------------------------------------------------------------
// TouchInput — floating virtual joystick via DOM Pointer Events
//
// Uses DOM pointer events on the canvas directly (not Phaser's input system)
// for reliable touch tracking across Phaser 4 RC versions.
// ---------------------------------------------------------------------------

import type * as Phaser from 'phaser';
import type { InputAdapter, InputIntent } from './InputIntent';

/** Movements within this radius (in world pixels) produce zero vector */
const DEAD_ZONE = 10;

/** Max joystick range — movements beyond this are clamped to magnitude 1.0 */
const MAX_RADIUS = 60;

/** Joystick visual alpha (semi-transparent to avoid obscuring gameplay) */
const JOYSTICK_ALPHA = 0.35;

/** Outer ring radius for visual */
const OUTER_RADIUS = MAX_RADIUS;

/** Inner thumb radius for visual */
const THUMB_RADIUS = 16;

export class TouchInput implements InputAdapter {
	private scene: Phaser.Scene | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private activePointerId: number | null = null;
	private originX = 0;
	private originY = 0;

	private joystickOuter: Phaser.GameObjects.Graphics | null = null;
	private joystickThumb: Phaser.GameObjects.Graphics | null = null;

	private intent: InputIntent = {
		moveVector: { x: 0, y: 0 },
		isPositionDelta: false,
		fireHeld: true,
		secondaryHeld: false,
		pausePressed: false,
	};

	// Bound listener references for cleanup
	private boundPointerDown!: (e: PointerEvent) => void;
	private boundPointerMove!: (e: PointerEvent) => void;
	private boundPointerUp!: (e: PointerEvent) => void;
	private boundPointerCancel!: (e: PointerEvent) => void;

	create(scene: Phaser.Scene): void {
		this.scene = scene;
		this.canvas = scene.game.canvas;

		// Create joystick graphics (hidden until touch)
		this.joystickOuter = scene.add.graphics();
		this.joystickOuter.setDepth(1000);
		this.joystickOuter.setVisible(false);

		this.joystickThumb = scene.add.graphics();
		this.joystickThumb.setDepth(1001);
		this.joystickThumb.setVisible(false);

		this.drawOuter();
		this.drawThumb(0, 0);

		// Use DOM pointer events on canvas for reliable touch tracking
		this.boundPointerDown = (e: PointerEvent) => {
			if (this.activePointerId !== null) return;

			const worldPos = this.toWorldCoords(e);
			if (!worldPos) return;

			const { width } = scene.scale;
			if (worldPos.x > width / 2) return;

			this.activePointerId = e.pointerId;
			this.originX = worldPos.x;
			this.originY = worldPos.y;

			this.showJoystick(worldPos.x, worldPos.y);
		};

		this.boundPointerMove = (e: PointerEvent) => {
			if (e.pointerId !== this.activePointerId) return;

			const worldPos = this.toWorldCoords(e);
			if (!worldPos) return;

			const dx = worldPos.x - this.originX;
			const dy = worldPos.y - this.originY;
			const dist = Math.sqrt(dx * dx + dy * dy);

			if (dist < DEAD_ZONE) {
				this.intent.moveVector.x = 0;
				this.intent.moveVector.y = 0;
				this.updateThumbPosition(0, 0);
				return;
			}

			const clampedDist = Math.min(dist, MAX_RADIUS);
			const scale = clampedDist / dist;
			const nx = dx * scale;
			const ny = dy * scale;

			// Normalize to -1..1
			this.intent.moveVector.x = nx / MAX_RADIUS;
			this.intent.moveVector.y = ny / MAX_RADIUS;

			this.updateThumbPosition(nx, ny);
		};

		this.boundPointerUp = (e: PointerEvent) => {
			if (e.pointerId !== this.activePointerId) return;
			this.releaseJoystick();
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
		return this.intent;
	}

	clear(): void {
		this.intent.moveVector.x = 0;
		this.intent.moveVector.y = 0;
		this.intent.fireHeld = true;
		this.intent.secondaryHeld = false;
		this.intent.pausePressed = false;
		this.activePointerId = null;
		this.hideJoystick();
	}

	destroy(): void {
		if (this.canvas) {
			this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
			this.canvas.removeEventListener('pointermove', this.boundPointerMove);
			this.canvas.removeEventListener('pointerup', this.boundPointerUp);
			this.canvas.removeEventListener('pointercancel', this.boundPointerCancel);
		}

		this.joystickOuter?.destroy();
		this.joystickThumb?.destroy();
		this.joystickOuter = null;
		this.joystickThumb = null;
		this.canvas = null;
		this.scene = null;
	}

	/** Convert a DOM PointerEvent to Phaser world coordinates */
	private toWorldCoords(e: PointerEvent): { x: number; y: number } | null {
		if (!this.canvas || !this.scene) return null;

		const rect = this.canvas.getBoundingClientRect();
		// CSS pixel position relative to canvas element
		const cssX = e.clientX - rect.left;
		const cssY = e.clientY - rect.top;

		// Scale from CSS pixels to game world coordinates
		const { width, height } = this.scene.scale;
		const worldX = (cssX / rect.width) * width;
		const worldY = (cssY / rect.height) * height;

		return { x: worldX, y: worldY };
	}

	// --- Visual helpers ---

	private drawOuter(): void {
		if (!this.joystickOuter) return;
		this.joystickOuter.clear();
		this.joystickOuter.lineStyle(2, 0xffffff, JOYSTICK_ALPHA);
		this.joystickOuter.strokeCircle(0, 0, OUTER_RADIUS);
	}

	private drawThumb(offsetX: number, offsetY: number): void {
		if (!this.joystickThumb) return;
		this.joystickThumb.clear();
		this.joystickThumb.fillStyle(0xffffff, JOYSTICK_ALPHA + 0.15);
		this.joystickThumb.fillCircle(offsetX, offsetY, THUMB_RADIUS);
	}

	private showJoystick(x: number, y: number): void {
		if (!this.joystickOuter || !this.joystickThumb) return;
		this.joystickOuter.setPosition(x, y);
		this.joystickOuter.setVisible(true);
		this.joystickThumb.setPosition(x, y);
		this.joystickThumb.setVisible(true);
		this.drawThumb(0, 0);
	}

	private hideJoystick(): void {
		this.joystickOuter?.setVisible(false);
		this.joystickThumb?.setVisible(false);
	}

	private updateThumbPosition(offsetX: number, offsetY: number): void {
		this.drawThumb(offsetX, offsetY);
	}

	private releaseJoystick(): void {
		this.activePointerId = null;
		this.intent.moveVector.x = 0;
		this.intent.moveVector.y = 0;
		this.hideJoystick();
	}
}
