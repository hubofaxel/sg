// ---------------------------------------------------------------------------
// @sg/game — public types (no Phaser imports here)
// ---------------------------------------------------------------------------

/** Options passed from the Svelte shell into mountGame */
export interface GameMountOptions {
	width?: number;
	height?: number;
	pixelArt?: boolean;
	/** Settings pulled from the Svelte settings store */
	settings?: {
		masterVolume?: number;
		sfxVolume?: number;
		musicVolume?: number;
		showFps?: boolean;
	};
}

/** Events the game can emit to the Svelte shell */
export interface GameEventMap {
	score: [score: number];
	death: [];
	'scene-change': [scene: string];
	ready: [];
	error: [error: Error];
}

/** Handle returned by mountGame — the ONLY public API */
export interface GameHandle {
	destroy(): void;
	pause(): void;
	resume(): void;
	emit<K extends keyof GameEventMap>(event: K, ...args: GameEventMap[K]): void;
	on<K extends keyof GameEventMap>(event: K, handler: (...args: GameEventMap[K]) => void): void;
	off<K extends keyof GameEventMap>(event: K, handler: (...args: GameEventMap[K]) => void): void;
}
