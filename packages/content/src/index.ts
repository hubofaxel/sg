// ---------------------------------------------------------------------------
// @sg/content — barrel export (parse-validated)
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
import { z } from 'zod';
import bossesRaw from './enemies/bosses.json';
import v1EnemiesRaw from './enemies/v1-enemies.json';
import progressionRaw from './progression/progression.json';
import starterShipsRaw from './ships/starter.json';
import campaignRaw from './waves/campaign.json';
import primaryWeaponsRaw from './weapons/primary.json';

// Weapons
export const primaryWeapons = z.array(WeaponSchema).parse(primaryWeaponsRaw);

// Ships
export const starterShips = z.array(ShipSchema).parse(starterShipsRaw);

// Enemies
export const v1Enemies = z.array(EnemySchema).parse(v1EnemiesRaw);
export const bosses = z.array(BossSchema).parse(bossesRaw);

// Waves / Campaign
export const campaign = CampaignSchema.parse(campaignRaw);

// Progression
export const experienceTable = ExperienceTableSchema.parse(progressionRaw.experienceTable);
export const endlessModeConfig = EndlessModeConfigSchema.parse(progressionRaw.endlessModeConfig);
