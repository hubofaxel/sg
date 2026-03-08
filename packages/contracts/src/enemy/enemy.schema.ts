import { z } from 'zod';
import {
	CombatFeedbackSchema,
	DropTableSchema,
	EntityIdSchema,
	HitboxSchema,
	Vec2Schema,
} from '../common/base.schema';
import { WeaponTypeSchema } from '../weapon/weapon.schema';

// ---------------------------------------------------------------------------
// Movement patterns
// ---------------------------------------------------------------------------

export const MovementPatternSchema = z.enum([
	/** Straight line from top to bottom */
	'linear',
	/** Sine-wave horizontal oscillation while descending */
	'sine-wave',
	/** Diagonal zigzag bouncing off screen edges */
	'zigzag',
	/** Circles or spirals toward the player */
	'spiral',
	/** Enters, stops at a Y position, strafes horizontally */
	'strafe-hover',
]);
export type MovementPattern = z.infer<typeof MovementPatternSchema>;

// ---------------------------------------------------------------------------
// Attack patterns
// ---------------------------------------------------------------------------

export const AttackTypeSchema = z.enum([
	/** Fires projectiles at fixed intervals toward the player */
	'aimed-shot',
	/** Fires projectiles in a fixed spread pattern */
	'spread-shot',
	/** Charges directly at the player (kamikaze) */
	'ram',
	/** No ranged attack — relies on collision damage */
	'contact-only',
	/** Fires a sustained beam (boss-tier, but some elites too) */
	'beam',
]);
export type AttackType = z.infer<typeof AttackTypeSchema>;

// ---------------------------------------------------------------------------
// Enemy size class — affects sprite scale, hitbox presets, and score value
// ---------------------------------------------------------------------------

export const EnemySizeSchema = z.enum(['small', 'medium', 'large', 'boss']);
export type EnemySize = z.infer<typeof EnemySizeSchema>;

// ---------------------------------------------------------------------------
// Enemy definition
// ---------------------------------------------------------------------------

export const EnemySchema = z.object({
	id: EntityIdSchema,
	name: z.string().min(1).max(64),
	description: z.string().max(256).default(''),
	size: EnemySizeSchema,

	// --- Combat stats ---
	health: z.number().positive(),
	/** Movement speed in world units per second */
	speed: z.number().positive(),
	/** Contact damage dealt when colliding with player */
	contactDamage: z.number().nonnegative().default(1),

	// --- Behavior ---
	movementPattern: MovementPatternSchema,
	attackType: AttackTypeSchema,
	/** Weapon type used for ranged attacks (ignored for ram/contact-only) */
	weaponType: WeaponTypeSchema.optional(),
	/** Projectile damage per hit (ignored for ram/contact-only) */
	projectileDamage: z.number().positive().optional(),
	/** Seconds between shots (ignored for ram/contact-only) */
	fireInterval: z.number().positive().optional(),

	// --- Geometry ---
	hitbox: HitboxSchema,
	spriteKey: z.string().min(1),

	// --- Drops ---
	drops: DropTableSchema,

	// --- Score ---
	/** Base score value when killed */
	scoreValue: z.number().int().nonnegative(),

	// --- Feedback ---
	/** Visual/audio feedback overrides (uses defaults if omitted) */
	combatFeedback: CombatFeedbackSchema.optional(),
});
export type Enemy = z.infer<typeof EnemySchema>;

// ---------------------------------------------------------------------------
// Boss definition — extends enemy concept with phases
// ---------------------------------------------------------------------------

export const BossPhaseSchema = z.object({
	/** Phase index starting at 0 */
	phase: z.number().int().nonnegative(),
	/** Health threshold to enter this phase (1.0 = full health, 0.0 = dead) */
	healthThreshold: z.number().min(0).max(1),
	/** Movement pattern for this phase */
	movementPattern: MovementPatternSchema,
	/** Attack type for this phase */
	attackType: AttackTypeSchema,
	weaponType: WeaponTypeSchema.optional(),
	projectileDamage: z.number().positive().optional(),
	fireInterval: z.number().positive().optional(),
	/** Speed multiplier relative to base speed for this phase */
	speedMultiplier: z.number().positive().default(1),
	/** Sprite frame index to display during this phase (e.g. 0 = shields-up, 1 = core-exposed) */
	spriteFrame: z.number().int().nonnegative().optional(),
	/** Optional: spawn points for minion enemies during this phase */
	minionSpawns: z
		.array(
			z.object({
				enemyId: EntityIdSchema,
				/** Seconds between spawns */
				interval: z.number().positive(),
				/** Max concurrent minions from this spawn */
				maxConcurrent: z.number().int().positive().default(3),
			}),
		)
		.default([]),
});
export type BossPhase = z.infer<typeof BossPhaseSchema>;

export const BossSchema = z.object({
	id: EntityIdSchema,
	name: z.string().min(1).max(64),
	description: z.string().max(256).default(''),
	size: z.literal('boss'),

	health: z.number().positive(),
	speed: z.number().positive(),
	contactDamage: z.number().nonnegative().default(1),

	hitbox: HitboxSchema,
	spriteKey: z.string().min(1),

	/** Boss phases — ordered by descending health threshold */
	phases: z.array(BossPhaseSchema).min(1),

	drops: DropTableSchema,
	/** If true, at least one drop entry always fires on death (ignores chance for highest-value entry) */
	guaranteedDropOnDeath: z.boolean().default(false),
	scoreValue: z.number().int().nonnegative(),

	/** Visual/audio feedback overrides (uses defaults if omitted) */
	combatFeedback: CombatFeedbackSchema.optional(),

	/** Entry animation: where the boss enters from */
	entryPosition: Vec2Schema,
	/** Where the boss settles after the entry animation */
	anchorPosition: Vec2Schema,
});
export type Boss = z.infer<typeof BossSchema>;
