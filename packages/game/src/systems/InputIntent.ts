// ---------------------------------------------------------------------------
// Input intent — stable contract consumed by GameScene
// ---------------------------------------------------------------------------

import type * as Phaser from 'phaser';

/** Normalized input snapshot consumed by GameScene each frame */
export interface InputIntent {
	/** Movement direction, each axis normalized to -1..1 */
	moveVector: { x: number; y: number };
	/** When true, moveVector is a position delta (pixels) not a velocity direction */
	isPositionDelta: boolean;
	/** Primary weapon firing (true = fire when cooldown ready) */
	fireHeld: boolean;
	/** Secondary ability (reserved for future use) */
	secondaryHeld: boolean;
	/** Pause toggle (reserved for future use) */
	pausePressed: boolean;
}

/** Lifecycle interface for all input adapters */
export interface InputAdapter {
	create(scene: Phaser.Scene): void;
	update(): InputIntent;
	clear(): void;
	destroy(): void;
}

/** Zero-state intent — no input */
export const ZERO_INTENT: Readonly<InputIntent> = {
	moveVector: { x: 0, y: 0 },
	isPositionDelta: false,
	fireHeld: true, // firing is unconditional
	secondaryHeld: false,
	pausePressed: false,
};
