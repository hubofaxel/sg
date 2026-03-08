import { z } from 'zod';

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Opaque string ID — every game entity gets one */
export const EntityIdSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(
		/^[a-z][a-z0-9_-]*$/,
		'Entity IDs must be lowercase alphanumeric with hyphens/underscores',
	);
export type EntityId = z.infer<typeof EntityIdSchema>;

// ---------------------------------------------------------------------------
// Geometry / Physics primitives
// ---------------------------------------------------------------------------

/** 2D vector used for positions, velocities, dimensions */
export const Vec2Schema = z.object({
	x: z.number(),
	y: z.number(),
});
export type Vec2 = z.infer<typeof Vec2Schema>;

/** Axis-aligned bounding box for hitboxes */
export const HitboxSchema = z.object({
	width: z.number().positive(),
	height: z.number().positive(),
	/** Offset from entity center — defaults to (0,0) */
	offset: Vec2Schema.default({ x: 0, y: 0 }),
});
export type Hitbox = z.infer<typeof HitboxSchema>;

// ---------------------------------------------------------------------------
// Stat ranges — for content authoring and balance tuning
// ---------------------------------------------------------------------------

/** A numeric stat with floor and ceiling for validation */
export const StatRangeSchema = z
	.object({
		base: z.number(),
		min: z.number(),
		max: z.number(),
	})
	.refine((s) => s.min <= s.base && s.base <= s.max, {
		message: 'Stat base must be between min and max',
	});
export type StatRange = z.infer<typeof StatRangeSchema>;

// ---------------------------------------------------------------------------
// Drop table entry — shared by enemies and bosses
// ---------------------------------------------------------------------------

export const DropTypeSchema = z.enum(['currency', 'upgrade-token', 'weapon-recipe']);
export type DropType = z.infer<typeof DropTypeSchema>;

export const DropEntrySchema = z.object({
	type: DropTypeSchema,
	/** Probability 0–1 that this drop appears when the entity dies */
	chance: z.number().min(0).max(1),
	/** How many of this drop (for currency, amount; for others, 1) */
	quantity: z.number().int().positive().default(1),
	/** Optional: specific item ID (e.g., which recipe) */
	itemId: EntityIdSchema.optional(),
});
export type DropEntry = z.infer<typeof DropEntrySchema>;

export const DropTableSchema = z.array(DropEntrySchema).default([]);
export type DropTable = z.infer<typeof DropTableSchema>;

// ---------------------------------------------------------------------------
// Cooldown
// ---------------------------------------------------------------------------

/** Cooldown in seconds */
export const CooldownSchema = z.object({
	/** Duration in seconds */
	duration: z.number().positive(),
	/** Whether cooldown starts on fire or on projectile expiry */
	startOn: z.enum(['fire', 'expiry']).default('fire'),
});
export type Cooldown = z.infer<typeof CooldownSchema>;

// ---------------------------------------------------------------------------
// Combat feedback — visual/audio juice parameters for hits, kills, and spawns
// ---------------------------------------------------------------------------

export const CombatFeedbackSchema = z.object({
	/** Duration in ms for the white tint-on-hit flash (0 = no flash) */
	hitFlashMs: z.number().int().nonnegative().default(80),
	/** Duration in ms for the hit-stop physics pause on kill (0 = no pause) */
	hitPauseMs: z.number().int().nonnegative().default(30),
	/** Camera shake intensity on this entity's damage/death (0 = no shake) */
	screenShake: z.number().nonnegative().default(0),
	/** Camera shake duration in ms */
	screenShakeMs: z.number().int().nonnegative().default(100),
	/** Duration in ms for the death burst expand+fade effect (0 = instant destroy) */
	deathBurstMs: z.number().int().nonnegative().default(150),
	/** Duration in ms for the spawn-in scale+fade animation (0 = instant appear) */
	spawnInMs: z.number().int().nonnegative().default(200),
});
export type CombatFeedback = z.infer<typeof CombatFeedbackSchema>;
