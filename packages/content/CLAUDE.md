# packages/content — Game data

- Every data file must validate against its contract in `@sg/contracts`
- Content is loaded and validated at app startup — validation failure = hard crash
- Content changes require re-running `pnpm --filter @sg/contracts test`
- Balance values (damage, speed, health, wave timing) live here, not in game code
- Barrel export in `src/index.ts` re-exports all content as typed constants

## Directory structure

```
src/
  weapons/primary.json         # 4 weapon definitions (laser, spread, missile, beam)
  ships/starter.json           # Starter ship (Viper) with upgrade paths
  enemies/v1-enemies.json      # 5 v1 enemy types
  enemies/bosses.json          # Boss definitions (Iron Sentinel)
  waves/campaign.json          # Campaign structure (stages, levels, waves)
  progression/progression.json # Experience table + endless mode config
  index.ts                     # Barrel export — typed content constants
```

## Key content fields consumed by game systems

- **movementPattern** → `EnemyMovement` system (linear, sine-wave, zigzag, spiral, strafe-hover)
- **attackType, fireInterval, projectileDamage** → `EnemyAttack` system (aimed-shot, spread-shot, contact-only, ram)
- **combatFeedback** → `CombatFeedback` system (optional — omit for schema defaults)
  - Bruiser and Iron Sentinel have explicit overrides for heavier visual weight
  - Other enemies use schema defaults (80ms flash, 30ms hit-stop, 150ms death burst, 200ms spawn-in)
