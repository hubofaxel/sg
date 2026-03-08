import { describe, expect, it } from 'vitest';
import {
	AttackTypeSchema,
	BossPhaseSchema,
	BossSchema,
	EnemySchema,
	MovementPatternSchema,
} from './enemy.schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const minimalHitbox = { width: 24, height: 24 };

const minimalEnemy = {
	id: 'grunt',
	name: 'Grunt',
	size: 'small',
	health: 10,
	speed: 50,
	movementPattern: 'linear',
	attackType: 'contact-only',
	hitbox: minimalHitbox,
	spriteKey: 'enemy-grunt',
	scoreValue: 100,
	drops: [],
} as const;

const minimalBossPhase = {
	phase: 0,
	healthThreshold: 1.0,
	movementPattern: 'strafe-hover',
	attackType: 'aimed-shot',
} as const;

const minimalBoss = {
	id: 'iron-sentinel',
	name: 'Iron Sentinel',
	size: 'boss',
	health: 1000,
	speed: 40,
	hitbox: { width: 80, height: 80 },
	spriteKey: 'boss-sentinel',
	phases: [minimalBossPhase],
	drops: [],
	scoreValue: 5000,
	entryPosition: { x: 400, y: -100 },
	anchorPosition: { x: 400, y: 150 },
} as const;

// ---------------------------------------------------------------------------
// MovementPattern
// ---------------------------------------------------------------------------

describe('MovementPatternSchema', () => {
	it('accepts all valid patterns', () => {
		const patterns = ['linear', 'sine-wave', 'zigzag', 'spiral', 'strafe-hover'] as const;
		for (const p of patterns) {
			expect(MovementPatternSchema.parse(p)).toBe(p);
		}
	});

	it('rejects unknown pattern', () => {
		expect(() => MovementPatternSchema.parse('charge')).toThrow();
	});
});

// ---------------------------------------------------------------------------
// AttackType
// ---------------------------------------------------------------------------

describe('AttackTypeSchema', () => {
	it('accepts all valid attack types', () => {
		const types = ['aimed-shot', 'spread-shot', 'ram', 'contact-only', 'beam'] as const;
		for (const t of types) {
			expect(AttackTypeSchema.parse(t)).toBe(t);
		}
	});

	it('rejects unknown attack type', () => {
		expect(() => AttackTypeSchema.parse('laser-burst')).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Enemy
// ---------------------------------------------------------------------------

describe('EnemySchema', () => {
	it('parses minimal valid enemy with defaults applied', () => {
		const result = EnemySchema.parse(minimalEnemy);
		expect(result).toEqual(
			expect.objectContaining({
				id: 'grunt',
				name: 'Grunt',
				size: 'small',
				health: 10,
				contactDamage: 1,
				description: '',
				drops: [],
			}),
		);
	});

	it('parses full enemy with all optional fields', () => {
		const result = EnemySchema.parse({
			...minimalEnemy,
			description: 'A fast basic enemy',
			contactDamage: 2,
			weaponType: 'basic-laser',
			projectileDamage: 5,
			fireInterval: 1.5,
			drops: [{ type: 'currency', chance: 0.6 }],
			combatFeedback: { screenShake: 0.2 },
		});
		expect(result).toEqual(
			expect.objectContaining({
				description: 'A fast basic enemy',
				weaponType: 'basic-laser',
				projectileDamage: 5,
				fireInterval: 1.5,
			}),
		);
		expect(result.drops).toHaveLength(1);
	});

	it('rejects missing id', () => {
		const { id: _id, ...rest } = minimalEnemy;
		expect(() => EnemySchema.parse(rest)).toThrow();
	});

	it('rejects missing name', () => {
		const { name: _name, ...rest } = minimalEnemy;
		expect(() => EnemySchema.parse(rest)).toThrow();
	});

	it('rejects missing size', () => {
		const { size: _size, ...rest } = minimalEnemy;
		expect(() => EnemySchema.parse(rest)).toThrow();
	});

	it('rejects zero health', () => {
		expect(() => EnemySchema.parse({ ...minimalEnemy, health: 0 })).toThrow();
	});

	it('rejects negative speed', () => {
		expect(() => EnemySchema.parse({ ...minimalEnemy, speed: -1 })).toThrow();
	});

	it('rejects invalid size value', () => {
		expect(() => EnemySchema.parse({ ...minimalEnemy, size: 'tiny' })).toThrow();
	});

	it('rejects invalid movement pattern', () => {
		expect(() => EnemySchema.parse({ ...minimalEnemy, movementPattern: 'teleport' })).toThrow();
	});

	it('rejects missing hitbox', () => {
		const { hitbox: _hitbox, ...rest } = minimalEnemy;
		expect(() => EnemySchema.parse(rest)).toThrow();
	});

	it('rejects missing scoreValue', () => {
		const { scoreValue: _sv, ...rest } = minimalEnemy;
		expect(() => EnemySchema.parse(rest)).toThrow();
	});

	it('rejects negative scoreValue', () => {
		expect(() => EnemySchema.parse({ ...minimalEnemy, scoreValue: -1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// BossPhase
// ---------------------------------------------------------------------------

describe('BossPhaseSchema', () => {
	it('parses minimal boss phase with defaults', () => {
		const result = BossPhaseSchema.parse(minimalBossPhase);
		expect(result).toEqual(
			expect.objectContaining({
				phase: 0,
				healthThreshold: 1.0,
				speedMultiplier: 1,
				minionSpawns: [],
			}),
		);
	});

	it('parses full boss phase with minion spawns', () => {
		const result = BossPhaseSchema.parse({
			...minimalBossPhase,
			phase: 1,
			healthThreshold: 0.5,
			speedMultiplier: 1.5,
			spriteFrame: 1,
			weaponType: 'spread-shot',
			projectileDamage: 15,
			fireInterval: 2.0,
			minionSpawns: [{ enemyId: 'grunt', interval: 5, maxConcurrent: 2 }],
		});
		expect(result).toEqual(
			expect.objectContaining({
				phase: 1,
				healthThreshold: 0.5,
				speedMultiplier: 1.5,
				spriteFrame: 1,
			}),
		);
		expect(result.minionSpawns).toHaveLength(1);
	});

	it('rejects healthThreshold above 1', () => {
		expect(() => BossPhaseSchema.parse({ ...minimalBossPhase, healthThreshold: 1.1 })).toThrow();
	});

	it('rejects healthThreshold below 0', () => {
		expect(() => BossPhaseSchema.parse({ ...minimalBossPhase, healthThreshold: -0.1 })).toThrow();
	});

	it('rejects non-integer phase index', () => {
		expect(() => BossPhaseSchema.parse({ ...minimalBossPhase, phase: 0.5 })).toThrow();
	});

	it('rejects negative speedMultiplier', () => {
		expect(() => BossPhaseSchema.parse({ ...minimalBossPhase, speedMultiplier: -1 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Boss
// ---------------------------------------------------------------------------

describe('BossSchema', () => {
	it('parses minimal valid boss with defaults applied', () => {
		const result = BossSchema.parse(minimalBoss);
		expect(result).toEqual(
			expect.objectContaining({
				id: 'iron-sentinel',
				size: 'boss',
				guaranteedDropOnDeath: false,
				description: '',
				drops: [],
			}),
		);
		expect(result.phases).toHaveLength(1);
	});

	it('parses full boss with drops, feedback, and guaranteed drop', () => {
		const result = BossSchema.parse({
			...minimalBoss,
			description: 'The first boss',
			drops: [{ type: 'weapon-recipe', chance: 1.0, itemId: 'recipe-missile' }],
			guaranteedDropOnDeath: true,
			combatFeedback: { screenShake: 1.0, deathBurstMs: 500 },
			phases: [
				{ ...minimalBossPhase, phase: 0, healthThreshold: 1.0 },
				{
					phase: 1,
					healthThreshold: 0.5,
					movementPattern: 'spiral',
					attackType: 'spread-shot',
					speedMultiplier: 1.3,
				},
			],
		});
		expect(result.guaranteedDropOnDeath).toBe(true);
		expect(result.phases).toHaveLength(2);
		expect(result.drops).toHaveLength(1);
	});

	it('rejects size other than boss', () => {
		expect(() => BossSchema.parse({ ...minimalBoss, size: 'large' })).toThrow();
	});

	it('rejects empty phases array', () => {
		expect(() => BossSchema.parse({ ...minimalBoss, phases: [] })).toThrow();
	});

	it('rejects missing entryPosition', () => {
		const { entryPosition: _ep, ...rest } = minimalBoss;
		expect(() => BossSchema.parse(rest)).toThrow();
	});

	it('rejects missing anchorPosition', () => {
		const { anchorPosition: _ap, ...rest } = minimalBoss;
		expect(() => BossSchema.parse(rest)).toThrow();
	});

	it('rejects zero health', () => {
		expect(() => BossSchema.parse({ ...minimalBoss, health: 0 })).toThrow();
	});

	it('rejects negative scoreValue', () => {
		expect(() => BossSchema.parse({ ...minimalBoss, scoreValue: -1 })).toThrow();
	});
});
