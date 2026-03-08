import { z } from 'zod';
import { EntityIdSchema, HitboxSchema } from '../common/base.schema';
import { WeaponTypeSchema } from '../weapon/weapon.schema';

// ---------------------------------------------------------------------------
// Ship stats — the tunable numbers that define how a ship feels
// ---------------------------------------------------------------------------

export const ShipStatsSchema = z.object({
	/** Movement speed in world units per second */
	speed: z.number().positive(),
	/** Maximum lives (no health bar — lives are binary) */
	maxLives: z.number().int().positive(),
	/** Shields: absorb N hits before a life is lost (0 = no shields) */
	shields: z.number().int().nonnegative().default(0),
	/** Base fire rate multiplier (1.0 = weapon default, >1 = faster) */
	fireRateMultiplier: z.number().positive().default(1.0),
	/** Hitbox — pixel art means this matters a lot */
	hitbox: HitboxSchema,
	/** Default weapon type this ship starts with */
	defaultWeaponType: WeaponTypeSchema,
});
export type ShipStats = z.infer<typeof ShipStatsSchema>;

// ---------------------------------------------------------------------------
// Ship upgrade — linear stat boosts purchasable with currency
// ---------------------------------------------------------------------------

export const ShipUpgradeStatSchema = z.enum(['speed', 'maxLives', 'shields', 'fireRateMultiplier']);
export type ShipUpgradeStat = z.infer<typeof ShipUpgradeStatSchema>;

export const ShipUpgradeLevelSchema = z.object({
	level: z.number().int().min(1),
	/** The stat this upgrade modifies */
	stat: ShipUpgradeStatSchema,
	/** Additive delta applied to the base stat (+0.5 speed, +1 life, etc.) */
	delta: z.number(),
	/** Currency cost to purchase this upgrade level */
	cost: z.number().int().nonnegative(),
});
export type ShipUpgradeLevel = z.infer<typeof ShipUpgradeLevelSchema>;

export const ShipUpgradePathSchema = z
	.object({
		id: EntityIdSchema,
		name: z.string().min(1).max(64),
		stat: ShipUpgradeStatSchema,
		description: z.string().max(256).default(''),
		/** Ordered upgrade levels — level 1 is the first purchasable upgrade */
		levels: z.array(ShipUpgradeLevelSchema).min(1),
	})
	.refine((u) => u.levels.every((l) => l.stat === u.stat), {
		message: 'All upgrade levels must target the same stat as the path',
	})
	.refine((u) => u.levels.every((l, i) => l.level === i + 1), {
		message: 'Upgrade levels must be sequential starting at 1',
	});
export type ShipUpgradePath = z.infer<typeof ShipUpgradePathSchema>;

// ---------------------------------------------------------------------------
// Ship definition — a playable ship with its base stats and upgrade tree
// ---------------------------------------------------------------------------

export const ShipSchema = z.object({
	id: EntityIdSchema,
	name: z.string().min(1).max(64),
	description: z.string().max(256).default(''),
	/** Base stats before any upgrades */
	baseStats: ShipStatsSchema,
	/** Available upgrade paths for this ship */
	upgrades: z.array(ShipUpgradePathSchema).default([]),
	/** Whether this ship is available from the start or must be unlocked */
	starterShip: z.boolean().default(false),
	/** Currency cost to unlock (0 or omitted for starter ships) */
	unlockCost: z.number().int().nonnegative().default(0),
	/** Sprite sheet key — references the asset manifest */
	spriteKey: z.string().min(1),
});
export type Ship = z.infer<typeof ShipSchema>;

// ---------------------------------------------------------------------------
// Player ship state — runtime progression, not content definition
// ---------------------------------------------------------------------------

export const PlayerShipStateSchema = z.object({
	shipId: EntityIdSchema,
	/** Map of upgrade path ID → current level (0 = not purchased) */
	upgradeLevels: z.record(EntityIdSchema, z.number().int().nonnegative()).default({}),
});
export type PlayerShipState = z.infer<typeof PlayerShipStateSchema>;
