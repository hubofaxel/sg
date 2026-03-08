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

	// --- Phase 8 ---
	'sfx-stage-clear': {
		description:
			'Arcade victory stinger, bright synth arpeggio rising to a crisp resolved chord, clean retro-futuristic tone, short celebratory finish, no vocals, no drums, no crowd, 2.0 seconds.',
	},

	// --- Phase 10 ---
	'sfx-low-health': {
		description:
			'Urgent low-health warning pulse, synthetic heartbeat-like thump with focused midrange beep, tense and readable, minimal tail, designed to repeat without fatigue, not melodic, not harsh, 0.5 seconds.',
	},

	// --- Phase 12 ---
	'sfx-telegraph': {
		description:
			'Brief enemy attack telegraph chirp, sharp bright synthetic warning ping, fast attack, clean futuristic tone, slight pitch rise, minimal reverb, highly readable over gameplay audio, 0.5 seconds.',
	},

	// --- Music ---
	'music-boss': {
		description:
			'Aggressive synthwave boss battle track, instrumental only, 146 BPM, E minor, driving analog bass pulse, gated snares, sharp arpeggiated synths, tense rising energy, dark heroic tone, arcade shooter final boss, 75 seconds.',
	},
	'music-outer-rim': {
		description:
			'Electronic space shooter game soundtrack. Driving synthwave rhythm with pulsing bassline and atmospheric pads. Dark sci-fi mood with urgent energy. Suitable for intense arcade action in deep space. Loopable structure.',
	},
	'default-music': {
		description:
			'Ambient space background music. Gentle synthesizer pads with subtle rhythmic pulse. Low-energy atmospheric sci-fi mood. Works as generic fallback for any game stage. Loopable structure, not distracting.',
	},
};

const TEMPLATES: Record<string, PromptTemplate> = {
	// --- Ships ---
	'ship-viper': {
		subject: 'Player fighter ship sprite sheet, 3 frames side by side horizontally',
		details:
			'Frame 1: banking left (slight left tilt). Frame 2: neutral centered. Frame 3: banking right (slight right tilt). Sleek angular viper-class starfighter with a narrow nose, swept-back delta wings, and a bright cyan-blue engine exhaust glow. Cockpit canopy has a subtle green-tinted visor. Hull is silver-white with electric blue racing stripes. Fun, heroic, playful arcade spaceship — not realistic military. Each frame 64x64 pixels in a 192x64 sheet.',
	},

	// --- Enemies ---
	'enemy-drone': {
		subject: 'Small alien drone sprite sheet, 2 frames side by side',
		details:
			'Round saucer-shaped alien drone with a single glowing red eye in the center. Small spinning antenna ring around the body. Frame 1: eye bright, antenna at position A. Frame 2: eye dim, antenna rotated to position B. Red-orange hull with dark metallic trim. Cute but menacing — like an angry little robot. Each frame 48x48 pixels in a 96x48 sheet.',
	},
	'enemy-weaver': {
		subject: 'Alien weaver creature sprite sheet, 2 frames side by side',
		details:
			'Serpentine insectoid alien with segmented body and translucent wing-membranes. Four small glowing eyes. Frame 1: body curved left, wings spread. Frame 2: body curved right, wings tucked. Luminous purple body with acid-green wing highlights and bioluminescent spots. Organic and creepy but charming pixel art. Each frame 48x48 pixels in a 96x48 sheet.',
	},
	'enemy-bruiser': {
		subject: 'Heavy armored enemy ship sprite sheet, 2 frames side by side',
		details:
			'Chunky heavily-armored battlecruiser with layered plate armor and twin forward cannons. Wide and imposing silhouette. Frame 1: armor plates sealed, shield generators glowing. Frame 2: front plates slightly open, revealing orange energy core. Dark gunmetal gray with crimson red energy accents and glowing vents. Looks like a flying tank. Each frame 64x64 pixels in a 128x64 sheet.',
	},
	'enemy-kamikaze': {
		subject: 'Kamikaze rocket enemy sprite sheet, 2 frames side by side',
		details:
			'Sleek missile-shaped enemy with a pointed nose cone and oversized rear thruster. Fins swept back for speed. Frame 1: thruster at normal intensity with small flame. Frame 2: thruster at maximum burn with large bright flame trail. Hot orange body fading to yellow at the nose, with white-hot engine glow. Looks fast and reckless. Each frame 48x48 pixels in a 96x48 sheet.',
	},
	'enemy-zigzagger': {
		subject: 'Zigzag fighter enemy sprite sheet, 2 frames side by side',
		details:
			'Agile diamond-shaped fighter with articulated wing-fins that tilt for maneuvering. Two small thrusters on the rear. Frame 1: left fins extended, right fins tucked (banking right). Frame 2: right fins extended, left fins tucked (banking left). Teal body with purple energy lines along the wing edges and a bright magenta cockpit gem. Nimble and tricky-looking. Each frame 48x48 pixels in a 96x48 sheet.',
	},

	// --- Bosses ---
	'boss-iron-sentinel': {
		subject: 'Large boss ship sprite sheet, 2 frames side by side',
		details:
			'The Iron Sentinel — massive armored space fortress with symmetrical design, heavy plating, multiple gun turrets along the wings, and a central command bridge. Frame 1: shields up, all armor plates locked, turrets retracted — looks impenetrable. Frame 2: armor plates split open revealing a glowing volatile red energy core (the weak point), turrets deployed. Dark iron-gray hull with crimson red energy veins and gold accent rivets. Intimidating but detailed pixel art. Each frame 128x128 pixels in a 256x128 sheet.',
	},

	// --- Effects ---
	'sprite-telegraph': {
		subject: 'Warning marker sprite sheet, 2 frames side by side',
		details:
			'Diamond-shaped enemy attack telegraph indicator. Bright warning signal that appears before enemy attacks land. Frame 1: bright state — vivid hot-red diamond outline with glowing white-yellow center, high visibility. Frame 2: dim state — same shape but darkened to deep red with faint inner glow, low visibility. Clean geometric shape, no organic detail, reads as a pure warning signal. Each frame 32x32 pixels in a 64x32 sheet.',
	},

	// --- Backgrounds ---
	'bg-starfield-sparse': {
		subject: 'Space background — sparse starfield',
		details:
			'Deep space with scattered distant stars. Very dark navy-black base. No more than 15-20 individual tiny white stars. Maximum emptiness. Lonely desolate frontier. Subtle blue-purple nebula wisps in corners. 1536x1024 pixels.',
	},
	'bg-starfield-dense': {
		subject: 'Space background — dense starfield',
		details:
			'Rich starfield with at least 100+ stars of varying brightness. Dark space base with more color variation. Faint milky way band across one corner. Feels populated and alive. Busier than sparse but still dark enough for gameplay readability. 1536x1024 pixels.',
	},
	'bg-endless-void': {
		subject: 'Space background — endless void',
		details:
			'Almost completely black with deep purple-black gradient. Maximum 5 barely-visible stars. No nebula. Pure oppressive darkness. Feels infinite and threatening. 1536x1024 pixels.',
	},
};

export function buildPrompt(entry: AssetCatalogEntry): string {
	const template = entry.promptId ? TEMPLATES[entry.promptId] : undefined;
	if (!template) {
		throw new Error(`No prompt template for promptId: ${entry.promptId ?? entry.key}`);
	}

	const styleCategories: (keyof typeof import('./style-bible.js').STYLE_BIBLE)[] = [];

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
	if (entry.group === 'effects' || entry.group === 'projectiles') styleCategories.push('effects');

	const style = getStyleDirectives(...styleCategories);

	// Add scale-awareness for sprite sheets
	let scaleHint = '';
	if (entry.frameWidth) {
		const size = Math.max(entry.frameWidth, entry.frameHeight ?? entry.frameWidth);
		if (size <= 32) {
			scaleHint =
				' Design this to read clearly at approximately 32x32 in-game scale. Use strong silhouette first, then modest internal breakup.';
		} else if (size <= 48) {
			scaleHint =
				' Design this to read clearly at approximately 48x48 in-game scale. Use strong silhouette with readable internal structure.';
		} else if (size >= 64) {
			scaleHint = ` Design this to read clearly at approximately ${size}x${size} in-game scale. Use layered shapes, secondary breakup, and richer internal pixel structure while keeping the silhouette strong.`;
		}
	}

	return `${template.subject}\n\n${template.details}\n\nStyle requirements: ${style}${scaleHint}`;
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
