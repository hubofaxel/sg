---
name: monorepo-conventions
description: pnpm workspace structure, tsconfig references, and cross-package conventions. Load when scaffolding packages or modifying workspace config.
---

## Monorepo Conventions

### Workspace layout
```
sg/
  pnpm-workspace.yaml        # packages: [apps/*, packages/*, tools/*]
  biome.json                  # Root — shared config
  vitest.workspace.ts         # Vitest workspace config
  apps/web/                   # SvelteKit app (@sg/web)
  packages/game/              # Phaser 4 runtime (@sg/game)
  packages/contracts/         # Zod schemas + types (@sg/contracts)
  packages/content/           # JSON game data (@sg/content)
  packages/ui/                # Shared non-Phaser UI (@sg/ui)
  tools/scripts/              # Build/dev/asset scripts (@sg/scripts)
  tools/asset-gen/            # AI asset generation pipeline (@sg/asset-gen)
```

### Package naming
All packages use `@sg/` scope:
- `@sg/web` (private, not published)
- `@sg/game`
- `@sg/contracts`
- `@sg/content`
- `@sg/ui`
- `@sg/scripts`
- `@sg/asset-gen`

### Dependency rules (strict — no violations)
- `@sg/contracts` depends on: nothing (leaf node)
- `@sg/content` depends on: `@sg/contracts`
- `@sg/game` depends on: `@sg/contracts`, `@sg/content`, `phaser`
- `@sg/ui` depends on: `@sg/contracts`, `svelte`
- `@sg/web` depends on: `@sg/game`, `@sg/contracts`, `@sg/content`, `@sg/ui`
- `@sg/asset-gen` depends on: `@sg/contracts`, `openai`, `sharp`, `@elevenlabs/elevenlabs-js`
- Circular dependencies are forbidden — will break the build

### Cross-package imports
- Use workspace protocol: `"@sg/contracts": "workspace:*"`
- Import via package name: `import { WeaponSchema } from '@sg/contracts'`
- Never use relative paths across package boundaries

### Script conventions
All packages support: `check` (typecheck), `test` (vitest, if applicable)
Root scripts orchestrate: `pnpm -r check`, `pnpm test`
