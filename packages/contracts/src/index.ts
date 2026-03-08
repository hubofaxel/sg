// ---------------------------------------------------------------------------
// @sg/contracts — barrel export
// ---------------------------------------------------------------------------

// Common primitives
export {
	type Cooldown,
	CooldownSchema,
	type DropEntry,
	DropEntrySchema,
	type DropTable,
	DropTableSchema,
	type DropType,
	DropTypeSchema,
	type EntityId,
	EntityIdSchema,
	type Hitbox,
	HitboxSchema,
	type StatRange,
	StatRangeSchema,
	type Vec2,
	Vec2Schema,
} from './common/base.schema';
// Economy
export {
	type ExperienceLevel,
	ExperienceLevelSchema,
	type ExperienceTable,
	ExperienceTableSchema,
	type PlayerEconomyState,
	PlayerEconomyStateSchema,
	type ShopItem,
	type ShopItemCategory,
	ShopItemCategorySchema,
	ShopItemSchema,
} from './economy/economy.schema';
// Enemies
export {
	type AttackType,
	AttackTypeSchema,
	type Boss,
	type BossPhase,
	BossPhaseSchema,
	BossSchema,
	type Enemy,
	EnemySchema,
	type EnemySize,
	EnemySizeSchema,
	type MovementPattern,
	MovementPatternSchema,
} from './enemy/enemy.schema';
// Save game
export {
	createNewSave,
	type EndlessProgress,
	EndlessProgressSchema,
	type LifetimeStats,
	LifetimeStatsSchema,
	migrateSave,
	type RunStats,
	RunStatsSchema,
	SAVE_VERSION,
	type SaveGame,
	SaveGameSchema,
	type StageProgress,
	StageProgressSchema,
	type UnlockEntry,
	UnlockEntrySchema,
	type UnlockType,
	UnlockTypeSchema,
} from './save/save.schema';
// Settings
export {
	type ControlScheme,
	ControlSchemeSchema,
	defaultGameSettings,
	type GameSettings,
	GameSettingsSchema,
} from './settings/settings.schema';
// Ships
export {
	type PlayerShipState,
	PlayerShipStateSchema,
	type Ship,
	ShipSchema,
	type ShipStats,
	ShipStatsSchema,
	type ShipUpgradeLevel,
	ShipUpgradeLevelSchema,
	type ShipUpgradePath,
	ShipUpgradePathSchema,
	type ShipUpgradeStat,
	ShipUpgradeStatSchema,
} from './ship/ship.schema';
// Waves / Progression
export {
	type Campaign,
	CampaignSchema,
	type EndlessModeConfig,
	EndlessModeConfigSchema,
	type EndlessScaling,
	EndlessScalingSchema,
	type Formation,
	FormationSchema,
	type GameMode,
	GameModeSchema,
	type Level,
	LevelSchema,
	type SpawnEntry,
	SpawnEntrySchema,
	type Stage,
	StageSchema,
	type Wave,
	WaveSchema,
} from './wave/wave.schema';
// Weapons
export {
	type PlayerWeaponState,
	PlayerWeaponStateSchema,
	type SecondaryWeapon,
	SecondaryWeaponSchema,
	type SecondaryWeaponType,
	SecondaryWeaponTypeSchema,
	type Weapon,
	type WeaponLevel,
	WeaponLevelSchema,
	type WeaponLevelStats,
	WeaponLevelStatsSchema,
	type WeaponRecipe,
	WeaponRecipeSchema,
	WeaponSchema,
	type WeaponType,
	WeaponTypeSchema,
} from './weapon/weapon.schema';
