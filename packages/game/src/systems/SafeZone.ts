// ---------------------------------------------------------------------------
// SafeZone — adaptive world sizing and safe zone computation
// Pure functions, zero Phaser dependency, fully unit-testable.
// ---------------------------------------------------------------------------

/** The rectangle where all designed gameplay density lives */
export interface SafeZone {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly centerX: number;
	readonly centerY: number;
	readonly right: number;
	readonly bottom: number;
}

// Safe zone is always this size — gameplay is authored against it
export const SAFE_ZONE_WIDTH = 800;
export const SAFE_ZONE_HEIGHT = 600;

// World size limits
export const MIN_WORLD_WIDTH = 800;
export const MAX_WORLD_WIDTH = 1340;
export const WORLD_HEIGHT = 600;

/**
 * Compute world dimensions that fill the container while keeping height fixed.
 * Width varies with container aspect ratio, clamped to [minWidth, maxWidth].
 */
export function computeWorldSize(
	containerWidth: number,
	containerHeight: number,
	minWidth = MIN_WORLD_WIDTH,
	maxWidth = MAX_WORLD_WIDTH,
	baseHeight = WORLD_HEIGHT,
): { width: number; height: number } {
	const containerAspect = containerWidth / containerHeight;
	const rawWidth = baseHeight * containerAspect;
	const width = Math.max(minWidth, Math.min(Math.round(rawWidth), maxWidth));
	return { width, height: baseHeight };
}

/**
 * Create a safe zone centered in the world.
 * At 4:3 (800x600), safe zone origin is (0,0) — no offset.
 */
export function createSafeZone(worldWidth: number, worldHeight: number): SafeZone {
	const x = (worldWidth - SAFE_ZONE_WIDTH) / 2;
	const y = (worldHeight - SAFE_ZONE_HEIGHT) / 2;
	return {
		x,
		y,
		width: SAFE_ZONE_WIDTH,
		height: SAFE_ZONE_HEIGHT,
		centerX: x + SAFE_ZONE_WIDTH / 2,
		centerY: y + SAFE_ZONE_HEIGHT / 2,
		right: x + SAFE_ZONE_WIDTH,
		bottom: y + SAFE_ZONE_HEIGHT,
	};
}
