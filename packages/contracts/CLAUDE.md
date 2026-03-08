# packages/contracts — Zod 4 schemas

- Every schema file exports both the Zod schema and the inferred TS type
- Naming: `FooSchema` (Zod object) + `Foo` (type) in same file
- File naming: `domain.schema.ts` in domain subdirectories (e.g., `weapon/weapon.schema.ts`)
- Save schema MUST include `version: z.number()` — migrations are mandatory
- No Phaser types. No SvelteKit types. Pure data contracts only.
- When adding a schema: create schema -> create test -> create sample content -> validate
- Only runtime dependency: `zod`

## Directory structure

```
src/
  asset/asset.schema.ts        # AssetManifest, AssetEntry (sprite-sheet/image/audio), FrameConfig
  common/base.schema.ts        # EntityId, Vec2, Hitbox, StatRange, DropTable, Cooldown
  weapon/weapon.schema.ts      # Weapon, WeaponLevel, SecondaryWeapon, WeaponRecipe
  ship/ship.schema.ts          # Ship, ShipStats, ShipUpgrade, PlayerShipState
  enemy/enemy.schema.ts        # Enemy, Boss, BossPhase, MovementPattern, AttackType
  wave/wave.schema.ts          # Wave, Level, Stage, Campaign, EndlessMode
  economy/economy.schema.ts    # ExperienceTable, ShopItem, PlayerEconomyState
  settings/settings.schema.ts  # GameSettings, ControlScheme
  save/save.schema.ts          # SaveGame, migrations, createNewSave
  index.ts                     # Barrel export — all schemas + types
```
