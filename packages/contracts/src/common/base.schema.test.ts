import { describe, expect, it } from 'vitest';
import {
	CombatFeedbackSchema,
	CooldownSchema,
	DropEntrySchema,
	DropTableSchema,
	DropTypeSchema,
	EntityIdSchema,
	HitboxSchema,
	StatRangeSchema,
	Vec2Schema,
} from './base.schema';

// ---------------------------------------------------------------------------
// EntityId
// ---------------------------------------------------------------------------

describe('EntityIdSchema', () => {
	it('accepts a valid lowercase id', () => {
		expect(EntityIdSchema.parse('my-entity_01')).toBe('my-entity_01');
	});

	it('accepts a single lowercase letter', () => {
		expect(EntityIdSchema.parse('a')).toBe('a');
	});

	it('rejects an empty string', () => {
		expect(() => EntityIdSchema.parse('')).toThrow();
	});

	it('rejects ids starting with a digit', () => {
		expect(() => EntityIdSchema.parse('1bad')).toThrow();
	});

	it('rejects ids with uppercase letters', () => {
		expect(() => EntityIdSchema.parse('Bad-Id')).toThrow();
	});

	it('rejects ids longer than 64 characters', () => {
		expect(() => EntityIdSchema.parse('a'.repeat(65))).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Vec2
// ---------------------------------------------------------------------------

describe('Vec2Schema', () => {
	it('parses a valid vector', () => {
		expect(Vec2Schema.parse({ x: 1, y: -2 })).toEqual({ x: 1, y: -2 });
	});

	it('accepts zero values', () => {
		expect(Vec2Schema.parse({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
	});

	it('rejects missing x', () => {
		expect(() => Vec2Schema.parse({ y: 1 })).toThrow();
	});

	it('rejects missing y', () => {
		expect(() => Vec2Schema.parse({ x: 1 })).toThrow();
	});

	it('rejects non-numeric values', () => {
		expect(() => Vec2Schema.parse({ x: 'one', y: 0 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Hitbox
// ---------------------------------------------------------------------------

describe('HitboxSchema', () => {
	it('parses minimal hitbox — offset defaults to (0,0)', () => {
		const result = HitboxSchema.parse({ width: 32, height: 16 });
		expect(result).toEqual({ width: 32, height: 16, offset: { x: 0, y: 0 } });
	});

	it('parses hitbox with explicit offset', () => {
		const result = HitboxSchema.parse({ width: 10, height: 10, offset: { x: 2, y: -1 } });
		expect(result).toEqual(expect.objectContaining({ offset: { x: 2, y: -1 } }));
	});

	it('rejects zero width', () => {
		expect(() => HitboxSchema.parse({ width: 0, height: 10 })).toThrow();
	});

	it('rejects negative height', () => {
		expect(() => HitboxSchema.parse({ width: 10, height: -1 })).toThrow();
	});

	it('rejects missing dimensions', () => {
		expect(() => HitboxSchema.parse({})).toThrow();
	});
});

// ---------------------------------------------------------------------------
// StatRange
// ---------------------------------------------------------------------------

describe('StatRangeSchema', () => {
	it('parses a valid range where base is between min and max', () => {
		expect(StatRangeSchema.parse({ base: 5, min: 1, max: 10 })).toEqual({
			base: 5,
			min: 1,
			max: 10,
		});
	});

	it('accepts base equal to min', () => {
		expect(StatRangeSchema.parse({ base: 1, min: 1, max: 10 })).toEqual(
			expect.objectContaining({ base: 1 }),
		);
	});

	it('accepts base equal to max', () => {
		expect(StatRangeSchema.parse({ base: 10, min: 1, max: 10 })).toEqual(
			expect.objectContaining({ base: 10 }),
		);
	});

	it('rejects base below min', () => {
		expect(() => StatRangeSchema.parse({ base: 0, min: 1, max: 10 })).toThrow();
	});

	it('rejects base above max', () => {
		expect(() => StatRangeSchema.parse({ base: 11, min: 1, max: 10 })).toThrow();
	});

	it('rejects missing fields', () => {
		expect(() => StatRangeSchema.parse({ base: 5 })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// DropType
// ---------------------------------------------------------------------------

describe('DropTypeSchema', () => {
	it('accepts all valid drop types', () => {
		expect(DropTypeSchema.parse('currency')).toBe('currency');
		expect(DropTypeSchema.parse('upgrade-token')).toBe('upgrade-token');
		expect(DropTypeSchema.parse('weapon-recipe')).toBe('weapon-recipe');
	});

	it('rejects an unknown drop type', () => {
		expect(() => DropTypeSchema.parse('gold')).toThrow();
	});
});

// ---------------------------------------------------------------------------
// DropEntry
// ---------------------------------------------------------------------------

describe('DropEntrySchema', () => {
	it('parses minimal drop entry with defaults applied', () => {
		const result = DropEntrySchema.parse({ type: 'currency', chance: 0.5 });
		expect(result).toEqual(
			expect.objectContaining({
				type: 'currency',
				chance: 0.5,
				quantity: 1,
				pityBucketContribution: 1,
			}),
		);
	});

	it('parses full drop entry with all fields', () => {
		const result = DropEntrySchema.parse({
			type: 'weapon-recipe',
			chance: 0.1,
			quantity: 1,
			itemId: 'recipe-missile',
			pityBucketContribution: 0.5,
		});
		expect(result).toEqual(
			expect.objectContaining({
				type: 'weapon-recipe',
				itemId: 'recipe-missile',
				pityBucketContribution: 0.5,
			}),
		);
	});

	it('rejects chance above 1', () => {
		expect(() => DropEntrySchema.parse({ type: 'currency', chance: 1.1 })).toThrow();
	});

	it('rejects chance below 0', () => {
		expect(() => DropEntrySchema.parse({ type: 'currency', chance: -0.1 })).toThrow();
	});

	it('rejects non-integer quantity', () => {
		expect(() => DropEntrySchema.parse({ type: 'currency', chance: 0.5, quantity: 1.5 })).toThrow();
	});

	it('rejects zero quantity', () => {
		expect(() => DropEntrySchema.parse({ type: 'currency', chance: 0.5, quantity: 0 })).toThrow();
	});

	it('rejects missing required fields', () => {
		expect(() => DropEntrySchema.parse({ type: 'currency' })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// DropTable
// ---------------------------------------------------------------------------

describe('DropTableSchema', () => {
	it('defaults to empty array when not provided', () => {
		expect(DropTableSchema.parse(undefined)).toEqual([]);
	});

	it('parses an array of valid drop entries', () => {
		const result = DropTableSchema.parse([
			{ type: 'currency', chance: 0.8 },
			{ type: 'upgrade-token', chance: 0.2 },
		]);
		expect(result).toHaveLength(2);
	});

	it('rejects an array with invalid entries', () => {
		expect(() => DropTableSchema.parse([{ type: 'currency', chance: 2 }])).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Cooldown
// ---------------------------------------------------------------------------

describe('CooldownSchema', () => {
	it('parses minimal cooldown — startOn defaults to fire', () => {
		const result = CooldownSchema.parse({ duration: 1.5 });
		expect(result).toEqual({ duration: 1.5, startOn: 'fire' });
	});

	it('parses cooldown with startOn expiry', () => {
		const result = CooldownSchema.parse({ duration: 2, startOn: 'expiry' });
		expect(result).toEqual(expect.objectContaining({ startOn: 'expiry' }));
	});

	it('rejects zero duration', () => {
		expect(() => CooldownSchema.parse({ duration: 0 })).toThrow();
	});

	it('rejects negative duration', () => {
		expect(() => CooldownSchema.parse({ duration: -1 })).toThrow();
	});

	it('rejects invalid startOn value', () => {
		expect(() => CooldownSchema.parse({ duration: 1, startOn: 'reload' })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// CombatFeedback
// ---------------------------------------------------------------------------

describe('CombatFeedbackSchema', () => {
	it('parses empty object — all fields default', () => {
		const result = CombatFeedbackSchema.parse({});
		expect(result).toEqual({
			hitFlashMs: 80,
			hitPauseMs: 30,
			screenShake: 0,
			screenShakeMs: 100,
			deathBurstMs: 150,
			spawnInMs: 200,
		});
	});

	it('parses with all fields explicitly set', () => {
		const input = {
			hitFlashMs: 100,
			hitPauseMs: 50,
			screenShake: 0.5,
			screenShakeMs: 200,
			deathBurstMs: 300,
			spawnInMs: 0,
		};
		expect(CombatFeedbackSchema.parse(input)).toEqual(input);
	});

	it('accepts zero for all duration fields', () => {
		const result = CombatFeedbackSchema.parse({
			hitFlashMs: 0,
			hitPauseMs: 0,
			screenShake: 0,
			screenShakeMs: 0,
			deathBurstMs: 0,
			spawnInMs: 0,
		});
		expect(result.hitFlashMs).toBe(0);
	});

	it('rejects negative hitFlashMs', () => {
		expect(() => CombatFeedbackSchema.parse({ hitFlashMs: -1 })).toThrow();
	});

	it('rejects non-integer hitPauseMs', () => {
		expect(() => CombatFeedbackSchema.parse({ hitPauseMs: 30.5 })).toThrow();
	});

	it('rejects negative screenShake', () => {
		expect(() => CombatFeedbackSchema.parse({ screenShake: -0.1 })).toThrow();
	});
});
