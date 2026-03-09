/**
 * HudScale — display-size-dependent scaling for HUD text and margins.
 *
 * Pure functions for computing a clamped scale factor from display dimensions
 * and applying it to font sizes with per-element pixel floors.
 */

export const REF_WIDTH = 800;
export const REF_HEIGHT = 600;
export const SCALE_FLOOR = 0.6;
export const SCALE_CEILING = 1.5;
export const HUD_TEXT_MIN_PX = 10;
export const BOSS_LABEL_MIN_PX = 9;

/** Compute clamped scale factor from display dimensions */
export function computeScaleFactor(displayWidth: number, displayHeight: number): number {
	const rawFactor = Math.min(displayWidth / REF_WIDTH, displayHeight / REF_HEIGHT);
	return Math.max(SCALE_FLOOR, Math.min(rawFactor, SCALE_CEILING));
}

/** Scale a font size with an optional pixel floor */
export function scaleFontSize(baseSize: number, factor: number, minPx = 0): number {
	return Math.max(baseSize * factor, minPx);
}

/** Scale a margin value by the clamped factor */
export function scaleMargin(baseMargin: number, factor: number): number {
	return baseMargin * factor;
}
