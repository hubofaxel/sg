// ---------------------------------------------------------------------------
// Prompt templates — per-key prompt builder
// Composes asset-specific instructions with the style bible
// ---------------------------------------------------------------------------

import type { AssetCatalogEntry } from './asset-catalog.js';
import { getStyleDirectives } from './style-bible.js';

type PromptTemplate = {
	subject: string;
	details: string;
};

type AudioPromptTemplate = {
	description: string;
};

const AUDIO_TEMPLATES: Record<string, AudioPromptTemplate> = {
	// --- SFX ---
	'sfx-laser': {
		description:
			'Quick laser blast sound. Sharp electronic zap with a bright attack and fast decay. Sci-fi plasma weapon firing.',
	},
	'sfx-explosion-small': {
		description:
			'Small explosion. Brief percussive burst with crackling debris. Minor enemy destroyed or projectile impact.',
	},
	'sfx-explosion-large': {
		description:
			'Large explosion. Deep rumbling boom with extended debris scatter. Boss phase transition or heavy damage.',
	},
	'sfx-hit': {
		description:
			'Shield or hull hit impact. Metallic thud with slight electronic distortion. Damage taken feedback.',
	},
	'sfx-pickup': {
		description:
			'Power-up or item collected. Rising bright chime, positive and rewarding. Brief melodic sparkle.',
	},
	'sfx-enemy-death': {
		description:
			'Enemy destruction. Quick electronic crunch followed by brief fizzle. Satisfying kill confirmation.',
	},
	'sfx-player-death': {
		description:
			'Player ship destroyed. Dramatic explosion with descending electronic warble. Longer than enemy death, more impactful.',
	},
	'sfx-boss-alarm': {
		description:
			'Boss incoming warning klaxon. Two-tone alarm siren, urgent and foreboding. Repeating alert pattern.',
	},
	'sfx-menu-select': {
		description:
			'Menu cursor movement. Subtle electronic tick or soft blip. Quick and unobtrusive UI feedback.',
	},
	'sfx-menu-confirm': {
		description:
			'Menu selection confirmed. Bright affirmative beep, slightly longer than menu-select. Positive UI confirmation.',
	},

	// --- Music ---
	'music-outer-rim': {
		description:
			'Electronic space shooter game soundtrack. Driving synthwave rhythm with pulsing bassline and atmospheric pads. Dark sci-fi mood with urgent energy. Suitable for intense arcade action in deep space. Loopable structure.',
	},
};

const TEMPLATES: Record<string, PromptTemplate> = {
	// --- Ships ---
	'ship-viper': {
		subject: 'Player fighter ship sprite sheet, 3 frames side by side horizontally',
		details:
			'Frame 1: banking left (slight left tilt). Frame 2: neutral centered. Frame 3: banking right (slight right tilt). Sleek angular viper-class fighter with blue-white engine glow. Each frame 64x64 pixels in a 192x64 sheet.',
	},

	// --- Enemies ---
	'enemy-drone': {
		subject: 'Small enemy drone sprite sheet, 2 frames side by side',
		details:
			'Simple circular drone with rotating antenna or blinking light between frames. Red-orange color scheme. Each frame 32x32 pixels in a 64x32 sheet.',
	},
	'enemy-weaver': {
		subject: 'Enemy weaver ship sprite sheet, 2 frames side by side',
		details:
			'Serpentine or insectoid enemy that weaves side to side. Frames show slight body undulation. Purple-green color scheme. Each frame 32x32 pixels in a 64x32 sheet.',
	},
	'enemy-bruiser': {
		subject: 'Heavy enemy bruiser sprite sheet, 2 frames side by side',
		details:
			'Large armored enemy, bulky and slow-looking. Frames show subtle shield pulse or armor plate shift. Dark red-gray color scheme. Each frame 48x48 pixels in a 96x48 sheet.',
	},
	'enemy-kamikaze': {
		subject: 'Kamikaze enemy sprite sheet, 2 frames side by side',
		details:
			'Fast aggressive enemy with visible engine trail. Frames show increasing engine intensity. Orange-yellow color scheme. Each frame 32x32 pixels in a 64x32 sheet.',
	},
	'enemy-zigzagger': {
		subject: 'Zigzagger enemy sprite sheet, 2 frames side by side',
		details:
			'Agile enemy with wing-like fins. Frames show alternating fin positions for zigzag motion. Teal-purple color scheme. Each frame 32x32 pixels in a 64x32 sheet.',
	},

	// --- Bosses ---
	'boss-iron-sentinel': {
		subject: 'Large boss sprite sheet, 2 frames side by side',
		details:
			'The Iron Sentinel — massive armored fortress-like boss. Frame 1: shields up, armor plates closed. Frame 2: weak point exposed, glowing core visible. Dark iron with red energy accents. Each frame 128x128 pixels in a 256x128 sheet.',
	},

	// --- Backgrounds ---
	'bg-starfield-sparse': {
		subject: 'Space background — sparse starfield',
		details:
			'Deep space with scattered distant stars. Very dark navy-black base. Few stars, emphasizing emptiness and scale. Subtle blue-purple nebula wisps in corners. 1536x1024 pixels.',
	},
	'bg-starfield-dense': {
		subject: 'Space background — dense starfield',
		details:
			'Rich starfield with many visible stars of varying brightness. Dark space base with more color variation. Faint nebula clouds. Busier than sparse but still dark enough for gameplay readability. 1536x1024 pixels.',
	},
	'bg-endless-void': {
		subject: 'Space background — endless void',
		details:
			'Ominous deep void with minimal stars. Near-black with subtle dark purple undertones. Occasional faint distant galaxy smudge. Feels infinite and threatening. 1536x1024 pixels.',
	},
};

export function buildPrompt(entry: AssetCatalogEntry): string {
	const template = entry.promptId ? TEMPLATES[entry.promptId] : undefined;
	if (!template) {
		throw new Error(`No prompt template for promptId: ${entry.promptId ?? entry.key}`);
	}

	const styleCategories: (
		| 'sprites'
		| 'backgrounds'
		| 'ships'
		| 'enemies'
		| 'bosses'
		| 'sfx'
		| 'music'
	)[] = [];

	if (entry.kind === 'sprite-sheet' || entry.kind === 'image') {
		if (entry.group === 'backgrounds') {
			styleCategories.push('backgrounds');
		} else {
			styleCategories.push('sprites');
		}
	}

	if (entry.group === 'ships') styleCategories.push('ships');
	if (entry.group === 'enemies') styleCategories.push('enemies');
	if (entry.group === 'bosses') styleCategories.push('bosses');

	const style = getStyleDirectives(...styleCategories);

	return `${template.subject}\n\n${template.details}\n\nStyle requirements: ${style}`;
}

/** Build an audio prompt for ElevenLabs SFX or music generation */
export function buildAudioPrompt(entry: AssetCatalogEntry): string {
	const template = entry.promptId ? AUDIO_TEMPLATES[entry.promptId] : undefined;
	if (!template) {
		throw new Error(`No audio prompt template for promptId: ${entry.promptId ?? entry.key}`);
	}

	if (entry.sourceMode === 'elevenlabs-sfx') {
		// ElevenLabs SFX has a 450-char limit — keep prompt concise
		return template.description;
	}

	// Music prompts can be longer — include style directives
	const styleCategory = entry.group === 'music' ? 'music' : 'sfx';
	const style = getStyleDirectives(styleCategory);
	return `${template.description}\n\nStyle: ${style}`;
}
