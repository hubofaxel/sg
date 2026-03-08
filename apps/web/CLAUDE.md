# apps/web — SvelteKit app shell

- Svelte 5 runes syntax only — no legacy `$:` reactivity
- Tailwind 4 for all DOM styling — never style Phaser internals with Tailwind
- Game canvas lives in ONE component: `src/lib/components/GameCanvas.svelte`
- Routes: `/`, `/play` — live; `/settings`, `/about` — planned (Phase 11)
- Local persistence via `@sg/contracts` save schema + localStorage wrapper
- All settings changes go through a Svelte store backed by validated schema
- Import game functionality from `@sg/game` only — never import `phaser` directly

## Branding & Web Integration

- `app.html` has favicon (ICO + SVG), apple-touch-icon, manifest link, theme-color, OG tags
- `static/manifest.webmanifest` — PWA manifest with standard + maskable icons
- Icons in `static/`: favicon.ico, favicon.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
- OG image at `static/og-image.png` (1200x630 social sharing card)
- Branding source assets in `static/assets/branding/` (logo-mark, logo-wordmark, og-image)
- See `docs/branding.md` for full brand specification
