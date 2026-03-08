# Ship Game — Branding Specification

## Brand Posture

**Confident, minimal, knowingly literal.**

The name "Ship Game" is not a placeholder — it is a deliberate identity choice. The visual system communicates: stripped down, sharp, playful, and self-assured. This is an arcade-clean game, not a prestige space opera. The brand should feel crisp, fast, and a little cheeky.

---

## Name

**Ship Game**

- Always written as two words, title case: `Ship Game`
- Monospace/pixel contexts: `SHIP GAME` (all caps)
- Never: "ShipGame", "ship-game", "The Ship Game"
- Code/package scope: `@sg/` (lowercase abbreviation)

---

## Brand Mark System

The identity is designed **micro-mark first** — from 16px upward, not 512px downward. Every surface must derive from the same silhouette foundation.

### 1. Micro Mark (16x16 — 32x32)

The brand foundation. A brutally simple top-down Viper silhouette that reads at favicon scale.

**Rules:**
- Must pass the **1-bit read test**: works as a single-color silhouette
- Ship nose, wing shape, one cyan engine core accent — maximum
- No internal shading, no detail that disappears below 32px
- No circular badge, no background shape — just the mark

**Pixel grid:** 16x16 native, nearest-neighbor upscale to 32x32

### 2. Full-Color Pixel Badge (64x64 — 128x128 native)

The richer mark for app icons and install surfaces. Same silhouette as the micro mark, with more atmosphere.

**Rules:**
- Canonical source: **64x64 or 128x128 pixel grid** — this is the master asset
- Same silhouette as micro mark, with added: engine glow, wing detail, subtle hull shading
- Still limited palette (max 12 colors)
- Clean upscale to 192x192 and 512x512 via nearest-neighbor
- No circular badge framing — the silhouette IS the brand

### 3. Wordmark Lockup

`SHIP GAME` set in a bespoke or heavily customized pixel typeface beside or below the mark.

**Rules:**
- Derived from the same pixel grid logic as the mark — feels like one system
- Not a generic downloadable pixel font used untouched
- A few signature cuts/angles that echo the Viper ship geometry
- Horizontal lockup (mark left, wordmark right) is primary
- Stacked lockup (mark above, wordmark below) is secondary
- Minimum clear space: 1x mark width on all sides

---

## Color System

Colors are drawn from the in-game visual language. Each has a specific role — do not cross purposes.

| Token | Hex | Role | Usage |
|---|---|---|---|
| `--sg-cyan` | `#00D4FF` | **Signature / Player** | Engine glow, brand primary, links, interactive elements |
| `--sg-red` | `#FF3E00` | **Danger / Enemy** | Alerts, errors, enemy accents — never brand primary |
| `--sg-space` | `#0A0A1A` | **Background** | App background, dark surfaces, OG image base |
| `--sg-silver` | `#E0E0E0` | **Text / Hull** | Body text, ship hull, secondary UI |
| `--sg-gold` | `#FFD700` | **Reward / Score** | Currency, achievements, score displays |
| `--sg-dark` | `#141428` | **Surface** | Cards, panels, elevated surfaces |

**Key principle:** Cyan is reserved for identity and player energy. Red is gameplay tension, not brand. Gold is reward/celebration. Silver-white is used sparingly — avoid turning the mark into a noisy three-value cluster at small sizes.

---

## Typography

| Context | Font | Fallback |
|---|---|---|
| Wordmark | Bespoke pixel type (TBD) | — |
| UI headings | Monospace pixel font | `'Courier New', monospace` |
| UI body | System monospace | `ui-monospace, 'Cascadia Code', 'Fira Code', monospace` |
| Marketing copy | System sans-serif | `system-ui, -apple-system, sans-serif` |

The game and UI use monospace throughout. Marketing surfaces (README, project page) may use system sans-serif for readability, but headings should echo the pixel aesthetic.

---

## Deliverables

### Icon Set

All icons originate from the pixel-master mark. Upscale via nearest-neighbor only — no smoothing.

| Asset | Size | Format | Purpose | Notes |
|---|---|---|---|---|
| Micro mark | 16x16 | PNG | Favicon base | 1-bit readable |
| Micro mark | 32x32 | PNG | 2x favicon | Nearest-neighbor from 16x16 |
| Favicon | 48x48 | PNG | Browser tab (bundled in .ico) | — |
| SVG favicon | scalable | SVG | Progressive enhancement | Separate interpretation of silhouette rules, not auto-traced |
| Favicon bundle | multi | ICO | Legacy browser fallback | Contains 16, 32, 48 PNGs |
| Apple touch icon | 180x180 | PNG | iOS home screen | Padded appropriately |
| Standard app icon | 192x192 | PNG | PWA manifest (`"purpose": "any"`) | Nearest-neighbor from 64x64 master |
| Standard app icon | 512x512 | PNG | PWA manifest / store listing | Nearest-neighbor from 64x64 or 128x128 master |
| Maskable icon | 512x512 | PNG | PWA manifest (`"purpose": "maskable"`) | **Separate asset** — extra safe-zone padding, no transparency |
| Monochrome icon | 512x512 | SVG | PWA manifest (`"purpose": "monochrome"`) | Single-color silhouette, future nice-to-have |

### Maskable Icon Discipline

The maskable icon is a **separate deliverable**, not a crop of the standard icon.

- Platforms mask to circles, squircles, and rounded squares
- Important content must stay inside the safe zone (centered 80% circle)
- **No transparent pixels** — use `--sg-space` (#0A0A1A) as solid background fill
- The mark should be scaled smaller within the canvas to survive all mask shapes
- Test with [maskable.app](https://maskable.app/) before shipping

### Social / Marketing

| Asset | Size | Format | Purpose |
|---|---|---|---|
| OG image | 1200x630 | PNG | Social sharing (Open Graph / Twitter Card) |
| OG image (2x) | 2400x1260 | PNG | High-DPI social preview (optional) |

**OG image composition** — not just "icon on starfield":
- Left or center-left: enlarged hero ship with engine glow
- Controlled star field and subtle atmosphere
- Right or lower-right: `SHIP GAME` wordmark
- One secondary accent: enemy swarm, projectile line, or score-like UI stripe
- Reads as a real game brand, not a placeholder share card

---

## Generation Strategy

The brand assets are **pixel-first, not vector-first**. The canonical mark originates on a strict pixel grid.

### Pipeline

1. **Micro mark** (16x16): Hand-placed pixels or code-drawn — this is the truth
2. **Pixel badge** (64x64 or 128x128): Expand from micro mark on pixel grid
3. **Full-color app icons** (192, 512): Nearest-neighbor upscale from pixel badge
4. **Maskable icon** (512x512): Separate composition with safe-zone padding + solid bg
5. **SVG favicon**: Separate vector interpretation of the silhouette — not an auto-trace
6. **Wordmark**: Pixel grid type design, exported as PNG at needed sizes
7. **OG image**: Composed scene using upscaled ship + wordmark + background elements

### OpenAI Generation Role

The asset pipeline can generate the **pixel badge** (step 2) — same workflow as game sprites. Add a `logo-mark` key to the asset catalog.

The **micro mark** should be hand-refined or code-drawn after generation, because AI output at 16x16 effective resolution is unreliable. The generated badge serves as the design reference; the micro mark is a deliberate simplification.

The **OG image** can be generated as a scene composition, or assembled from existing assets (ship sprite + background + wordmark overlay).

---

## Integration Points

### SvelteKit (`apps/web`)

```
apps/web/
  static/
    favicon.ico          # 16+32+48 multi-res ICO
    favicon.svg          # SVG adaptive favicon (replaces Svelte logo)
    apple-touch-icon.png # 180x180
    icon-192.png         # Standard app icon
    icon-512.png         # Standard app icon
    icon-maskable-512.png # Maskable variant
    og-image.png         # 1200x630 social card
```

### `app.html` Meta Tags

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0A0A1A">
```

### Web App Manifest

```json
{
  "name": "Ship Game",
  "short_name": "Ship Game",
  "description": "Arcade space shooter",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0A0A1A",
  "background_color": "#0A0A1A",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Open Graph Tags

```html
<meta property="og:title" content="Ship Game">
<meta property="og:description" content="Arcade space shooter">
<meta property="og:image" content="/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

---

## Design Principles

1. **Micro-mark drives everything.** If it doesn't work at 16x16, the identity is wrong.
2. **1-bit read test.** The mark must be recognizable as a single-color silhouette.
3. **Pixel-first, vector-second.** Master assets live on a pixel grid. SVG is a separate interpretation.
4. **Silhouette over badge.** The ship shape is the brand. Circular frames are optional decoration.
5. **Cyan is identity.** Reserve it for the brand mark and player-facing elements.
6. **Less detail in the logo than the sprite.** Brand marks are not spritesheets.
7. **Maskable is a separate asset.** Never crop the standard icon — design for safe zones intentionally.
8. **Arcade-clean, not prestige-sci-fi.** Crisp, fast, a little cheeky.

---

## Implementation Status

| Deliverable | Status | Notes |
|---|---|---|
| Branding spec | Done | `docs/branding.md` |
| Logo mark (pixel badge) | Done | Generated via OpenAI, 1024x1024 source → `branding/logo-mark.png` |
| Wordmark lockup | Done | Generated via OpenAI → `branding/logo-wordmark.png` |
| OG image (1200x630) | Done | Generated via OpenAI → `branding/og-image.png` + `static/og-image.png` |
| Favicon PNGs (16, 32, 48) | Done | Nearest-neighbor from logo mark |
| ICO favicon bundle | Done | `static/favicon.ico` (16+32+48) |
| SVG favicon | Done | Hand-crafted `static/favicon.svg` |
| Apple touch icon (180) | Done | `static/apple-touch-icon.png` |
| Standard app icons (192, 512) | Done | `static/icon-192.png`, `static/icon-512.png` |
| Maskable icon (512) | Done | `static/icon-maskable-512.png` (70% mark on #0A0A1A) |
| app.html wiring | Done | Favicon, apple-touch, manifest, theme-color, OG tags |
| Web app manifest | Done | `static/manifest.webmanifest` |
| OG meta tags | Done | In `app.html` |
| README update | Done | Root `README.md` |
| Monochrome icon | Not started | Nice-to-have for future |
