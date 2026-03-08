import { z } from 'zod';
import { EntityIdSchema } from '../common/base.schema';

// ---------------------------------------------------------------------------
// Experience / leveling
// ---------------------------------------------------------------------------

export const ExperienceLevelSchema = z.object({
	level: z.number().int().positive(),
	/** Total cumulative XP required to reach this level */
	xpRequired: z.number().int().nonnegative(),
	/** What unlocks at this level (ship, weapon recipe, upgrade slot, etc.) */
	unlocks: z
		.array(
			z.object({
				type: z.enum(['ship', 'weapon-recipe', 'upgrade-slot', 'secondary-weapon', 'cosmetic']),
				itemId: EntityIdSchema,
				description: z.string().max(256).default(''),
			}),
		)
		.default([]),
});
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;

export const ExperienceTableSchema = z
	.object({
		levels: z.array(ExperienceLevelSchema).min(1),
	})
	.refine((t) => t.levels.every((l, i) => l.level === i + 1), {
		message: 'Experience levels must be sequential starting at 1',
	})
	.refine((t) => t.levels.every((l, i) => i === 0 || l.xpRequired > t.levels[i - 1].xpRequired), {
		message: 'XP requirements must be strictly increasing',
	});
export type ExperienceTable = z.infer<typeof ExperienceTableSchema>;

// ---------------------------------------------------------------------------
// Shop — between-stage purchasing
// ---------------------------------------------------------------------------

export const ShopItemCategorySchema = z.enum([
	'weapon-upgrade',
	'ship-upgrade',
	'weapon-craft',
	'secondary-restock',
]);
export type ShopItemCategory = z.infer<typeof ShopItemCategorySchema>;

export const ShopItemSchema = z.object({
	id: EntityIdSchema,
	category: ShopItemCategorySchema,
	name: z.string().min(1).max(64),
	description: z.string().max(256).default(''),
	/** Currency cost */
	cost: z.number().int().nonnegative(),
	/** Reference to the thing being purchased */
	targetId: EntityIdSchema,
	/** For upgrades: which level this purchase grants */
	targetLevel: z.number().int().positive().optional(),
	/** Prerequisites: item IDs that must be owned first */
	prerequisites: z.array(EntityIdSchema).default([]),
	/** Whether this item can be purchased multiple times */
	repeatable: z.boolean().default(false),
});
export type ShopItem = z.infer<typeof ShopItemSchema>;

// ---------------------------------------------------------------------------
// Player economy state — runtime wallet
// ---------------------------------------------------------------------------

export const PlayerEconomyStateSchema = z.object({
	/** Persistent currency — survives death */
	currency: z.number().int().nonnegative().default(0),
	/** Total lifetime currency earned (for stats) */
	lifetimeCurrencyEarned: z.number().int().nonnegative().default(0),
	/** Current experience points */
	experience: z.number().int().nonnegative().default(0),
	/** Current player level (derived from XP, but cached) */
	playerLevel: z.number().int().positive().default(1),
	/** Bomb count for current run */
	bombCount: z.number().int().nonnegative().default(3),
});
export type PlayerEconomyState = z.infer<typeof PlayerEconomyStateSchema>;
