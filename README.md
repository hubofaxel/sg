# Ship Game

Arcade space shooter built with SvelteKit and Phaser 4.

Web-first, pixel art, data-driven. Play in the browser, install as a PWA.

## Tech Stack

| Layer | Technology |
|---|---|
| App shell | SvelteKit + Svelte 5 |
| Game engine | Phaser 4 RC |
| Schemas | Zod 4 |
| Tooling | pnpm workspaces, Biome, Vitest |
| Asset pipeline | OpenAI (sprites) + ElevenLabs (audio) |

## Workspace

```
apps/web/          SvelteKit app — routes, UI, static serving
packages/game/     Phaser 4 runtime — scenes, systems, physics
packages/contracts/ Zod schemas — data contracts for all content
packages/content/  Level data, enemy stats, weapon tables (JSON)
packages/ui/       Reusable Svelte 5 components
tools/asset-gen/   AI asset generation pipeline
tools/scripts/     Dev server, build, and utility scripts
```

## Quick Start

```bash
pnpm install
pnpm dev
```

Open [localhost:5173/play](http://localhost:5173/play) to play.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm check` | Typecheck all packages |
| `pnpm lint` | Biome lint |
| `pnpm test` | Vitest unit tests |
| `pnpm validate` | Full quality gate (check + lint + build + test + e2e + asset validation + boundaries) |

## Architecture

SvelteKit owns the app. Phaser owns the play surface. The boundary is one function:

```ts
import { mountGame } from '@sg/game';

const handle = mountGame(element, options);
```

No Phaser types leak outside `packages/game`. All content validates against `@sg/contracts` schemas at startup.

## Development

- **Node 24** via mise
- **Biome** for formatting and linting (not Prettier, not ESLint)
- **Conventional commits**: `type(scope): description`
- **Trunk-based development**: short-lived feature branches, atomic PRs

See [docs/ROADMAP.md](docs/ROADMAP.md) for the phase-by-phase development plan.

## License

All rights reserved.
