# @sg/web — SvelteKit App Shell

SvelteKit application shell for Ship Game. Owns routes, menus, settings, persistence UI.

## Routes

| Route | Purpose |
|---|---|
| `/` | Home — title screen with play/settings navigation |
| `/play` | Fullscreen game canvas (mounts Phaser via `@sg/game`) |
| `/settings` | Volume, screen shake, FPS toggle — persisted to localStorage |

## Key Components

- `GameCanvas.svelte` — mounts Phaser game engine via dynamic import (SSR-safe)
- `settings.svelte.ts` — reactive settings store using Svelte 5 runes + localStorage

## Development

```bash
# From workspace root
pnpm dev          # Start SvelteKit dev server
pnpm build        # Production build
pnpm test:e2e     # Playwright smoke tests
```

## Boundaries

- Imports `@sg/game` barrel only — never imports `phaser` directly
- All settings validate against `GameSettingsSchema` from `@sg/contracts`
- Phaser is dynamically imported inside `onMount` to avoid SSR failures
