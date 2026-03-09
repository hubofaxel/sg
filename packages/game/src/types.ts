// ---------------------------------------------------------------------------
// @sg/game — public types (no Phaser imports here)
// ---------------------------------------------------------------------------

/** Options passed from the Svelte shell into mountGame */
export interface GameMountOptions {
	width?: number;
	height?: number;
	pixelArt?: boolean;
	/** Base path prefix for asset URLs (e.g. '/sg' for GitHub Pages subpath) */
	basePath?: string;
	/** Aspect ratio clamp for adaptive world sizing */
	aspectRatio?: {
		minWidth?: number;
		maxWidth?: number;
	};
	/** Settings pulled from the Svelte settings store */
	settings?: {
		masterVolume?: number;
		sfxVolume?: number;
		musicVolume?: number;
		showFps?: boolean;
		/** Whether touch controls are enabled on capable devices */
		touchControlsEnabled?: boolean;
		/** Control scheme: 'wasd' | 'arrows' | 'touch' */
		controlScheme?: string;
		/** Touch input style: 'relative' (1:1 tracking) or 'joystick' (virtual stick) */
		touchStyle?: string;
	};
}

/** Events the game can emit to the Svelte shell */
export interface GameEventMap {
	score: [score: number];
	death: [];
	'stage-clear': [stageIndex: number, score: number, currency: number];
	'scene-change': [scene: string];
	ready: [];
	error: [error: Error];
}

/** Settings that can be updated at runtime without remounting */
export interface RuntimeSettings {
	masterVolume: number;
	sfxVolume: number;
	musicVolume: number;
	showFps: boolean;
}

/** Handle returned by mountGame — the ONLY public API */
export interface GameHandle {
	destroy(): void;
	pause(): void;
	resume(): void;
	updateSettings(partial: Partial<RuntimeSettings>): void;
	emit<K extends keyof GameEventMap>(event: K, ...args: GameEventMap[K]): void;
	on<K extends keyof GameEventMap>(event: K, handler: (...args: GameEventMap[K]) => void): void;
	off<K extends keyof GameEventMap>(event: K, handler: (...args: GameEventMap[K]) => void): void;
}
