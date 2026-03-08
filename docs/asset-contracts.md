# Asset Contracts

Every game asset has a contract defining its source strategy, owning system, dimensions, and acceptance criteria. This document is the policy layer — the machine-readable truth lives in `tools/asset-gen/src/config/asset-catalog.ts`.

## Source Strategy Classification

Every asset is exactly one of:

| Strategy | Meaning | Writes to |
|---|---|---|
| **wired-existing** | Already on disk — just needs game code to use it | N/A (code change only) |
| **generated-final** | AI output is the shipping artifact (after staging review) | `.work/staging/` → `apps/web/static/assets/` |
| **generated-source** | AI output is source material — needs manual cleanup before shipping | `.work/staging/` (stays there until cleaned) |
| **code-drawn** | Rendered at runtime via Phaser drawing API / tweens / particles | N/A (no asset file) |
| **deferred** | Planned but not yet needed — do not pre-generate | N/A |

### The <32px Rule

> Assets under ~32px in their shipped form default to **code-drawn** unless there is a strong reason otherwise.

AI image generation produces 1024x1024+ output that gets reduced to final size. At micro-sprite scale, code-drawn effects (rectangles, circles, blend modes, tweens) are sharper and more controllable than reduced AI art.

## Current Asset Registry

### Sprites — shipped

| Key | Strategy | Owner | Dims | Frames | Status |
|---|---|---|---|---|---|
| `ship-viper` | generated-final | GameScene (player) | 64x64 | 3 (bank-left, neutral, bank-right) | shipped |
| `enemy-drone` | generated-final | WaveManager → EnemyMovement | 48x48 | 2 (eye bright, eye dim) | shipped |
| `enemy-weaver` | generated-final | WaveManager → EnemyMovement | 48x48 | 2 (body curved L, body curved R) | shipped |
| `enemy-bruiser` | generated-final | WaveManager → EnemyMovement | 64x64 | 2 (armor sealed, core open) | shipped |
| `enemy-kamikaze` | generated-final | WaveManager → EnemyMovement | 48x48 | 2 (normal thrust, max burn) | shipped |
| `enemy-zigzagger` | generated-final | WaveManager → EnemyMovement | 48x48 | 2 (banking L, banking R) | shipped |
| `boss-iron-sentinel` | generated-final | BossManager | 128x128 | 2 (shields-up, core-exposed) | shipped |

### Backgrounds — shipped

| Key | Strategy | Owner | Dims | Status |
|---|---|---|---|---|
| `bg-starfield-sparse` | generated-final | GameScene (Level 1) | 1536x1024 | shipped |
| `bg-starfield-dense` | generated-final | GameScene (Levels 2-3) | 1536x1024 | shipped |
| `bg-endless-void` | generated-final | GameScene (Endless mode) | 1536x1024 | shipped |
| `default-bg` | manual | PreloadScene fallback | 480x320 | shipped |

### Audio — shipped

| Key | Strategy | Owner | Status |
|---|---|---|---|
| `music-outer-rim` | generated-final | AudioManager (Stage 1) | shipped |
| `sfx-laser` | generated-final | GameScene → handleFiring | shipped |
| `sfx-hit` | generated-final | GameScene → onBulletHitEnemy, takeDamage | shipped |
| `sfx-enemy-death` | generated-final | GameScene → onBulletHitEnemy | shipped |
| `sfx-player-death` | generated-final | GameScene → triggerGameOver | shipped |
| `sfx-boss-alarm` | generated-final | BossManager → showWarningBanner | shipped |

### Audio — wired-existing (on disk, not yet used in code)

| Key | Strategy | Owner | Planned use |
|---|---|---|---|
| `sfx-explosion-small` | wired-existing | CombatFeedback → deathBurst | Layer with enemy kill |
| `sfx-explosion-large` | wired-existing | BossManager → chainExplosions | Boss death sequence |
| `sfx-menu-select` | wired-existing | MenuScene | Button hover/focus |
| `sfx-menu-confirm` | wired-existing | MenuScene | Start game |
| `sfx-pickup` | wired-existing | DropManager (Phase 7) | Item collected |

### Audio — defaults

| Key | Strategy | Owner | Status |
|---|---|---|---|
| `default-music` | generated-final | AudioManager fallback | shipped |

### Phase 7 — Drop System (planned)

| Key | Strategy | Owner | Dims | Notes |
|---|---|---|---|---|
| `pickup-currency` | generated-source OR code-drawn | DropManager | 16x16, 1 frame | Single image + code pulse/bob. Decision: code-driven animation, not sprite sheet. |
| `pickup-token` | generated-source OR code-drawn | DropManager | 16x16, 1 frame | Same approach as currency. Distinct color (cyan/green vs gold). |

### Phase 8 — Stage Presentation (catalogued, ready to generate)

| Key | Strategy | Owner | Duration | Notes |
|---|---|---|---|---|
| `sfx-stage-clear` | generated-final | GameScene → handleStageClear | 2.0s | Arcade victory stinger, bright synth arpeggio |

### Phase 9 — Ship Visual State (code-drawn, no assets)

| Effect | Strategy | Owner | Notes |
|---|---|---|---|
| Muzzle flash | code-drawn | GameScene → handleFiring | Expanding white circles with additive blend |
| Engine glow | code-drawn | GameScene → handleMovement | Tinted rectangle behind ship, intensity from velocity |
| Projectile visuals | code-drawn | GameScene → handleFiring | Color/size from weaponStats per tier |

### Phase 10 — Audio Polish (catalogued, ready to generate)

| Key | Strategy | Owner | Duration | Notes |
|---|---|---|---|---|
| `music-boss` | generated-final | AudioManager | 75s | Composition-plan workflow: 5 sections (intro → groove → escalation → breakdown → re-entry). 146 BPM E minor aggressive synthwave. Loop point is editorial post-gen. |
| `sfx-low-health` | generated-final | AudioManager / HUD | 0.5s | Synthetic heartbeat warning pulse, designed for loop playback without fatigue |

### Phase 12 — Encounter Director (catalogued, ready to generate)

| Key | Strategy | Owner | Duration/Dims | Notes |
|---|---|---|---|---|
| `sfx-telegraph` | generated-final | EncounterDirector | 0.5s (trim to ~0.3s post-gen) | Sharp warning ping. API minimum is 0.5s; trim in post. |
| `sprite-telegraph` | generated-final | EncounterDirector | 32×32, 2 frames | Diamond warning marker: bright (white-yellow center) / dim (deep red). Geometric, no organic detail. |

## Acceptance Criteria by Type

### Backgrounds
- Hash differs from every other background key
- Readable behind bullets, enemies, and UI text
- Survives tint/blur/parallax if applied
- No bright focal object that competes with gameplay sprites
- Dark enough for white HUD text to remain legible

### Sprites (>32px)
- Silhouette recognizable at shipped scale
- Distinct from other sprites in same group (enemies look different from each other)
- Clean edges on transparent background
- Frame deltas are visible and meaningful
- Sheet dimensions match catalog (frameWidth × frameCount = sheet width)

### SFX
- No clipping (peak below 0 dBFS)
- Duration within target range (catalog `audioDuration` ± 20%)
- Normalized loudness relative to existing mix
- Distinguishable semantic role in play (hit ≠ death ≠ pickup)
- Clean transient at start for responsive game feel

### Music
- Loopable without jarring transition
- Genre-consistent with existing tracks (synthwave/electronic)
- Not fatiguing over extended play (no harsh frequencies)
- Duration within target range

### Code-drawn effects
- Frame budget acceptable (no dropped frames during heavy combat)
- Color ties to game state (weapon tier, health, etc.)
- No visual noise that obscures gameplay
- Consistent with pixel art aesthetic (no smooth gradients)

### VFX / Effects (generated, 32px+)
- Strong silhouette readability at shipped scale
- Clear frame-to-frame progression (ignition → peak → breakup → dissipation)
- Consistent color language: damage=warm (white/yellow/orange/red), energy=cool (white/cyan/blue/violet)
- Centered and aligned consistently across all frames in sheet
- No anti-aliasing, no soft glow, no painterly rendering
- See `docs/vfx-prompt-library.md` for full prompt templates and patterns

## Generation Policy

### Two-pass generation
1. First pass: **medium** quality
2. Review against acceptance criteria
3. Second pass: only re-run failed candidates at **high** quality

### Model selection

| Use case | Model | API |
|---|---|---|
| Canonical image assets | gpt-image-1.5 | images.generate |
| Cheap ideation / drafts | gpt-image-1-mini | images.generate |
| Frame variants from parent | gpt-image-1.5 | images.edit |
| Lineage edits | gpt-image-1.5 | responses.create |
| Sound effects | ElevenLabs | textToSoundEffects.convert |
| Music | ElevenLabs | music.compose |

### Staging flow
1. `generate` writes to `.work/staging/<key>/<timestamp>/`
2. Review asset + metadata against acceptance criteria
3. `promote --key <key>` copies to runtime path
4. `manifest` rebuilds manifest from runtime files
5. `validate` confirms consistency

### No silent overwrite rule
If a promoted asset would replace an existing runtime file:
- New hash must differ from old hash
- Promote command logs old vs new hash
- Manifest diff is visible in git
