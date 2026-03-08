import { z } from 'zod';
import { EntityIdSchema } from '../common/base.schema';
import { PlayerEconomyStateSchema } from '../economy/economy.schema';
import { GameSettingsSchema } from '../settings/settings.schema';
import { PlayerShipStateSchema } from '../ship/ship.schema';
import { GameModeSchema } from '../wave/wave.schema';
import { PlayerWeaponStateSchema } from '../weapon/weapon.schema';

// ---------------------------------------------------------------------------
// Current save version — bump on every schema change
// ---------------------------------------------------------------------------

export const SAVE_VERSION = 1;

// ---------------------------------------------------------------------------
// Unlock registry — what the player has permanently unlocked
// ---------------------------------------------------------------------------

export const UnlockTypeSchema = z.enum([
	'ship',
	'weapon',
	'weapon-recipe',
	'secondary-weapon',
	'cosmetic',
]);
export type UnlockType = z.infer<typeof UnlockTypeSchema>;

export const UnlockEntrySchema = z.object({
	type: UnlockTypeSchema,
	itemId: EntityIdSchema,
	/** ISO timestamp when unlocked */
	unlockedAt: z.string().datetime(),
});
export type UnlockEntry = z.infer<typeof UnlockEntrySchema>;

// ---------------------------------------------------------------------------
// Campaign progress — per-stage tracking
// ---------------------------------------------------------------------------

export const StageProgressSchema = z.object({
	stageId: EntityIdSchema,
	/** Whether the stage (including boss) has been cleared */
	cleared: z.boolean().default(false),
	/** Highest level index reached within this stage (0-based) */
	highestLevelReached: z.number().int().nonnegative().default(0),
	/** Number of times this stage has been completed */
	clearCount: z.number().int().nonnegative().default(0),
});
export type StageProgress = z.infer<typeof StageProgressSchema>;

// ---------------------------------------------------------------------------
// Endless mode progress
// ---------------------------------------------------------------------------

export const EndlessProgressSchema = z.object({
	/** Highest wave reached in endless mode */
	highestWave: z.number().int().nonnegative().default(0),
	/** Total kills in endless mode across all runs */
	totalKills: z.number().int().nonnegative().default(0),
});
export type EndlessProgress = z.infer<typeof EndlessProgressSchema>;

// ---------------------------------------------------------------------------
// Run statistics — stats for the most recent run (reset each run)
// ---------------------------------------------------------------------------

export const RunStatsSchema = z.object({
	kills: z.number().int().nonnegative().default(0),
	/** Highest combo achieved in this run */
	bestCombo: z.number().int().nonnegative().default(0),
	/** Stages survived (for score calculation) */
	stagesSurvived: z.number().int().nonnegative().default(0),
	/** Total score this run */
	score: z.number().int().nonnegative().default(0),
	/** Run duration in seconds */
	durationSeconds: z.number().nonnegative().default(0),
});
export type RunStats = z.infer<typeof RunStatsSchema>;

// ---------------------------------------------------------------------------
// Lifetime statistics
// ---------------------------------------------------------------------------

export const LifetimeStatsSchema = z.object({
	totalKills: z.number().int().nonnegative().default(0),
	totalDeaths: z.number().int().nonnegative().default(0),
	totalRuns: z.number().int().nonnegative().default(0),
	totalPlayTimeSeconds: z.number().nonnegative().default(0),
	bestRunScore: z.number().int().nonnegative().default(0),
	/** Stage ID + level index of the furthest point reached in campaign */
	furthestStageId: EntityIdSchema.optional(),
	furthestLevelIndex: z.number().int().nonnegative().default(0),
});
export type LifetimeStats = z.infer<typeof LifetimeStatsSchema>;

// ---------------------------------------------------------------------------
// Save game — the top-level persisted document
// ---------------------------------------------------------------------------

export const SaveGameSchema = z.object({
	/** Schema version — MANDATORY, never remove */
	version: z.number().int().positive(),
	/** ISO timestamp of last save */
	savedAt: z.string().datetime(),
	/** Player display name */
	playerName: z.string().min(1).max(32).default('Pilot'),

	// --- Progression ---
	economy: PlayerEconomyStateSchema,
	unlocks: z.array(UnlockEntrySchema).default([]),
	stageProgress: z.array(StageProgressSchema).default([]),
	endlessProgress: EndlessProgressSchema.default(() => EndlessProgressSchema.parse({})),
	lifetimeStats: LifetimeStatsSchema.default(() => LifetimeStatsSchema.parse({})),

	// --- Current loadout (persists between runs) ---
	activeShip: PlayerShipStateSchema.optional(),
	activeWeapon: PlayerWeaponStateSchema.optional(),
	/** Currently held weapon recipes (not yet crafted) */
	ownedRecipes: z.array(EntityIdSchema).default([]),

	// --- Checkpoint: where to resume ---
	/** If the player quit or died, which stage to restart from */
	checkpointStageId: EntityIdSchema.optional(),
	/** Game mode of the last session */
	lastGameMode: GameModeSchema.default('campaign'),

	// --- Settings are saved alongside game state ---
	settings: GameSettingsSchema,
});
export type SaveGame = z.infer<typeof SaveGameSchema>;

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------

/**
 * Migrate a raw save blob to the current version.
 * Add a case for each version bump.
 */
export function migrateSave(raw: unknown): SaveGame {
	if (typeof raw !== 'object' || raw === null || !('version' in raw)) {
		throw new Error('Invalid save data: missing version field');
	}

	const data = raw as Record<string, unknown>;

	// --- Migration chain ---
	// if ((data.version as number) < 2) {
	//   data = migrateV1toV2(data);
	// }

	// Validate against current schema
	return SaveGameSchema.parse({ ...data, version: SAVE_VERSION });
}

/**
 * Create a fresh save game with all defaults.
 */
export function createNewSave(playerName?: string): SaveGame {
	return SaveGameSchema.parse({
		version: SAVE_VERSION,
		savedAt: new Date().toISOString(),
		playerName: playerName ?? 'Pilot',
		economy: {},
		settings: {},
	});
}
