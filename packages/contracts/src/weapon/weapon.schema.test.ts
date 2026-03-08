import { describe, expect, it } from 'vitest';
import {
	SecondaryWeaponSchema,
	WeaponLevelSchema,
	WeaponLevelStatsSchema,
	WeaponRecipeSchema,
	WeaponSchema,
	WeaponTypeSchema,
} from './weapon.schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const minimalHitbox = { width: 4, height: 8 };
const minimalCooldown = { duration: 0.5 };

function makeWeaponLevel(level: number): object {
	return {
		level,
		damage: 10 * level,
		projectileSpeed: 300,
		cooldown: minimalCooldown,
		projectileHitbox: minimalHitbox,
	};
}

function makeFiveLevels(): object[] {
	return [1, 2, 3, 4, 5].map(makeWeaponLevel);
}

const minimalWeapon = {
	id: 'basic-laser',
	name: 'Basic Laser',
	type: 'basic-laser',
	levels: makeFiveLevels(),
};

// ---------------------------------------------------------------------------
// WeaponType
// ---------------------------------------------------------------------------

describe('WeaponTypeSchema', () => {
	it('accepts all valid weapon types', () => {
		const types = ['basic-laser', 'spread-shot', 'missile', 'beam'] as const;
		for (const t of types) {
			expect(WeaponTypeSchema.parse(t)).toBe(t);
		}
	});

	it('rejects an unknown type', () => {
		expect(() => WeaponTypeSchema.parse('flamethrower')).toThrow();
	});
});

// ---------------------------------------------------------------------------
// WeaponLevel
// ---------------------------------------------------------------------------

describe('WeaponLevelSchema', () => {
	it('accepts levels 1 through 5', () => {
		for (const l of [1, 2, 3, 4, 5]) {
			expect(WeaponLevelSchema.parse(l)).toBe(l);
		}
	});

	it('rejects level 0', () => {
		expect(() => WeaponLevelSchema.parse(0)).toThrow();
	});

	it('rejects level 6', () => {
		expect(() => WeaponLevelSchema.parse(6)).toThrow();
	});

	it('rejects non-integer level', () => {
		expect(() => WeaponLevelSchema.parse(1.5)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// WeaponLevelStats
// ---------------------------------------------------------------------------

describe('WeaponLevelStatsSchema', () => {
	it('parses minimal level stats with defaults', () => {
		const result = WeaponLevelStatsSchema.parse(makeWeaponLevel(1));
		expect(result).toEqual(
			expect.objectContaining({
				level: 1,
				damage: 10,
				projectileCount: 1,
				spreadAngle: 0,
				upgradeCost: 0,
			}),
		);
	});

	it('parses full level stats with all optional fields', () => {
		const result = WeaponLevelStatsSchema.parse({
			...makeWeaponLevel(3),
			projectileCount: 3,
			spreadAngle: 30,
			beamWidth: 8,
			beamDuration: 1.5,
			homingStrength: 0.8,
			upgradeCost: 200,
			combatFeedback: { hitFlashMs: 100 },
		});
		expect(result).toEqual(
			expect.objectContaining({
				projectileCount: 3,
				spreadAngle: 30,
				beamWidth: 8,
				homingStrength: 0.8,
				upgradeCost: 200,
			}),
		);
	});

	it('rejects zero damage', () => {
		expect(() => WeaponLevelStatsSchema.parse({ ...makeWeaponLevel(1), damage: 0 })).toThrow();
	});

	it('rejects zero projectileSpeed', () => {
		expect(() =>
			WeaponLevelStatsSchema.parse({ ...makeWeaponLevel(1), projectileSpeed: 0 }),
		).toThrow();
	});

	it('rejects spreadAngle above 360', () => {
		expect(() =>
			WeaponLevelStatsSchema.parse({ ...makeWeaponLevel(1), spreadAngle: 361 }),
		).toThrow();
	});

	it('rejects homingStrength above 1', () => {
		expect(() =>
			WeaponLevelStatsSchema.parse({ ...makeWeaponLevel(1), homingStrength: 1.1 }),
		).toThrow();
	});

	it('rejects negative upgradeCost', () => {
		expect(() =>
			WeaponLevelStatsSchema.parse({ ...makeWeaponLevel(1), upgradeCost: -1 }),
		).toThrow();
	});
});

// ---------------------------------------------------------------------------
// Weapon
// ---------------------------------------------------------------------------

describe('WeaponSchema', () => {
	it('parses minimal valid weapon with sequential levels', () => {
		const result = WeaponSchema.parse(minimalWeapon);
		expect(result).toEqual(
			expect.objectContaining({
				id: 'basic-laser',
				name: 'Basic Laser',
				type: 'basic-laser',
				description: '',
			}),
		);
		expect(result.levels).toHaveLength(5);
	});

	it('parses weapon with description', () => {
		const result = WeaponSchema.parse({ ...minimalWeapon, description: 'A reliable laser.' });
		expect(result.description).toBe('A reliable laser.');
	});

	it('rejects fewer than 5 levels', () => {
		expect(() =>
			WeaponSchema.parse({ ...minimalWeapon, levels: makeFiveLevels().slice(0, 4) }),
		).toThrow();
	});

	it('rejects more than 5 levels', () => {
		expect(() =>
			WeaponSchema.parse({ ...minimalWeapon, levels: [...makeFiveLevels(), makeWeaponLevel(6)] }),
		).toThrow();
	});

	it('rejects non-sequential level indices', () => {
		const badLevels = makeFiveLevels().map((l, i) => ({ ...l, level: i + 2 }));
		expect(() => WeaponSchema.parse({ ...minimalWeapon, levels: badLevels })).toThrow();
	});

	it('rejects duplicate level indices', () => {
		const dupLevels = makeFiveLevels();
		(dupLevels[4] as Record<string, unknown>).level = 1;
		expect(() => WeaponSchema.parse({ ...minimalWeapon, levels: dupLevels })).toThrow();
	});

	it('rejects invalid weapon type', () => {
		expect(() => WeaponSchema.parse({ ...minimalWeapon, type: 'shotgun' })).toThrow();
	});

	it('rejects missing id', () => {
		const { id: _id, ...rest } = minimalWeapon;
		expect(() => WeaponSchema.parse(rest)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// SecondaryWeapon
// ---------------------------------------------------------------------------

describe('SecondaryWeaponSchema', () => {
	const minimalSecondary = {
		id: 'bomb-basic',
		name: 'Basic Bomb',
		type: 'bomb',
		damage: 200,
		cooldown: { duration: 10 },
		effectRadius: 300,
	};

	it('parses a valid secondary weapon', () => {
		const result = SecondaryWeaponSchema.parse(minimalSecondary);
		expect(result).toEqual(
			expect.objectContaining({
				id: 'bomb-basic',
				type: 'bomb',
				damage: 200,
				effectRadius: 300,
				description: '',
			}),
		);
	});

	it('rejects zero damage', () => {
		expect(() => SecondaryWeaponSchema.parse({ ...minimalSecondary, damage: 0 })).toThrow();
	});

	it('rejects zero effectRadius', () => {
		expect(() => SecondaryWeaponSchema.parse({ ...minimalSecondary, effectRadius: 0 })).toThrow();
	});

	it('rejects invalid type', () => {
		expect(() => SecondaryWeaponSchema.parse({ ...minimalSecondary, type: 'grenade' })).toThrow();
	});
});

// ---------------------------------------------------------------------------
// WeaponRecipe
// ---------------------------------------------------------------------------

describe('WeaponRecipeSchema', () => {
	const minimalRecipe = {
		id: 'recipe-missile',
		weaponId: 'missile',
		name: 'Missile Recipe',
		craftCost: 500,
	};

	it('parses a valid weapon recipe with defaults', () => {
		const result = WeaponRecipeSchema.parse(minimalRecipe);
		expect(result).toEqual(
			expect.objectContaining({
				id: 'recipe-missile',
				weaponId: 'missile',
				craftCost: 500,
				description: '',
			}),
		);
	});

	it('rejects negative craftCost', () => {
		expect(() => WeaponRecipeSchema.parse({ ...minimalRecipe, craftCost: -1 })).toThrow();
	});

	it('rejects missing weaponId', () => {
		const { weaponId: _wid, ...rest } = minimalRecipe;
		expect(() => WeaponRecipeSchema.parse(rest)).toThrow();
	});
});
