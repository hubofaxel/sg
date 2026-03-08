import { describe, expect, it } from 'vitest';
import {
	createNewSave,
	EndlessProgressSchema,
	LifetimeStatsSchema,
	migrateSave,
	RunStatsSchema,
	SAVE_VERSION,
	SaveGameSchema,
	StageProgressSchema,
	UnlockEntrySchema,
	UnlockTypeSchema,
} from './save.schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISO_NOW = '2024-06-01T12:00:00.000Z';

/** Minimal valid SaveGame input — only required fields */
const minimalSaveInput = {
	version: SAVE_VERSION,
	savedAt: ISO_NOW,
	economy: {},
	settings: {},
};

// ---------------------------------------------------------------------------
// SAVE_VERSION constant
// ---------------------------------------------------------------------------

describe('SAVE_VERSION', () => {
	it('is a positive integer', () => {
		expect(Number.isInteger(SAVE_VERSION)).toBe(true);
		expect(SAVE_VERSION).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// UnlockType
// ---------------------------------------------------------------------------

describe('UnlockTypeSchema', () => {
	it('accepts all valid unlock types', () => {
		const types = ['ship', 'weapon', 'weapon-recipe', 'secondary-weapon', 'cosmetic'] as const;
		for (const t of types) {
			expect(UnlockTypeSchema.parse(t)).toBe(t);
		}
	});

	it('rejects unknown unlock type', () => {
		expect(() => UnlockTypeSchema.parse('skin')).toThrow();
	});
});

// ---------------------------------------------------------------------------
// UnlockEntry
// ---------------------------------------------------------------------------

describe('UnlockEntrySchema', () => {
	it('parses a valid unlock entry', () => {
		const result = UnlockEntrySchema.parse({
			type: 'ship',
			itemId: 'viper',
			unlockedAt: ISO_NOW,
		});
		expect(result).toEqual({ type: 'ship', itemId: 'viper', unlockedAt: ISO_NOW });
	});

	it('rejects missing type', () => {
		expect(() => UnlockEntrySchema.parse({ itemId: 'viper', unlockedAt: ISO_NOW })).toThrow();
	});

	it('rejects non-ISO unlockedAt', () => {
		expect(() =>
			UnlockEntrySchema.parse({ type: 'ship', itemId: 'viper', unlockedAt: '2024-06-01' }),
		).toThrow();
	});

	it('rejects invalid itemId', () => {
		expect(() =>
			UnlockEntrySchema.parse({ type: 'ship', itemId: 'Invalid ID!', unlockedAt: ISO_NOW }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// StageProgress
// ---------------------------------------------------------------------------

describe('StageProgressSchema', () => {
	it('parses minimal stage progress with defaults', () => {
		const result = StageProgressSchema.parse({ stageId: 'stage-1' });
		expect(result).toEqual({
			stageId: 'stage-1',
			cleared: false,
			highestLevelReached: 0,
			clearCount: 0,
		});
	});

	it('parses stage progress with all fields', () => {
		const result = StageProgressSchema.parse({
			stageId: 'stage-1',
			cleared: true,
			highestLevelReached: 3,
			clearCount: 2,
		});
		expect(result.cleared).toBe(true);
		expect(result.clearCount).toBe(2);
	});

	it('rejects invalid stageId', () => {
		expect(() => StageProgressSchema.parse({ stageId: '' })).toThrow();
	});

	it('rejects negative highestLevelReached', () => {
		expect(() =>
			StageProgressSchema.parse({ stageId: 'stage-1', highestLevelReached: -1 }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// EndlessProgress
// ---------------------------------------------------------------------------

describe('EndlessProgressSchema', () => {
	it('parses empty object with defaults', () => {
		const result = EndlessProgressSchema.parse({});
		expect(result).toEqual({ highestWave: 0, totalKills: 0 });
	});

	it('parses with explicit values', () => {
		const result = EndlessProgressSchema.parse({ highestWave: 42, totalKills: 1337 });
		expect(result.highestWave).toBe(42);
		expect(result.totalKills).toBe(1337);
	});

	it('rejects negative highestWave', () => {
		expect(() => EndlessProgressSchema.parse({ highestWave: -1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// RunStats
// ---------------------------------------------------------------------------

describe('RunStatsSchema', () => {
	it('parses empty object with all defaults', () => {
		const result = RunStatsSchema.parse({});
		expect(result).toEqual({
			kills: 0,
			bestCombo: 0,
			stagesSurvived: 0,
			score: 0,
			durationSeconds: 0,
		});
	});

	it('parses with explicit values', () => {
		const result = RunStatsSchema.parse({
			kills: 50,
			bestCombo: 10,
			stagesSurvived: 2,
			score: 9500,
			durationSeconds: 180.5,
		});
		expect(result.kills).toBe(50);
		expect(result.durationSeconds).toBe(180.5);
	});

	it('rejects negative score', () => {
		expect(() => RunStatsSchema.parse({ score: -1 })).toThrow();
	});

	it('rejects negative durationSeconds', () => {
		expect(() => RunStatsSchema.parse({ durationSeconds: -0.1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// LifetimeStats
// ---------------------------------------------------------------------------

describe('LifetimeStatsSchema', () => {
	it('parses empty object with all defaults', () => {
		const result = LifetimeStatsSchema.parse({});
		expect(result).toEqual(
			expect.objectContaining({
				totalKills: 0,
				totalDeaths: 0,
				totalRuns: 0,
				totalPlayTimeSeconds: 0,
				bestRunScore: 0,
				furthestLevelIndex: 0,
			}),
		);
		expect(result.furthestStageId).toBeUndefined();
	});

	it('parses with optional furthestStageId', () => {
		const result = LifetimeStatsSchema.parse({ furthestStageId: 'stage-2' });
		expect(result.furthestStageId).toBe('stage-2');
	});

	it('rejects negative totalDeaths', () => {
		expect(() => LifetimeStatsSchema.parse({ totalDeaths: -1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// SaveGame
// ---------------------------------------------------------------------------

describe('SaveGameSchema', () => {
	it('version field is required and must be positive', () => {
		// Missing version
		expect(() => SaveGameSchema.parse({ savedAt: ISO_NOW, economy: {}, settings: {} })).toThrow();

		// Version 0 is invalid
		expect(() => SaveGameSchema.parse({ ...minimalSaveInput, version: 0 })).toThrow();
	});

	it('parses minimal save with all defaults applied', () => {
		const result = SaveGameSchema.parse(minimalSaveInput);
		expect(result).toEqual(
			expect.objectContaining({
				version: SAVE_VERSION,
				playerName: 'Pilot',
				lastGameMode: 'campaign',
				ownedRecipes: [],
				unlocks: [],
				stageProgress: [],
			}),
		);
		// Nested defaults
		expect(result.endlessProgress).toEqual({ highestWave: 0, totalKills: 0 });
		expect(result.lifetimeStats.totalRuns).toBe(0);
		// Economy defaults
		expect(result.economy.currency).toBe(0);
		expect(result.economy.playerLevel).toBe(1);
		// Settings defaults
		expect(result.settings.masterVolume).toBe(0.8);
		expect(result.settings.controlScheme).toBe('wasd');
	});

	it('parses a full save with all optional fields populated', () => {
		const result = SaveGameSchema.parse({
			...minimalSaveInput,
			playerName: 'Ace',
			lastGameMode: 'endless',
			unlocks: [{ type: 'ship', itemId: 'viper', unlockedAt: ISO_NOW }],
			stageProgress: [{ stageId: 'stage-1', cleared: true }],
			ownedRecipes: ['recipe-missile'],
			checkpointStageId: 'stage-2',
			activeShip: { shipId: 'viper' },
			activeWeapon: { weaponId: 'basic-laser', currentLevel: 2 },
			economy: { currency: 500 },
			settings: { masterVolume: 0.5 },
		});
		expect(result.playerName).toBe('Ace');
		expect(result.lastGameMode).toBe('endless');
		expect(result.unlocks).toHaveLength(1);
		expect(result.checkpointStageId).toBe('stage-2');
		expect(result.economy.currency).toBe(500);
	});

	it('rejects missing savedAt', () => {
		const { savedAt: _sa, ...rest } = minimalSaveInput;
		expect(() => SaveGameSchema.parse(rest)).toThrow();
	});

	it('rejects non-ISO savedAt', () => {
		expect(() => SaveGameSchema.parse({ ...minimalSaveInput, savedAt: '2024-06-01' })).toThrow();
	});

	it('rejects playerName exceeding 32 characters', () => {
		expect(() =>
			SaveGameSchema.parse({ ...minimalSaveInput, playerName: 'A'.repeat(33) }),
		).toThrow();
	});

	it('rejects invalid lastGameMode', () => {
		expect(() => SaveGameSchema.parse({ ...minimalSaveInput, lastGameMode: 'arcade' })).toThrow();
	});

	it('rejects invalid checkpointStageId format', () => {
		expect(() =>
			SaveGameSchema.parse({ ...minimalSaveInput, checkpointStageId: 'Stage 2!' }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// createNewSave
// ---------------------------------------------------------------------------

describe('createNewSave', () => {
	it('returns a valid SaveGame with SAVE_VERSION set', () => {
		const save = createNewSave();
		// Should not throw when reparsed
		expect(() => SaveGameSchema.parse(save)).not.toThrow();
		expect(save.version).toBe(SAVE_VERSION);
	});

	it('defaults playerName to Pilot when not provided', () => {
		expect(createNewSave().playerName).toBe('Pilot');
	});

	it('uses the provided playerName', () => {
		expect(createNewSave('Ace').playerName).toBe('Ace');
	});

	it('has a valid ISO savedAt timestamp', () => {
		const save = createNewSave();
		expect(() => new Date(save.savedAt).toISOString()).not.toThrow();
	});

	it('starts with zero currency and level 1', () => {
		const save = createNewSave();
		expect(save.economy.currency).toBe(0);
		expect(save.economy.playerLevel).toBe(1);
	});

	it('starts with no unlocks, no stage progress, no recipes', () => {
		const save = createNewSave();
		expect(save.unlocks).toEqual([]);
		expect(save.stageProgress).toEqual([]);
		expect(save.ownedRecipes).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// migrateSave
// ---------------------------------------------------------------------------

describe('migrateSave', () => {
	it('migrates and validates a valid save blob at current version', () => {
		const blob = { ...minimalSaveInput };
		const result = migrateSave(blob);
		expect(result.version).toBe(SAVE_VERSION);
	});

	it('throws for null input', () => {
		expect(() => migrateSave(null)).toThrow('Invalid save data: missing version field');
	});

	it('throws for non-object input', () => {
		expect(() => migrateSave('{"version":1}')).toThrow('Invalid save data: missing version field');
	});

	it('throws for object missing version field', () => {
		expect(() => migrateSave({ savedAt: ISO_NOW })).toThrow(
			'Invalid save data: missing version field',
		);
	});

	it('throws for save data that fails schema validation after migration', () => {
		// Has version but invalid data
		expect(() =>
			migrateSave({ version: 1, savedAt: 'not-a-date', economy: {}, settings: {} }),
		).toThrow();
	});
});
