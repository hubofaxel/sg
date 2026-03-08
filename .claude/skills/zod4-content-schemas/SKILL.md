---
name: zod4-content-schemas
description: Schema-first content architecture using Zod 4. Load when creating or modifying schemas in packages/contracts/.
---

## Zod 4 Content Schema Patterns

### File template
```typescript
import { z } from 'zod';

export const WeaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  damage: z.number().positive(),
  fireRate: z.number().positive(),
  projectileSpeed: z.number().positive(),
  spread: z.number().min(0).max(360).default(0),
  type: z.enum(['bullet', 'laser', 'missile', 'beam']),
});

export type Weapon = z.infer<typeof WeaponSchema>;
```

### Save schema versioning (mandatory)
```typescript
export const SaveGameSchema = z.object({
  version: z.number(),           // ALWAYS PRESENT
  timestamp: z.string().datetime(),
  playerName: z.string().default('Pilot'),
  highScore: z.number().default(0),
  settings: GameSettingsSchema,
  unlocks: z.array(z.string()).default([]),
});

export type SaveGame = z.infer<typeof SaveGameSchema>;
```

### Migration pattern
```typescript
const CURRENT_VERSION = 2;

function migrateSave(raw: unknown): SaveGame {
  let data = raw as Record<string, unknown>;
  if ((data.version as number) < 2) {
    data = { ...data, unlocks: [], version: 2 };
  }
  return SaveGameSchema.parse(data);
}
```

### Testing pattern
```typescript
import { describe, test, expect } from 'vitest';
import { WeaponSchema } from './weapon';

describe('WeaponSchema', () => {
  const valid = {
    id: 'basic-laser',
    name: 'Basic Laser',
    damage: 10,
    fireRate: 5,
    projectileSpeed: 300,
    spread: 0,
    type: 'bullet' as const,
  };

  test('validates correct data', () => {
    expect(() => WeaponSchema.parse(valid)).not.toThrow();
  });

  test('rejects negative damage', () => {
    expect(() => WeaponSchema.parse({ ...valid, damage: -1 })).toThrow();
  });

  test('rejects invalid weapon type', () => {
    expect(() => WeaponSchema.parse({ ...valid, type: 'nuke' })).toThrow();
  });
});
```

### Barrel export pattern
```typescript
// packages/contracts/src/index.ts
export { WeaponSchema, type Weapon } from './weapon';
export { EnemySchema, type Enemy } from './enemy';
export { WaveSchema, type Wave } from './wave';
export { SaveGameSchema, type SaveGame } from './saveGame';
export { GameSettingsSchema, type GameSettings } from './gameSettings';
```
