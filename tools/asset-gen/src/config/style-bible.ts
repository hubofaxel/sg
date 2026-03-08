// ---------------------------------------------------------------------------
// Style bible — shared visual directives for all AI-generated assets
// Composed into every prompt via prompt-templates.ts
// ---------------------------------------------------------------------------

export const STYLE_BIBLE = {
	global: [
		'pixel art style',
		'top-down vertical shoot-em-up (shmup) perspective',
		'gameplay-first readability with crisp silhouettes',
		'restrained color palette, max 16 colors per sprite',
		'clean edges, no anti-aliasing between sprite and transparent background',
		'no text, no labels, no watermarks, no UI elements',
		'no border, no frame, no drop shadow',
		'centered on canvas with ample transparent margin',
	],

	sprites: [
		'single sprite or sprite sheet on fully transparent background',
		'each frame clearly separated with consistent sizing',
		'sharp pixel boundaries, nearest-neighbor style',
		'visible at 32-64px game scale — bold shapes, not fine detail',
	],

	backgrounds: [
		'seamless-tileable starfield or space environment',
		'dark space palette with subtle color variation',
		'depth layers: distant stars (tiny dots), mid-field nebula hints, foreground dust',
		'no bright focal objects that would compete with gameplay sprites',
	],

	ships: [
		'sleek angular fighter silhouette',
		'visible cockpit/canopy area',
		'engine glow at rear',
		'facing upward (ship nose points to top of image)',
	],

	enemies: [
		'menacing but readable silhouette',
		'distinct color palette from player ship (reds, purples, dark greens)',
		'facing downward (enemy nose points to bottom of image)',
		'mechanical or alien aesthetic',
	],

	bosses: [
		'large imposing silhouette, 2-4x enemy size',
		'visible weak points or glowing elements',
		'heavy armor plating or organic shell details',
		'intimidating but still pixel-art readable',
	],
} as const;

export function getStyleDirectives(...categories: (keyof typeof STYLE_BIBLE)[]): string {
	const directives: string[] = [...STYLE_BIBLE.global];
	for (const cat of categories) {
		if (cat !== 'global') {
			directives.push(...STYLE_BIBLE[cat]);
		}
	}
	return `${directives.join('. ')}.`;
}
