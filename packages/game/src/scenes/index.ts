// ---------------------------------------------------------------------------
// Scene registry — single source of truth for scene keys and classes
// ---------------------------------------------------------------------------

export const SCENE_KEYS = {
	Boot: 'BootScene',
	Preload: 'PreloadScene',
	Menu: 'MenuScene',
	Game: 'GameScene',
} as const;

export { BootScene } from './BootScene';
export { PreloadScene } from './PreloadScene';
