// ---------------------------------------------------------------------------
// Content validation tests
// Parses raw JSON against Zod schemas to prove structural validity.
// Does NOT rely on the `as unknown as Type` casts in index.ts — imports
// raw JSON directly so Zod must accept it on its own merits.
// ---------------------------------------------------------------------------

import {
	BossSchema,
	CampaignSchema,
	EndlessModeConfigSchema,
	EnemySchema,
	ExperienceTableSchema,
	ShipSchema,
	WeaponSchema,
} from '@sg/contracts';
import { describe, expect, it } from 'vitest';
import bossesRaw from './enemies/bosses.json';
import v1EnemiesRaw from './enemies/v1-enemies.json';
import progressionRaw from './progression/progression.json';
import starterShipsRaw from './ships/starter.json';
import campaignRaw from './waves/campaign.json';
// Raw JSON imports — bypass the typed casts in index.ts
import primaryWeaponsRaw from './weapons/primary.json';

// ---------------------------------------------------------------------------
// Parse helpers — run once at module level so every test can reuse the result
// ---------------------------------------------------------------------------

const weapons = primaryWeaponsRaw.map((w) => WeaponSchema.parse(w));
const ships = starterShipsRaw.map((s) => ShipSchema.parse(s));
const enemies = v1EnemiesRaw.map((e) => EnemySchema.parse(e));
const bosses = bossesRaw.map((b) => BossSchema.parse(b));
const campaign = CampaignSchema.parse(campaignRaw);
const experienceTable = ExperienceTableSchema.parse(progressionRaw.experienceTable);
const endlessModeConfig = EndlessModeConfigSchema.parse(progressionRaw.endlessModeConfig);

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------

describe('content validation', () => {
	describe('weapons', () => {
		it('parses all weapons without errors', () => {
			// If parse threw, the module-level parse above would have already failed.
			// This assertion confirms the count is meaningful.
			expect(() => primaryWeaponsRaw.map((w) => WeaponSchema.parse(w))).not.toThrow();
		});

		it('has at least 1 weapon', () => {
			expect(weapons.length).toBeGreaterThanOrEqual(1);
		});

		it('every weapon has exactly 5 upgrade levels', () => {
			for (const weapon of weapons) {
				expect(weapon.levels).toHaveLength(5);
			}
		});

		it('every weapon level sequence is 1 through 5', () => {
			for (const weapon of weapons) {
				weapon.levels.forEach((lvl, i) => {
					expect(lvl.level).toBe(i + 1);
				});
			}
		});

		it('every weapon has a non-empty id, name, and type', () => {
			for (const weapon of weapons) {
				expect(weapon.id.length).toBeGreaterThan(0);
				expect(weapon.name.length).toBeGreaterThan(0);
				expect(weapon.type.length).toBeGreaterThan(0);
			}
		});

		it('every weapon level has positive damage and projectile speed', () => {
			for (const weapon of weapons) {
				for (const lvl of weapon.levels) {
					expect(lvl.damage).toBeGreaterThan(0);
					expect(lvl.projectileSpeed).toBeGreaterThan(0);
				}
			}
		});

		it('level-1 upgrade cost is 0 for every weapon', () => {
			for (const weapon of weapons) {
				expect(weapon.levels[0].upgradeCost).toBe(0);
			}
		});

		it('contains the four expected weapon types', () => {
			const types = new Set(weapons.map((w) => w.type));
			expect(types).toContain('basic-laser');
			expect(types).toContain('spread-shot');
			expect(types).toContain('missile');
			expect(types).toContain('beam');
		});
	});

	// ---------------------------------------------------------------------------
	// Ships
	// ---------------------------------------------------------------------------

	describe('ships', () => {
		it('parses all ships without errors', () => {
			expect(() => starterShipsRaw.map((s) => ShipSchema.parse(s))).not.toThrow();
		});

		it('has at least 1 ship', () => {
			expect(ships.length).toBeGreaterThanOrEqual(1);
		});

		it('every ship has baseStats with required fields', () => {
			for (const ship of ships) {
				expect(ship.baseStats.speed).toBeGreaterThan(0);
				expect(ship.baseStats.maxLives).toBeGreaterThanOrEqual(1);
				expect(ship.baseStats.hitbox.width).toBeGreaterThan(0);
				expect(ship.baseStats.hitbox.height).toBeGreaterThan(0);
				expect(ship.baseStats.defaultWeaponType.length).toBeGreaterThan(0);
			}
		});

		it('every ship has a non-empty id, name, and spriteKey', () => {
			for (const ship of ships) {
				expect(ship.id.length).toBeGreaterThan(0);
				expect(ship.name.length).toBeGreaterThan(0);
				expect(ship.spriteKey.length).toBeGreaterThan(0);
			}
		});

		it('every ship upgrade path has sequential levels starting at 1', () => {
			for (const ship of ships) {
				for (const path of ship.upgrades) {
					path.levels.forEach((lvl, i) => {
						expect(lvl.level).toBe(i + 1);
					});
				}
			}
		});

		it('every ship upgrade level targets the same stat as its path', () => {
			for (const ship of ships) {
				for (const path of ship.upgrades) {
					for (const lvl of path.levels) {
						expect(lvl.stat).toBe(path.stat);
					}
				}
			}
		});

		it('starter ship has starterShip: true and unlockCost: 0', () => {
			const starter = ships.find((s) => s.starterShip);
			expect(starter).toBeDefined();
			expect(starter?.unlockCost).toBe(0);
		});
	});

	// ---------------------------------------------------------------------------
	// Enemies
	// ---------------------------------------------------------------------------

	describe('enemies', () => {
		it('parses all enemies without errors', () => {
			expect(() => v1EnemiesRaw.map((e) => EnemySchema.parse(e))).not.toThrow();
		});

		it('has at least 1 enemy', () => {
			expect(enemies.length).toBeGreaterThanOrEqual(1);
		});

		it('every enemy has a non-empty id, name, and spriteKey', () => {
			for (const enemy of enemies) {
				expect(enemy.id.length).toBeGreaterThan(0);
				expect(enemy.name.length).toBeGreaterThan(0);
				expect(enemy.spriteKey.length).toBeGreaterThan(0);
			}
		});

		it('every enemy has positive health and speed', () => {
			for (const enemy of enemies) {
				expect(enemy.health).toBeGreaterThan(0);
				expect(enemy.speed).toBeGreaterThan(0);
			}
		});

		it('every enemy has a valid hitbox', () => {
			for (const enemy of enemies) {
				expect(enemy.hitbox.width).toBeGreaterThan(0);
				expect(enemy.hitbox.height).toBeGreaterThan(0);
			}
		});

		it('every enemy has a non-negative scoreValue', () => {
			for (const enemy of enemies) {
				expect(enemy.scoreValue).toBeGreaterThanOrEqual(0);
			}
		});

		it('drop chance values are between 0 and 1 inclusive', () => {
			for (const enemy of enemies) {
				for (const drop of enemy.drops) {
					expect(drop.chance).toBeGreaterThanOrEqual(0);
					expect(drop.chance).toBeLessThanOrEqual(1);
				}
			}
		});

		it('drop quantity is a positive integer', () => {
			for (const enemy of enemies) {
				for (const drop of enemy.drops) {
					expect(drop.quantity).toBeGreaterThan(0);
					expect(Number.isInteger(drop.quantity)).toBe(true);
				}
			}
		});

		it('enemies with ranged attacks have a fireInterval', () => {
			const rangedTypes = new Set(['aimed-shot', 'spread-shot', 'beam']);
			for (const enemy of enemies) {
				if (rangedTypes.has(enemy.attackType)) {
					expect(enemy.fireInterval).toBeDefined();
					expect(enemy.fireInterval).toBeGreaterThan(0);
				}
			}
		});

		it('contains all 5 v1 enemy ids', () => {
			const ids = new Set(enemies.map((e) => e.id));
			expect(ids).toContain('enemy-drone');
			expect(ids).toContain('enemy-weaver');
			expect(ids).toContain('enemy-bruiser');
			expect(ids).toContain('enemy-kamikaze');
			expect(ids).toContain('enemy-zigzagger');
		});
	});

	// ---------------------------------------------------------------------------
	// Bosses
	// ---------------------------------------------------------------------------

	describe('bosses', () => {
		it('parses all bosses without errors', () => {
			expect(() => bossesRaw.map((b) => BossSchema.parse(b))).not.toThrow();
		});

		it('has at least 1 boss', () => {
			expect(bosses.length).toBeGreaterThanOrEqual(1);
		});

		it('every boss has at least 1 phase', () => {
			for (const boss of bosses) {
				expect(boss.phases.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('every boss phase has a healthThreshold between 0 and 1', () => {
			for (const boss of bosses) {
				for (const phase of boss.phases) {
					expect(phase.healthThreshold).toBeGreaterThanOrEqual(0);
					expect(phase.healthThreshold).toBeLessThanOrEqual(1);
				}
			}
		});

		it('first phase healthThreshold is 1.0 (starts at full health)', () => {
			for (const boss of bosses) {
				expect(boss.phases[0].healthThreshold).toBe(1.0);
			}
		});

		it('phase indices are sequential starting at 0', () => {
			for (const boss of bosses) {
				boss.phases.forEach((phase, i) => {
					expect(phase.phase).toBe(i);
				});
			}
		});

		it('every boss has a size of "boss"', () => {
			for (const boss of bosses) {
				expect(boss.size).toBe('boss');
			}
		});

		it('every boss has entryPosition and anchorPosition', () => {
			for (const boss of bosses) {
				expect(typeof boss.entryPosition.x).toBe('number');
				expect(typeof boss.entryPosition.y).toBe('number');
				expect(typeof boss.anchorPosition.x).toBe('number');
				expect(typeof boss.anchorPosition.y).toBe('number');
			}
		});

		it('boss drop chance values are between 0 and 1', () => {
			for (const boss of bosses) {
				for (const drop of boss.drops) {
					expect(drop.chance).toBeGreaterThanOrEqual(0);
					expect(drop.chance).toBeLessThanOrEqual(1);
				}
			}
		});

		it('contains the Iron Sentinel and Void Reaper bosses', () => {
			const ids = new Set(bosses.map((b) => b.id));
			expect(ids).toContain('boss-iron-sentinel');
			expect(ids).toContain('boss-void-reaper');
		});
	});

	// ---------------------------------------------------------------------------
	// Campaign / Waves
	// ---------------------------------------------------------------------------

	describe('campaign', () => {
		it('parses campaign without errors', () => {
			expect(() => CampaignSchema.parse(campaignRaw)).not.toThrow();
		});

		it('has a non-empty id and name', () => {
			expect(campaign.id.length).toBeGreaterThan(0);
			expect(campaign.name.length).toBeGreaterThan(0);
		});

		it('has at least 1 stage', () => {
			expect(campaign.stages.length).toBeGreaterThanOrEqual(1);
		});

		it('stage indices are sequential starting at 0', () => {
			campaign.stages.forEach((stage, i) => {
				expect(stage.index).toBe(i);
			});
		});

		it('every stage has at least 1 level', () => {
			for (const stage of campaign.stages) {
				expect(stage.levels.length).toBeGreaterThanOrEqual(1);
			}
		});

		it('level indices within each stage are sequential starting at 0', () => {
			for (const stage of campaign.stages) {
				stage.levels.forEach((level, i) => {
					expect(level.index).toBe(i);
				});
			}
		});

		it('every level has at least 1 wave', () => {
			for (const stage of campaign.stages) {
				for (const level of stage.levels) {
					expect(level.waves.length).toBeGreaterThanOrEqual(1);
				}
			}
		});

		it('wave indices within each level are sequential starting at 0', () => {
			for (const stage of campaign.stages) {
				for (const level of stage.levels) {
					level.waves.forEach((wave, i) => {
						expect(wave.index).toBe(i);
					});
				}
			}
		});

		it('every wave has at least 1 spawn entry', () => {
			for (const stage of campaign.stages) {
				for (const level of stage.levels) {
					for (const wave of level.waves) {
						expect(wave.spawns.length).toBeGreaterThanOrEqual(1);
					}
				}
			}
		});

		it('every spawn entry count is a positive integer', () => {
			for (const stage of campaign.stages) {
				for (const level of stage.levels) {
					for (const wave of level.waves) {
						for (const spawn of wave.spawns) {
							expect(spawn.count).toBeGreaterThan(0);
							expect(Number.isInteger(spawn.count)).toBe(true);
						}
					}
				}
			}
		});

		it('every level backgroundKey is a non-empty string', () => {
			for (const stage of campaign.stages) {
				for (const level of stage.levels) {
					expect(typeof level.backgroundKey).toBe('string');
					expect(level.backgroundKey.length).toBeGreaterThan(0);
				}
			}
		});

		it('every stage musicKey is a non-empty string', () => {
			for (const stage of campaign.stages) {
				expect(typeof stage.musicKey).toBe('string');
				expect(stage.musicKey.length).toBeGreaterThan(0);
			}
		});
	});

	// ---------------------------------------------------------------------------
	// Progression — experience table
	// ---------------------------------------------------------------------------

	describe('experienceTable', () => {
		it('parses experience table without errors', () => {
			expect(() => ExperienceTableSchema.parse(progressionRaw.experienceTable)).not.toThrow();
		});

		it('has at least 1 level', () => {
			expect(experienceTable.levels.length).toBeGreaterThanOrEqual(1);
		});

		it('level indices are sequential starting at 1', () => {
			experienceTable.levels.forEach((entry, i) => {
				expect(entry.level).toBe(i + 1);
			});
		});

		it('level 1 requires 0 XP', () => {
			expect(experienceTable.levels[0].xpRequired).toBe(0);
		});

		it('XP requirements are strictly increasing after level 1', () => {
			for (let i = 1; i < experienceTable.levels.length; i++) {
				expect(experienceTable.levels[i].xpRequired).toBeGreaterThan(
					experienceTable.levels[i - 1].xpRequired,
				);
			}
		});
	});

	// ---------------------------------------------------------------------------
	// Progression — endless mode config
	// ---------------------------------------------------------------------------

	describe('endlessModeConfig', () => {
		it('parses endless mode config without errors', () => {
			expect(() => EndlessModeConfigSchema.parse(progressionRaw.endlessModeConfig)).not.toThrow();
		});

		it('has at least 1 enemy in the pool', () => {
			expect(endlessModeConfig.enemyPool.length).toBeGreaterThanOrEqual(1);
		});

		it('scaling multipliers are >= 1', () => {
			expect(endlessModeConfig.scaling.healthMultiplier).toBeGreaterThanOrEqual(1);
			expect(endlessModeConfig.scaling.speedMultiplier).toBeGreaterThanOrEqual(1);
		});

		it('speedCap is greater than 1', () => {
			expect(endlessModeConfig.scaling.speedCap).toBeGreaterThan(1);
		});

		it('backgroundKey is a non-empty string', () => {
			expect(typeof endlessModeConfig.backgroundKey).toBe('string');
			expect(endlessModeConfig.backgroundKey.length).toBeGreaterThan(0);
		});
	});

	// ---------------------------------------------------------------------------
	// Cross-reference validation
	// ---------------------------------------------------------------------------

	describe('cross-references', () => {
		const enemyIds = new Set(enemies.map((e) => e.id));
		const bossIds = new Set(bosses.map((b) => b.id));
		const weaponTypes = new Set(weapons.map((w) => w.type));

		it('every spawn entry enemyId in campaign waves exists in v1 enemies', () => {
			const missing: string[] = [];
			for (const stage of campaign.stages) {
				for (const level of stage.levels) {
					for (const wave of level.waves) {
						for (const spawn of wave.spawns) {
							if (!enemyIds.has(spawn.enemyId)) {
								missing.push(spawn.enemyId);
							}
						}
					}
				}
			}
			expect(missing).toEqual([]);
		});

		it('every bossId referenced in a campaign stage exists in the bosses array', () => {
			const missing: string[] = [];
			for (const stage of campaign.stages) {
				if (!bossIds.has(stage.bossId)) {
					missing.push(stage.bossId);
				}
			}
			expect(missing).toEqual([]);
		});

		it('every boss phase minionSpawn enemyId exists in the enemies array', () => {
			const missing: string[] = [];
			for (const boss of bosses) {
				for (const phase of boss.phases) {
					for (const minion of phase.minionSpawns) {
						if (!enemyIds.has(minion.enemyId)) {
							missing.push(minion.enemyId);
						}
					}
				}
			}
			expect(missing).toEqual([]);
		});

		it('every ship defaultWeaponType exists in the primary weapons array', () => {
			const missing: string[] = [];
			for (const ship of ships) {
				if (!weaponTypes.has(ship.baseStats.defaultWeaponType)) {
					missing.push(`${ship.id}: ${ship.baseStats.defaultWeaponType}`);
				}
			}
			expect(missing).toEqual([]);
		});

		it('endless enemy pool IDs all exist in the enemies array', () => {
			const missing: string[] = [];
			for (const id of endlessModeConfig.enemyPool) {
				if (!enemyIds.has(id)) {
					missing.push(id);
				}
			}
			expect(missing).toEqual([]);
		});

		it('endless mini-boss pool IDs all exist in the bosses array', () => {
			const missing: string[] = [];
			for (const id of endlessModeConfig.miniBossPool) {
				if (!bossIds.has(id)) {
					missing.push(id);
				}
			}
			expect(missing).toEqual([]);
		});

		it('all enemy IDs in the v1 set are unique', () => {
			const ids = enemies.map((e) => e.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('all boss IDs are unique', () => {
			const ids = bosses.map((b) => b.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('all weapon IDs are unique', () => {
			const ids = weapons.map((w) => w.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('all ship IDs are unique', () => {
			const ids = ships.map((s) => s.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});
	});
});
