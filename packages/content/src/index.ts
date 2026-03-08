// ---------------------------------------------------------------------------
// @sg/content — barrel export
// ---------------------------------------------------------------------------

import type {
	Boss,
	Campaign,
	EndlessModeConfig,
	Enemy,
	ExperienceTable,
	Ship,
	Weapon,
} from '@sg/contracts';

// Weapons
import primaryWeaponsRaw from './weapons/primary.json';
export const primaryWeapons: Weapon[] = primaryWeaponsRaw as unknown as Weapon[];

// Ships
import starterShipsRaw from './ships/starter.json';
export const starterShips: Ship[] = starterShipsRaw as unknown as Ship[];

// Enemies
import v1EnemiesRaw from './enemies/v1-enemies.json';
export const v1Enemies: Enemy[] = v1EnemiesRaw as unknown as Enemy[];

import bossesRaw from './enemies/bosses.json';
export const bosses: Boss[] = bossesRaw as unknown as Boss[];

// Waves / Campaign
import campaignRaw from './waves/campaign.json';
export const campaign: Campaign = campaignRaw as unknown as Campaign;

// Progression
import progressionRaw from './progression/progression.json';
export const experienceTable: ExperienceTable =
	progressionRaw.experienceTable as unknown as ExperienceTable;
export const endlessModeConfig: EndlessModeConfig =
	progressionRaw.endlessModeConfig as unknown as EndlessModeConfig;
