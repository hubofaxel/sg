import { describe, expect, it } from 'vitest';
import {
	CampaignSchema,
	EndlessModeConfigSchema,
	EndlessScalingSchema,
	FormationSchema,
	LevelSchema,
	SpawnEntrySchema,
	StageSchema,
	WaveSchema,
} from './wave.schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const minimalSpawn = {
	enemyId: 'grunt',
	count: 3,
};

const minimalWave = {
	index: 0,
	spawns: [minimalSpawn],
};

function makeWave(index: number): object {
	return { index, spawns: [minimalSpawn] };
}

function makeLevel(index: number, waveCount = 1): object {
	return {
		id: `level-${index}`,
		name: `Level ${index + 1}`,
		index,
		waves: Array.from({ length: waveCount }, (_, i) => makeWave(i)),
	};
}

function makeStage(index: number): object {
	return {
		id: `stage-${index}`,
		name: `Stage ${index + 1}`,
		index,
		levels: [makeLevel(0)],
		bossId: 'iron-sentinel',
	};
}

// ---------------------------------------------------------------------------
// Formation
// ---------------------------------------------------------------------------

describe('FormationSchema', () => {
	it('accepts all valid formations', () => {
		const formations = ['column', 'row', 'v-formation', 'scatter', 'grid'] as const;
		for (const f of formations) {
			expect(FormationSchema.parse(f)).toBe(f);
		}
	});

	it('rejects unknown formation', () => {
		expect(() => FormationSchema.parse('circle')).toThrow();
	});
});

// ---------------------------------------------------------------------------
// SpawnEntry
// ---------------------------------------------------------------------------

describe('SpawnEntrySchema', () => {
	it('parses minimal spawn entry with defaults', () => {
		const result = SpawnEntrySchema.parse(minimalSpawn);
		expect(result).toEqual(
			expect.objectContaining({
				enemyId: 'grunt',
				count: 3,
				formation: 'scatter',
				delaySeconds: 0,
				spawnInterval: 0.5,
			}),
		);
	});

	it('parses full spawn entry with all fields', () => {
		const result = SpawnEntrySchema.parse({
			enemyId: 'elite',
			count: 5,
			formation: 'v-formation',
			delaySeconds: 2,
			spawnInterval: 1.0,
			entryPosition: { x: 200, y: 0 },
		});
		expect(result).toEqual(
			expect.objectContaining({
				formation: 'v-formation',
				delaySeconds: 2,
				entryPosition: { x: 200, y: 0 },
			}),
		);
	});

	it('rejects zero count', () => {
		expect(() => SpawnEntrySchema.parse({ ...minimalSpawn, count: 0 })).toThrow();
	});

	it('rejects non-integer count', () => {
		expect(() => SpawnEntrySchema.parse({ ...minimalSpawn, count: 1.5 })).toThrow();
	});

	it('rejects negative delaySeconds', () => {
		expect(() => SpawnEntrySchema.parse({ ...minimalSpawn, delaySeconds: -1 })).toThrow();
	});

	it('rejects zero spawnInterval', () => {
		expect(() => SpawnEntrySchema.parse({ ...minimalSpawn, spawnInterval: 0 })).toThrow();
	});

	it('rejects missing enemyId', () => {
		expect(() => SpawnEntrySchema.parse({ count: 1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Wave
// ---------------------------------------------------------------------------

describe('WaveSchema', () => {
	it('parses minimal valid wave with defaults', () => {
		const result = WaveSchema.parse(minimalWave);
		expect(result).toEqual(
			expect.objectContaining({
				index: 0,
				predelaySeconds: 1,
			}),
		);
		expect(result.spawns).toHaveLength(1);
	});

	it('parses wave with explicit predelaySeconds', () => {
		const result = WaveSchema.parse({ ...minimalWave, predelaySeconds: 3 });
		expect(result.predelaySeconds).toBe(3);
	});

	it('rejects wave with empty spawns array', () => {
		expect(() => WaveSchema.parse({ index: 0, spawns: [] })).toThrow();
	});

	it('rejects negative predelaySeconds', () => {
		expect(() => WaveSchema.parse({ ...minimalWave, predelaySeconds: -1 })).toThrow();
	});

	it('rejects non-integer wave index', () => {
		expect(() => WaveSchema.parse({ ...minimalWave, index: 0.5 })).toThrow();
	});

	it('rejects missing spawns', () => {
		expect(() => WaveSchema.parse({ index: 0 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

describe('LevelSchema', () => {
	it('parses minimal valid level with defaults', () => {
		const result = LevelSchema.parse(makeLevel(0));
		expect(result).toEqual(
			expect.objectContaining({
				index: 0,
				backgroundKey: 'default-bg',
				scrollSpeed: 1,
			}),
		);
		expect(result.waves).toHaveLength(1);
	});

	it('parses level with multiple sequential waves', () => {
		const result = LevelSchema.parse(makeLevel(0, 3));
		expect(result.waves).toHaveLength(3);
		expect(result.waves.map((w) => w.index)).toEqual([0, 1, 2]);
	});

	it('rejects level with non-sequential wave indices', () => {
		const bad = {
			...makeLevel(0),
			waves: [makeWave(0), makeWave(2)],
		};
		expect(() => LevelSchema.parse(bad)).toThrow();
	});

	it('rejects level with empty waves array', () => {
		const bad = { ...makeLevel(0), waves: [] };
		expect(() => LevelSchema.parse(bad)).toThrow();
	});

	it('rejects level missing id', () => {
		const { id: _id, ...rest } = makeLevel(0) as Record<string, unknown>;
		expect(() => LevelSchema.parse(rest)).toThrow();
	});

	it('rejects level missing name', () => {
		const { name: _name, ...rest } = makeLevel(0) as Record<string, unknown>;
		expect(() => LevelSchema.parse(rest)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

describe('StageSchema', () => {
	it('parses minimal valid stage with defaults', () => {
		const result = StageSchema.parse(makeStage(0));
		expect(result).toEqual(
			expect.objectContaining({
				index: 0,
				bossId: 'iron-sentinel',
				musicKey: 'default-music',
				clearReward: 0,
				experienceReward: 0,
				description: '',
			}),
		);
		expect(result.levels).toHaveLength(1);
	});

	it('parses stage with multiple sequential levels', () => {
		const result = StageSchema.parse({
			...makeStage(0),
			levels: [makeLevel(0), makeLevel(1)],
		});
		expect(result.levels).toHaveLength(2);
		expect(result.levels.map((l) => l.index)).toEqual([0, 1]);
	});

	it('rejects stage with non-sequential level indices', () => {
		const bad = {
			...makeStage(0),
			levels: [makeLevel(0), makeLevel(2)],
		};
		expect(() => StageSchema.parse(bad)).toThrow();
	});

	it('rejects stage with empty levels array', () => {
		expect(() => StageSchema.parse({ ...makeStage(0), levels: [] })).toThrow();
	});

	it('rejects missing bossId', () => {
		const { bossId: _bid, ...rest } = makeStage(0) as Record<string, unknown>;
		expect(() => StageSchema.parse(rest)).toThrow();
	});

	it('rejects negative clearReward', () => {
		expect(() => StageSchema.parse({ ...makeStage(0), clearReward: -1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------

describe('CampaignSchema', () => {
	const minimalCampaign = {
		id: 'campaign-v1',
		name: 'Campaign',
		stages: [makeStage(0)],
	};

	it('parses minimal valid campaign', () => {
		const result = CampaignSchema.parse(minimalCampaign);
		expect(result).toEqual(
			expect.objectContaining({
				id: 'campaign-v1',
				name: 'Campaign',
			}),
		);
		expect(result.stages).toHaveLength(1);
	});

	it('parses campaign with multiple sequential stages', () => {
		const result = CampaignSchema.parse({
			...minimalCampaign,
			stages: [makeStage(0), makeStage(1), makeStage(2)],
		});
		expect(result.stages.map((s) => s.index)).toEqual([0, 1, 2]);
	});

	it('rejects campaign with non-sequential stage indices', () => {
		const bad = {
			...minimalCampaign,
			stages: [makeStage(0), makeStage(2)],
		};
		expect(() => CampaignSchema.parse(bad)).toThrow();
	});

	it('rejects campaign with empty stages array', () => {
		expect(() => CampaignSchema.parse({ ...minimalCampaign, stages: [] })).toThrow();
	});

	it('rejects missing campaign id', () => {
		const { id: _id, ...rest } = minimalCampaign as Record<string, unknown>;
		expect(() => CampaignSchema.parse(rest)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// EndlessModeConfig
// ---------------------------------------------------------------------------

describe('EndlessModeConfigSchema', () => {
	const minimalScaling = {};
	const minimalEndless = {
		enemyPool: ['grunt'],
		scaling: minimalScaling,
	};

	it('parses minimal endless config with all defaults', () => {
		const result = EndlessModeConfigSchema.parse(minimalEndless);
		expect(result).toEqual(
			expect.objectContaining({
				miniBossPool: [],
				startingDifficulty: 1,
				backgroundKey: 'bg-endless-void',
			}),
		);
		expect(result.enemyPool).toEqual(['grunt']);
	});

	it('parses endless config with all fields', () => {
		const result = EndlessModeConfigSchema.parse({
			enemyPool: ['grunt', 'elite'],
			miniBossPool: ['iron-sentinel'],
			scaling: {
				healthMultiplier: 1.1,
				speedMultiplier: 1.03,
				speedCap: 2.5,
				newTypeEveryNWaves: 8,
				densityIncreaseEveryNWaves: 4,
				miniBossEveryNWaves: 15,
			},
			startingDifficulty: 3,
			backgroundKey: 'bg-custom',
		});
		expect(result.enemyPool).toHaveLength(2);
		expect(result.miniBossPool).toHaveLength(1);
		expect(result.startingDifficulty).toBe(3);
	});

	it('rejects empty enemyPool', () => {
		expect(() => EndlessModeConfigSchema.parse({ ...minimalEndless, enemyPool: [] })).toThrow();
	});

	it('rejects zero startingDifficulty', () => {
		expect(() =>
			EndlessModeConfigSchema.parse({ ...minimalEndless, startingDifficulty: 0 }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// EndlessScaling
// ---------------------------------------------------------------------------

describe('EndlessScalingSchema', () => {
	it('parses empty object with all defaults', () => {
		const result = EndlessScalingSchema.parse({});
		expect(result).toEqual({
			healthMultiplier: 1.05,
			speedMultiplier: 1.02,
			speedCap: 2.0,
			newTypeEveryNWaves: 5,
			densityIncreaseEveryNWaves: 3,
			miniBossEveryNWaves: 10,
		});
	});

	it('rejects healthMultiplier below 1', () => {
		expect(() => EndlessScalingSchema.parse({ healthMultiplier: 0.9 })).toThrow();
	});

	it('rejects speedMultiplier below 1', () => {
		expect(() => EndlessScalingSchema.parse({ speedMultiplier: 0.5 })).toThrow();
	});

	it('rejects zero miniBossEveryNWaves', () => {
		expect(() => EndlessScalingSchema.parse({ miniBossEveryNWaves: 0 })).toThrow();
	});
});
