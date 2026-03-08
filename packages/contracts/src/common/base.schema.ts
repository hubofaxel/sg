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
