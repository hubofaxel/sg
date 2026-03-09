// ---------------------------------------------------------------------------
// KeyboardInput — adapter wrapping existing cursor/WASD logic
// ---------------------------------------------------------------------------

import * as Phaser from 'phaser';
import type { InputAdapter, InputIntent } from './InputIntent';

export class KeyboardInput implements InputAdapter {
	private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
	private wasd!: {
		W: Phaser.Input.Keyboard.Key;
		A: Phaser.Input.Keyboard.Key;
		S: Phaser.Input.Keyboard.Key;
		D: Phaser.Input.Keyboard.Key;
	};
	private scene: Phaser.Scene | null = null;

	private intent: InputIntent = {
		moveVector: { x: 0, y: 0 },
		isPositionDelta: false,
		fireHeld: true,
		secondaryHeld: false,
		pausePressed: false,
	};

	create(scene: Phaser.Scene): void {
		this.scene = scene;
		if (!scene.input.keyboard) throw new Error('Keyboard input not available');
		const keyboard = scene.input.keyboard;
		this.cursors = keyboard.createCursorKeys();
		this.wasd = {
			W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
			A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
			S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
			D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
		};
	}

	update(): InputIntent {
		const left = this.cursors.left.isDown || this.wasd.A.isDown;
		const right = this.cursors.right.isDown || this.wasd.D.isDown;
		const up = this.cursors.up.isDown || this.wasd.W.isDown;
		const down = this.cursors.down.isDown || this.wasd.S.isDown;

		let x = 0;
		let y = 0;

		if (left) x = -1;
		else if (right) x = 1;

		if (up) y = -1;
		else if (down) y = 1;

		// Normalize diagonal
		if (x !== 0 && y !== 0) {
			const inv = 1 / Math.SQRT2;
			x *= inv;
			y *= inv;
		}

		this.intent.moveVector.x = x;
		this.intent.moveVector.y = y;
		this.intent.fireHeld = true;
		this.intent.secondaryHeld = false;
		this.intent.pausePressed = false;

		return this.intent;
	}

	clear(): void {
		this.intent.moveVector.x = 0;
		this.intent.moveVector.y = 0;
		this.intent.fireHeld = true;
		this.intent.secondaryHeld = false;
		this.intent.pausePressed = false;
	}

	destroy(): void {
		if (this.scene?.input.keyboard) {
			this.scene.input.keyboard.removeAllKeys(true);
		}
		this.scene = null;
	}
}
