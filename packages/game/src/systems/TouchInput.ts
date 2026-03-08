// ---------------------------------------------------------------------------
// TouchInput — floating virtual joystick via Pointer Events
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
	private activePointerId: number | null = null;
	private originX = 0;
	private originY = 0;

	private joystickOuter: Phaser.GameObjects.Graphics | null = null;
	private joystickThumb: Phaser.GameObjects.Graphics | null = null;

	private intent: InputIntent = {
		moveVector: { x: 0, y: 0 },
		fireHeld: true,
		secondaryHeld: false,
		pausePressed: false,
	};

	// Bound listener references for cleanup
	private onPointerDown!: (pointer: Phaser.Input.Pointer) => void;
	private onPointerMove!: (pointer: Phaser.Input.Pointer) => void;
	private onPointerUp!: (pointer: Phaser.Input.Pointer) => void;
	private onPointerCancel!: () => void;

	create(scene: Phaser.Scene): void {
		this.scene = scene;

		// Create joystick graphics (hidden until touch)
		this.joystickOuter = scene.add.graphics();
		this.joystickOuter.setDepth(1000);
		this.joystickOuter.setVisible(false);

		this.joystickThumb = scene.add.graphics();
		this.joystickThumb.setDepth(1001);
		this.joystickThumb.setVisible(false);

		this.drawOuter();
		this.drawThumb(0, 0);

		// Bind pointer listeners
		this.onPointerDown = (pointer: Phaser.Input.Pointer) => {
			// Only respond to left-half touches, ignore if already tracking
			if (this.activePointerId !== null) return;
			const { width } = scene.scale;
			if (pointer.x > width / 2) return;

			this.activePointerId = pointer.id;
			this.originX = pointer.x;
			this.originY = pointer.y;

			this.showJoystick(pointer.x, pointer.y);
		};

		this.onPointerMove = (pointer: Phaser.Input.Pointer) => {
			if (pointer.id !== this.activePointerId) return;

			const dx = pointer.x - this.originX;
			const dy = pointer.y - this.originY;
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

		this.onPointerUp = (pointer: Phaser.Input.Pointer) => {
			if (pointer.id !== this.activePointerId) return;
			this.releaseJoystick();
		};

		this.onPointerCancel = () => {
			this.clear();
		};

		scene.input.on('pointerdown', this.onPointerDown);
		scene.input.on('pointermove', this.onPointerMove);
		scene.input.on('pointerup', this.onPointerUp);

		// pointercancel from browser (tab switch, gesture interrupt)
		const canvas = scene.game.canvas;
		if (canvas) {
			canvas.addEventListener('pointercancel', this.onPointerCancel);
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
		if (this.scene) {
			this.scene.input.off('pointerdown', this.onPointerDown);
			this.scene.input.off('pointermove', this.onPointerMove);
			this.scene.input.off('pointerup', this.onPointerUp);

			const canvas = this.scene.game.canvas;
			if (canvas) {
				canvas.removeEventListener('pointercancel', this.onPointerCancel);
			}
		}

		this.joystickOuter?.destroy();
		this.joystickThumb?.destroy();
		this.joystickOuter = null;
		this.joystickThumb = null;
		this.scene = null;
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
