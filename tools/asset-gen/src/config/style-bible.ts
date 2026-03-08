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
		'sleek angular fighter silhouette with personality',
		'visible cockpit/canopy area with tinted visor',
		'bright engine glow at rear (cyan or blue)',
		'facing upward (ship nose points to top of image)',
		'heroic and fun — arcade spaceship, not military sim',
		'silver-white or light-colored hull to stand out against dark space',
	],

	enemies: [
		'menacing but charming silhouette — each enemy type visually distinct',
		'distinct color palette from player ship (reds, oranges, purples, dark greens)',
		'facing downward (enemy nose points to bottom of image)',
		'mechanical or alien aesthetic with personality and character',
		'variety in shape language: round vs angular vs organic across different types',
	],

	bosses: [
		'large imposing silhouette, 2-4x enemy size',
		'visible weak points or glowing elements',
		'heavy armor plating with detailed surface work',
		'intimidating but still pixel-art readable',
		'multiple visual details: turrets, vents, energy lines, rivets',
	],

	effects: [
		'strong silhouette readability and clarity at small in-game scale',
		'crisp pixel edges, no anti-aliasing, no soft glow, no blur, no painterly rendering',
		'centered composition with consistent frame-to-frame alignment',
		'clear progression from ignition to peak blast to breakup to dissipation',
		'high contrast, sharp shock shapes, controlled color ramps',
		'no oversized smoke clouds, no realistic volumetric simulation',
		'damage effects: white core, yellow, orange, red, dark brown smoke',
		'energy effects: white, cyan, electric blue, violet',
		'isolated asset on transparent background, no shadows outside the effect',
	],

	sfx: [
		'retro arcade sound effect',
		'punchy and immediate, no long reverb tails',
		'clean transient at the start for responsive game feel',
		'8-bit or 16-bit inspired but with modern clarity',
		'short duration, suitable for rapid repeated playback',
	],

	music: [
		'electronic game soundtrack',
		'space shooter / sci-fi theme',
		'driving rhythm suitable for action gameplay',
		'loopable structure for seamless repetition',
		'high energy but not fatiguing over extended play sessions',
	],

	branding: [
		'single iconic image on fully transparent background',
		'brand mark / logo — NOT a game sprite, NOT a sprite sheet',
		'simplified pixel art with fewer internal details than in-game sprites',
		'strong readable silhouette that works as a single-color shape',
		'must be recognizable when scaled down to 16x16 pixels',
		'max 8-10 colors — fewer than game sprites',
		'sharp pixel edges, no anti-aliasing, no gradients, no glow effects',
		'bold confident composition, centered and balanced',
		'arcade-clean aesthetic, not prestige sci-fi',
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
