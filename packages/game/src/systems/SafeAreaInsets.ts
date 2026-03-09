/**
 * SafeAreaInsets — reads browser safe area inset values via a CSS env() probe.
 * Used to offset HUD elements inward from hardware cutouts (notch, camera, gesture bar).
 */

export interface SafeAreaInsets {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

export const ZERO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Probe the browser for current safe area inset values.
 * Returns pixel values computed from CSS env(safe-area-inset-*).
 * Returns ZERO_INSETS in non-browser environments (SSR, tests).
 */
export function getSafeAreaInsets(): SafeAreaInsets {
	if (typeof document === 'undefined') return ZERO_INSETS;

	const div = document.createElement('div');
	div.style.position = 'fixed';
	div.style.top = '0';
	div.style.left = '0';
	div.style.width = '0';
	div.style.height = '0';
	div.style.paddingTop = 'env(safe-area-inset-top, 0px)';
	div.style.paddingRight = 'env(safe-area-inset-right, 0px)';
	div.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
	div.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
	document.body.appendChild(div);

	const cs = getComputedStyle(div);
	const insets: SafeAreaInsets = {
		top: parseFloat(cs.paddingTop) || 0,
		right: parseFloat(cs.paddingRight) || 0,
		bottom: parseFloat(cs.paddingBottom) || 0,
		left: parseFloat(cs.paddingLeft) || 0,
	};

	div.remove();
	return insets;
}

/**
 * Convert screen-pixel insets to world-coordinate insets.
 * The game world is larger than the display (FIT mode scales it down),
 * so insets need to be scaled up to world coordinates.
 */
export function toWorldInsets(
	insets: SafeAreaInsets,
	gameWidth: number,
	gameHeight: number,
	displayWidth: number,
	displayHeight: number,
): SafeAreaInsets {
	const scaleX = gameWidth / displayWidth;
	const scaleY = gameHeight / displayHeight;
	return {
		top: insets.top * scaleY,
		right: insets.right * scaleX,
		bottom: insets.bottom * scaleY,
		left: insets.left * scaleX,
	};
}
