import { z } from 'zod';

// ---------------------------------------------------------------------------
// Control scheme
// ---------------------------------------------------------------------------

export const ControlSchemeSchema = z.enum(['wasd', 'arrows']);
export type ControlScheme = z.infer<typeof ControlSchemeSchema>;

// ---------------------------------------------------------------------------
// Game settings — persisted to localStorage
// ---------------------------------------------------------------------------

export const GameSettingsSchema = z.object({
	// --- Audio ---
	/** Master volume 0–1 */
	masterVolume: z.number().min(0).max(1).default(0.8),
	/** SFX volume 0–1 (multiplied by master) */
	sfxVolume: z.number().min(0).max(1).default(1.0),
	/** Music volume 0–1 (multiplied by master) */
	musicVolume: z.number().min(0).max(1).default(0.7),

	// --- Controls ---
	/** Default movement key scheme */
	controlScheme: ControlSchemeSchema.default('wasd'),
	/** Whether touch controls are shown on mobile */
	touchControlsEnabled: z.boolean().default(true),

	// --- Display ---
	/**
	 * Camera zoom level — controls how much of the world is visible.
	 * 1.0 = default view, <1.0 = zoomed out (more visible), >1.0 = zoomed in.
	 * Clamped to prevent extreme values.
	 */
	zoom: z.number().min(0.5).max(2.0).default(1.0),
	/** Screen shake intensity 0–1 (0 = disabled) */
	screenShake: z.number().min(0).max(1).default(0.7),
	/** Show FPS counter (dev/debug) */
	showFps: z.boolean().default(false),
});
export type GameSettings = z.infer<typeof GameSettingsSchema>;

// ---------------------------------------------------------------------------
// Default settings factory
// ---------------------------------------------------------------------------

/** Returns a fresh GameSettings with all defaults applied */
export function defaultGameSettings(): GameSettings {
	return GameSettingsSchema.parse({});
}
