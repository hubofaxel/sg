/**
 * HudScale — display-size-dependent scaling for HUD text and margins.
 *
 * Pure functions for computing clamped scale factors from display dimensions
 * and applying them to font sizes with per-element pixel floors.
 */

export const REF_HEIGHT = 600;
export const SCALE_FLOOR = 0.6;
export const SCALE_CEILING = 1.5;
/**
 * Text floor avoids "double-dip" shrinking with Phaser FIT mode.
 * FIT already shrinks world pixels on small screens, so text scaling should
 * never apply an additional sub-1.0 reduction.
 */
export const TEXT_SCALE_FLOOR = 1.0;
export const HUD_TEXT_MIN_PX = 10;
export const BOSS_LABEL_MIN_PX = 9;

/**
 * Compute clamped display factor from display dimensions.
 * Height is the fixed axis (always 600), so the factor is display-height-based.
 */
export function computeScaleFactor(_displayWidth: number, displayHeight: number): number {
	const rawFactor = displayHeight / REF_HEIGHT;
	return Math.max(SCALE_FLOOR, Math.min(rawFactor, SCALE_CEILING));
}

/**
 * Compute UI text factor with a floor of 1.0.
 * Prevents tiny text on phones where FIT scaling already reduces visual size.
 */
export function computeTextScaleFactor(displayWidth: number, displayHeight: number): number {
	return Math.max(computeScaleFactor(displayWidth, displayHeight), TEXT_SCALE_FLOOR);
}

/** Scale a font size with an optional pixel floor */
export function scaleFontSize(baseSize: number, factor: number, minPx = 0): number {
	return Math.max(baseSize * factor, minPx);
}

/** Scale a margin value by the clamped factor */
export function scaleMargin(baseMargin: number, factor: number): number {
	return baseMargin * factor;
}
