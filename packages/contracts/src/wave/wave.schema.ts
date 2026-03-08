import { z } from 'zod';
import { EntityIdSchema, Vec2Schema } from '../common/base.schema';

// ---------------------------------------------------------------------------
// Game mode
// ---------------------------------------------------------------------------

export const GameModeSchema = z.enum(['campaign', 'endless']);
export type GameMode = z.infer<typeof GameModeSchema>;

// ---------------------------------------------------------------------------
// Spawn entry — one group of enemies within a wave
// ---------------------------------------------------------------------------

export const FormationSchema = z.enum([
	/** Single file column */
	'column',
	/** Horizontal line */
	'row',
	/** V-shaped formation */
	'v-formation',
	/** Random scatter within bounds */
	'scatter',
	/** Grid block */
	'grid',
]);
export type Formation = z.infer<typeof FormationSchema>;

export const SpawnEntrySchema = z.object({
	/** Which enemy to spawn */
	enemyId: EntityIdSchema,
	/** How many of this enemy */
	count: z.number().int().positive(),
	/** Formation pattern */
	formation: FormationSchema.default('scatter'),
	/** Seconds after wave start to begin spawning this group */
	delaySeconds: z.number().nonnegative().default(0),
	/** Seconds between individual spawns within this group */
	spawnInterval: z.number().positive().default(0.5),
	/** Entry edge or position */
	entryPosition: Vec2Schema.optional(),
});
export type SpawnEntry = z.infer<typeof SpawnEntrySchema>;

// ---------------------------------------------------------------------------
// Wave — a single combat encounter within a level
// ---------------------------------------------------------------------------

export const WaveSchema = z.object({
	/** Wave index within the level (0-based) */
	index: z.number().int().nonnegative(),
	/** Enemy groups in this wave */
	spawns: z.array(SpawnEntrySchema).min(1),
	/** Seconds of calm before this wave begins (after previous wave cleared) */
	predelaySeconds: z.number().nonnegative().default(1),
});
export type Wave = z.infer<typeof WaveSchema>;

// ---------------------------------------------------------------------------
// Level — a sequence of waves within a stage
// ---------------------------------------------------------------------------

export const LevelSchema = z
	.object({
		id: EntityIdSchema,
		/** Display name shown to the player */
		name: z.string().min(1).max(64),
		/** Level index within the stage (0-based) */
		index: z.number().int().nonnegative(),
		/** Ordered waves */
		waves: z.array(WaveSchema).min(1),
		/** Background tilemap/parallax key */
		backgroundKey: z.string().min(1).default('default-bg'),
		/** Background scroll speed multiplier */
		scrollSpeed: z.number().positive().default(1),
	})
	.refine((l) => l.waves.every((w, i) => w.index === i), {
		message: 'Wave indices must be sequential starting at 0',
	});
export type Level = z.infer<typeof LevelSchema>;

// ---------------------------------------------------------------------------
// Stage — a themed group of levels ending with a boss
// ---------------------------------------------------------------------------

export const StageSchema = z
	.object({
		id: EntityIdSchema,
		name: z.string().min(1).max(64),
		description: z.string().max(256).default(''),
		/** Stage index in the campaign (0-based) */
		index: z.number().int().nonnegative(),
		/** Ordered levels within this stage */
		levels: z.array(LevelSchema).min(1),
		/** Boss fight after all levels are cleared */
		bossId: EntityIdSchema,
		/** Music track key for this stage */
		musicKey: z.string().min(1).default('default-music'),
		/** Currency reward for clearing the stage (in addition to per-kill drops) */
		clearReward: z.number().int().nonnegative().default(0),
		/** Experience reward for clearing the stage */
		experienceReward: z.number().int().nonnegative().default(0),
	})
	.refine((s) => s.levels.every((l, i) => l.index === i), {
		message: 'Level indices must be sequential starting at 0',
	});
export type Stage = z.infer<typeof StageSchema>;

// ---------------------------------------------------------------------------
// Endless mode configuration
// ---------------------------------------------------------------------------

export const EndlessScalingSchema = z.object({
	/** Health multiplier per wave (compounding) */
	healthMultiplier: z.number().min(1).default(1.05),
	/** Speed multiplier per wave (compounding, capped) */
	speedMultiplier: z.number().min(1).default(1.02),
	/** Max speed multiplier cap */
	speedCap: z.number().positive().default(2.0),
	/** Wave interval at which a new enemy type is introduced */
	newTypeEveryNWaves: z.number().int().positive().default(5),
	/** Wave interval at which enemy count increases by 1 */
	densityIncreaseEveryNWaves: z.number().int().positive().default(3),
	/** Wave interval for mini-boss appearance */
	miniBossEveryNWaves: z.number().int().positive().default(10),
});
export type EndlessScaling = z.infer<typeof EndlessScalingSchema>;

export const EndlessModeConfigSchema = z.object({
	/** Enemy pool — which enemies can appear (unlocked progressively) */
	enemyPool: z.array(EntityIdSchema).min(1),
	/** Bosses that appear as mini-bosses during endless */
	miniBossPool: z.array(EntityIdSchema).default([]),
	/** Scaling rules */
	scaling: EndlessScalingSchema,
	/** Starting wave difficulty (maps to campaign-equivalent) */
	startingDifficulty: z.number().int().positive().default(1),
	/** Background key for endless mode */
	backgroundKey: z.string().min(1).default('bg-endless-void'),
});
export type EndlessModeConfig = z.infer<typeof EndlessModeConfigSchema>;

// ---------------------------------------------------------------------------
// Campaign definition — the full ordered set of stages
// ---------------------------------------------------------------------------

export const CampaignSchema = z
	.object({
		id: EntityIdSchema,
		name: z.string().min(1).max(64),
		stages: z.array(StageSchema).min(1),
	})
	.refine((c) => c.stages.every((s, i) => s.index === i), {
		message: 'Stage indices must be sequential starting at 0',
	});
export type Campaign = z.infer<typeof CampaignSchema>;
