# apps/web — SvelteKit app shell

- Svelte 5 runes syntax only — no legacy `$:` reactivity
- Tailwind 4 for all DOM styling — never style Phaser internals with Tailwind
- Game canvas lives in ONE component: `src/lib/components/GameCanvas.svelte`
- Routes: `/`, `/play` — live; `/settings`, `/about` — planned (Phase 11)
- Local persistence via `@sg/contracts` save schema + localStorage wrapper
- All settings changes go through a Svelte store backed by validated schema
- Import game functionality from `@sg/game` only — never import `phaser` directly
