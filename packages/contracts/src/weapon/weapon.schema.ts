import { z } from 'zod';
import { CombatFeedbackSchema, CooldownSchema, EntityIdSchema, HitboxSchema } from '../common/base.schema';

// ---------------------------------------------------------------------------
// Weapon classification
// ---------------------------------------------------------------------------

export const WeaponTypeSchema = z.enum(['basic-laser', 'spread-shot', 'missile', 'beam']);
export type WeaponType = z.infer<typeof WeaponTypeSchema>;

export const SecondaryWeaponTypeSchema = z.enum(['bomb']);
export type SecondaryWeaponType = z.infer<typeof SecondaryWeaponTypeSchema>;

// ---------------------------------------------------------------------------
// Weapon level — linear upgrade 1–5
// ---------------------------------------------------------------------------

export const WeaponLevelSchema = z.number().int().min(1).max(5);
export type WeaponLevel = z.infer<typeof WeaponLevelSchema>;

// ---------------------------------------------------------------------------
// Weapon stats (per-level definition)
// ---------------------------------------------------------------------------

export const WeaponLevelStatsSchema = z.object({
	level: WeaponLevelSchema,
	damage: z.number().positive(),
	/** Projectile speed in world units per second */
	projectileSpeed: z.number().positive(),
	cooldown: CooldownSchema,
	/** Number of projectiles per shot (1 for laser, 3-7 for spread, etc.) */
	projectileCount: z.number().int().positive().default(1),
	/** Spread angle in degrees (0 for single-shot weapons) */
	spreadAngle: z.number().min(0).max(360).default(0),
	/** Projectile hitbox */
	projectileHitbox: HitboxSchema,
	/** For beam type: beam width in world units */
	beamWidth: z.number().positive().optional(),
	/** For beam type: beam duration in seconds */
	beamDuration: z.number().positive().optional(),
	/** For missile type: homing strength 0–1 (0 = straight, 1 = perfect tracking) */
	homingStrength: z.number().min(0).max(1).optional(),
	/** Currency cost to upgrade TO this level (level 1 = 0, it's the base) */
	upgradeCost: z.number().int().nonnegative().default(0),
	/** Combat feedback overrides when this weapon hits (uses defaults if omitted) */
	combatFeedback: CombatFeedbackSchema.optional(),
});
export type WeaponLevelStats = z.infer<typeof WeaponLevelStatsSchema>;

// ---------------------------------------------------------------------------
// Weapon definition — the full upgrade path for one weapon
// ---------------------------------------------------------------------------

export const WeaponSchema = z
	.object({
		id: EntityIdSchema,
		name: z.string().min(1).max(64),
		type: WeaponTypeSchema,
		description: z.string().max(256).default(''),
		/** Ordered array of level definitions — must have exactly 5 entries */
		levels: z.array(WeaponLevelStatsSchema).length(5),
	})
	.refine((w) => w.levels.every((l, i) => l.level === i + 1), {
		message: 'Weapon levels must be sequential 1 through 5',
	});
export type Weapon = z.infer<typeof WeaponSchema>;

// ---------------------------------------------------------------------------
// Secondary weapon (bomb)
// ---------------------------------------------------------------------------

export const SecondaryWeaponSchema = z.object({
	id: EntityIdSchema,
	name: z.string().min(1).max(64),
	type: SecondaryWeaponTypeSchema,
	description: z.string().max(256).default(''),
	/** Damage dealt to all enemies on screen */
	damage: z.number().positive(),
	cooldown: CooldownSchema,
	/** Visual effect radius in world units */
	effectRadius: z.number().positive(),
});
export type SecondaryWeapon = z.infer<typeof SecondaryWeaponSchema>;

// ---------------------------------------------------------------------------
// Weapon recipe — drop that unlocks a weapon for purchase/crafting
// ---------------------------------------------------------------------------

export const WeaponRecipeSchema = z.object({
	id: EntityIdSchema,
	/** The weapon this recipe unlocks */
	weaponId: EntityIdSchema,
	name: z.string().min(1).max(64),
	description: z.string().max(256).default(''),
	/** Currency cost to craft after obtaining the recipe */
	craftCost: z.number().int().nonnegative(),
});
export type WeaponRecipe = z.infer<typeof WeaponRecipeSchema>;

// ---------------------------------------------------------------------------
// Player weapon state — runtime, not content definition
// ---------------------------------------------------------------------------

export const PlayerWeaponStateSchema = z.object({
	weaponId: EntityIdSchema,
	currentLevel: WeaponLevelSchema,
});
export type PlayerWeaponState = z.infer<typeof PlayerWeaponStateSchema>;
