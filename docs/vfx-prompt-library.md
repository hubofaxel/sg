# VFX Prompt Library

Reference for AI-generated visual effects. Used by the asset-pipeline agent when generating VFX sprite sheets via OpenAI image models.

**Policy**: Effects under ~32px shipped size are code-drawn (see `docs/asset-contracts.md`). This library applies to generated VFX at 32px+ scale — primarily enemy death explosions, boss death sequences, and large impact effects.

## Prompt Structure Pattern

Every VFX prompt follows this order:

```
1. Asset type + game genre + viewpoint
2. Subject description (what the effect is)
3. Frame progression (for sprite sheets — ignition → peak → breakup → dissipation)
4. Style declaration
5. Composition rules (centering, alignment, spacing)
6. Color palette (specific colors)
7. Rendering constraints (pixel rules, what to enforce)
8. Background specification
9. Avoid list (what NOT to generate)
```

## Style-Lock Preamble

Prepend to any VFX prompt for consistency across the set:

```text
Create polished professional pixel-art VFX for a 2D arcade space shooter.
Use crisp pixel edges, strong silhouette readability, high contrast,
transparent background, centered composition, no anti-aliasing, no motion blur,
no text, no UI, no mockup, no background scene.
Keep all effects in one unified visual language.
```

This preamble is automatically composed via `style-bible.ts` when the `effects` category is active — you don't need to paste it manually.

## Scale Modifiers

Append based on the asset's shipped frame size.

### 16x16 (code-drawn territory — use only if overriding <32px rule)

```text
Design this to read clearly at approximately 16x16 in-game scale.
Use very simple shapes, very few pixels, and prioritize silhouette over detail.
```

### 32x32

```text
Design this to read clearly at approximately 32x32 in-game scale.
Use strong silhouette first, then modest internal breakup and secondary detail.
```

### 48x48 (enemy-scale effects)

```text
Design this to read clearly at approximately 48x48 in-game scale.
Use strong silhouette first, readable internal structure, and moderate breakup detail.
```

### 64x64+ (boss-scale effects)

```text
Design this to read clearly at approximately 64x64 in-game scale.
Use layered shapes, secondary breakup, and richer internal pixel structure
while keeping the silhouette strong.
```

### Set consistency (append when generating a family)

```text
Match the same visual language, palette logic, rendering rules,
and silhouette philosophy as the rest of the shooter VFX set.
```

## Color Language

Consistent color semantics across all VFX:

| Effect type | Palette |
|---|---|
| Fire/explosion (damage) | white core, yellow, orange, red, dark brown smoke |
| Energy/plasma (sci-fi) | white, pale cyan, bright cyan, electric blue, violet |
| Shield hit | white center, cyan-blue ring, blue-violet shards |
| Sparks (metal impact) | white, pale yellow, bright yellow, orange |
| Smoke/residue | dark gray, medium gray, brown-gray, warm ember pixels |
| Power-up (beneficial) | white core + bright cyan/green/magenta/gold (by type) |
| Boss explosion | white, yellow, orange, red, dark red, smoke brown, dark gray debris |

## Frame Progression Pattern

All animated VFX follow this arc:

```text
ignition flash → burst expansion → peak bloom → breakup/fragmentation → smoke/fade → residue
```

Useful phrases for frame descriptions:
- "clear progression from flash to burst to peak bloom to breakup to smoke fade"
- "readable at small game scale"
- "crisp pixels, no anti-aliasing, transparent background"
- "centered in each frame with consistent alignment"

---

## Prompt Templates by Category

### Enemy Death Explosions

These are the primary candidates for generated VFX — enemies die at 48-64px scale.

#### Small enemy (drone/kamikaze/zigzagger — 48px)

```text
Create a horizontal 6-frame sprite sheet of a small enemy destruction explosion
for a 2D pixel-art space shooter.

This is for a weak drone enemy, so the effect should feel quick, punchy, and compact.
Frame progression:
1) instant white flash,
2) bright yellow burst,
3) orange round fireball at peak size,
4) jagged red-orange breakup with a few embers,
5) shrinking darker red mass with tiny smoke fragments,
6) nearly gone residue.

Style: professional pixel-art VFX, compact silhouette, very readable at small size.
Composition: 6 frames in one row, consistent alignment, centered in every frame.
Color palette: white, pale yellow, saturated yellow, orange, red, dark brown smoke accents.
Rendering constraints: crisp pixels, no anti-aliasing, no blur, no oversized smoke cloud,
no background.
Background: transparent.
Avoid: realistic flames, text, numbers, scenic background, blurry glow.
```

#### Medium enemy (weaver/bruiser — 48-64px)

```text
Create a horizontal 8-frame sprite sheet of a medium-sized pixel-art ship explosion
for a 2D space shooter.

The effect should feel more substantial than a small drone kill.
Frame progression:
1) white-hot ignition flash,
2) bright yellow expansion,
3) larger orange fireball with uneven lobes,
4) jagged outer blast spikes and ember debris,
5) red breakup with visible fragmentation,
6) collapsing darker core,
7) smoke and ember fade,
8) final residue.

Style: premium modern pixel art for game effects, dramatic but clean.
Composition: 8 frames, one horizontal row, each frame centered and aligned consistently.
Color palette: white, yellow, golden orange, hot orange, red, dark red, smoke brown.
Rendering constraints: crisp pixels, no anti-aliasing, no painterly softness,
no lens effects, no background.
Background: transparent.
Avoid: text, UI, scene elements, realistic volumetric smoke, muddy edges.
```

#### Mechanical enemy with scrap debris

```text
Create a horizontal 8-frame sprite sheet of a robot or mechanical enemy death explosion
in pixel art.

The effect should combine fire, sparks, and visible machine debris.
Frame progression:
1) sharp white ignition point,
2) yellow-orange burst,
3) expanding fireball with metal fragments flying outward,
4) broken explosive shape with sparks and scrap,
5) darker red breakup,
6) gray smoke puff with a few embers,
7) debris fading outward,
8) dissipated smoke.

Style: clean readable arcade pixel art.
Composition: 8 evenly spaced frames in a single row, centered and consistently aligned.
Color palette: white, yellow, orange, red, dark gray, steel gray, small smoke brown accents.
Rendering constraints: crisp pixels, no anti-aliasing, no blur, no gore, no background.
Background: transparent.
Avoid: human body parts, text, soft gradients, cinematic realism.
```

### Boss Death Explosions

Boss deaths at 128px scale — the most dramatic VFX in the game.

#### Primary boss explosion

```text
Create a horizontal 8-frame sprite sheet of a large boss explosion
for a 2D bullet-hell pixel-art game.

This is the first major blast of a boss death, so it should feel huge,
dangerous, and high-energy.
Frame progression:
1) intense white flash,
2) massive yellow ignition bloom,
3) expanding orange fire mass with uneven lobes,
4) jagged outer blast spikes and multiple ember fragments,
5) turbulent red-orange breakup,
6) collapsing hot core with debris,
7) smoke beginning to overtake fire,
8) heavy fading blast residue.

Style: dramatic premium pixel art, strong readability at gameplay speed.
Composition: 8 large centered frames in a single row, consistent alignment.
Color palette: white, bright yellow, orange, deep orange, red, dark red, brown smoke.
Rendering constraints: crisp pixels, no anti-aliasing, no photorealistic smoke,
no scene background.
Background: transparent.
Avoid: text, labels, cinematic blur, muddy silhouettes.
```

#### Boss chain explosion (secondary bursts)

```text
Create a horizontal 8-frame sprite sheet of a secondary chain explosion
for a giant mechanical boss in a 2D pixel-art shooter.

This should look like a follow-up detonation after the main blast,
with fire pockets, scrap, and staggered force.
Frame progression:
1) sharp local flash,
2) orange-yellow burst,
3) asymmetrical explosive bloom,
4) multiple smaller blast lobes and flying scrap,
5) red breakup with sparks,
6) smoke pockets and glowing debris,
7) fading fragments,
8) final smoke residue.

Style: professional game-ready pixel-art VFX.
Composition: 8 frames in one row, centered, aligned consistently,
readable silhouette in every frame.
Color palette: white, yellow, orange, red, dark gray metal, smoke brown.
Rendering constraints: crisp pixels, no anti-aliasing, no excessive clutter,
no text, no background.
Background: transparent.
Avoid: gore, human elements, painterly rendering, oversized soft glow.
```

#### Final boss death with shockwave

```text
Create a horizontal 10-frame sprite sheet of a final boss death explosion
for a 2D arcade pixel-art shooter.

This should feel like the ultimate finishing explosion: bright core,
massive outer force, debris, and dramatic dissipation.
Frame progression:
1) tiny pre-flash,
2) blinding white ignition,
3) huge yellow-orange bloom,
4) maximum-size explosion with strong irregular silhouette,
5) bright shockwave ring expanding outward,
6) red-orange breakup with many ember particles,
7) darkening core and debris spread,
8) smoke overtaking the blast,
9) thinning smoke and a few embers,
10) almost vanished residue.

Style: top-tier modern pixel-art VFX, dramatic and extremely readable.
Composition: 10 evenly spaced frames in a single horizontal row,
every frame centered and consistently aligned.
Color palette: white, pale yellow, bright yellow, orange, red, dark red,
smoke brown, dark gray debris.
Rendering constraints: crisp pixels, no anti-aliasing, no blur, no lens flare,
no realistic volumetric simulation, no background.
Background: transparent.
Avoid: text, frame numbers, UI, scene background, muddy color ramps,
over-detailed noise.
```

### Hit Effects

#### Laser impact (small — 32px)

```text
Create a horizontal 6-frame sprite sheet of a small pixel-art laser impact
for a 2D side-view space shooter.

The effect should represent a light energy shot striking a metal enemy ship.
Frame progression:
1) tiny white contact spark,
2) sharp yellow-white impact flash,
3) small orange burst with 2 or 3 ember fragments,
4) brief red-orange breakup,
5) tiny dark smoke flecks,
6) almost fully dissipated residue.

Style: polished retro-modern pixel art, highly readable at small gameplay scale.
Composition: all 6 frames evenly spaced in one row,
each frame centered and aligned consistently.
Color palette: white, pale yellow, hot yellow, orange, red,
a few dark gray smoke pixels.
Rendering constraints: crisp pixels, no anti-aliasing, no blur,
no realistic smoke simulation, no painterly texture.
Background: transparent.
Avoid: labels, frame numbers, environment art, oversized explosion, soft glow.
```

#### Plasma impact on shield (sci-fi — 48px)

```text
Create a horizontal 6-frame sprite sheet of a pixel-art plasma impact
for a sci-fi 2D shooter.

The effect should look like a powerful blue plasma bolt hitting an energy shield.
Frame progression:
1) tiny white-blue flash,
2) bright cyan contact bloom,
3) circular electric shock ring with sharp plasma spikes,
4) broken ring with scattered blue particles,
5) violet-blue fading energy residue,
6) nearly vanished sparks.

Style: premium arcade pixel art, crisp and readable, designed for fast gameplay.
Composition: 6 evenly spaced frames in a single row,
centered and consistently aligned.
Color palette: white, pale cyan, bright cyan, electric blue, violet accents.
Rendering constraints: clean pixel edges, no anti-aliasing, no soft bloom,
no realistic smoke, no scene background.
Background: transparent.
Avoid: orange fire, text, UI, glow haze, lens flare, painted texture.
```

#### Heavy cannon hit with debris (48px)

```text
Create a horizontal 6-frame sprite sheet of a heavy projectile impact
for a 2D space combat game.

The effect should show a kinetic cannon round striking an armored ship.
Frame progression:
1) compact white hit spark,
2) hard yellow-orange flash,
3) dense orange impact burst with several dark metal fragments,
4) expanding jagged red-orange breakup,
5) gray smoke puff with glowing embers,
6) fading smoke and a few final sparks.

Style: sharp readable pixel art with strong action-game clarity.
Composition: 6 frames in one row, evenly spaced, centered in each frame cell.
Color palette: white, yellow, orange, deep red, dark gray, steel gray.
Rendering constraints: crisp pixels, no anti-aliasing, minimal dithering
only where useful, no muddy colors, no background.
Background: transparent.
Avoid: excessive realism, gore, labels, environment objects, soft airbrush effects.
```

### Shield Effects

#### Shield hit (energy barrier — 32px)

```text
Create a pixel-art shield-hit effect for a 2D sci-fi shooter.

Subject: a projectile striking an energy shield.
Shape: bright contact point, circular or semi-circular energy ring,
sharp shard-like plasma fragments.
Style: clean high-readability arcade pixel art.
Color palette: white center, pale cyan, bright cyan, electric blue, violet accents.
Composition: isolated asset, centered, transparent background.
Rendering constraints: crisp pixels, no anti-aliasing, no realistic smoke,
no soft bloom fog, no text, no background scene.
Avoid: orange fire, metal debris, painterly rendering.
```

#### Shield break (collapse — 48px)

```text
Create a pixel-art shield-break effect for a 2D arcade space shooter.

Subject: an energy shield collapsing after taking a strong hit.
Shape: bright central rupture, broken ring segments, outward-flying energy shards,
fading electric residue.
Style: dramatic but readable pixel-art VFX.
Color palette: white center, cyan, bright blue, electric blue, violet edge accents.
Composition: isolated centered asset, transparent background.
Rendering constraints: crisp pixel edges, no anti-aliasing, no blur,
no realistic physics simulation, no text.
Avoid: orange fireball look, smoke-heavy explosion, lens flare, background scene.
```

### Power-Up / Pickup Effects

#### Standard pickup burst (16px — code-drawn candidate)

```text
Create a pixel-art power-up pickup burst for a 2D arcade shooter.

Subject: a bright celebratory burst that appears when the player collects a power-up.
Shape: glowing core, short starburst spikes, tiny spark particles,
compact circular energy bloom.
Style: polished arcade pixel-art VFX, cheerful and readable.
Color palette: white core with bright cyan and green accents,
or gold accents for a score bonus item.
Composition: isolated centered asset, transparent background.
Rendering constraints: crisp pixel edges, no anti-aliasing, no blur,
no text, no background scene.
Avoid: fireball look, smoke-heavy effect, photorealism, painterly glow.
```

Note: At 16px, this defaults to code-drawn per the <32px rule. Prompt kept as reference if the effect is scaled up or if the rule is overridden.

#### Rare power-up activation (32px+)

```text
Create a pixel-art rare power-up activation burst for a 2D bullet-hell space shooter.

Subject: a larger more dramatic collectible activation effect for a powerful item.
Shape: intense white core, layered star-shaped energy spikes,
circular halo, small radiant particles.
Style: premium pixel-art VFX, magical-sci-fi hybrid, very readable.
Color palette: white, cyan, magenta, violet, or white and gold for a legendary upgrade.
Composition: isolated centered asset on a transparent background.
Rendering constraints: crisp pixels, no anti-aliasing, no blur, no text,
no background scene, no photorealistic lighting.
Avoid: orange explosion language, heavy smoke, cinematic lens effects.
```

---

## Workflow Prompts

### Concept sheet (pre-production)

Use before committing to animation — generate 4 silhouette variations to pick from:

```text
Create a pixel-art concept sheet showing 4 different explosion designs
for a 2D space shooter, all on a transparent background.

Show four distinct explosion silhouettes:
1) compact round burst,
2) spiky starburst,
3) ring-heavy shockwave explosion,
4) asymmetrical debris-heavy blast.

Style: polished professional pixel-art VFX.
Composition: 4 isolated centered effects laid out cleanly in a grid,
each visually distinct but clearly part of the same game style.
Color palette: white, yellow, orange, red, dark smoke brown.
Rendering constraints: crisp pixels, no anti-aliasing, no text, no labels,
no background scene.
Avoid: mockup presentation boards, environment, blur, realism.
```

### Family consistency check

Use when generating multiple effects that must look cohesive:

```text
Create a matching family of 6 pixel-art combat effects for a 2D arcade space shooter
on a transparent background:
1) small laser hit,
2) medium plasma hit,
3) missile explosion,
4) small enemy death explosion,
5) medium enemy death explosion,
6) large boss explosion.

All effects must share the same pixel-art style, palette logic,
rendering rules, and visual language.
Style: premium crisp pixel-art VFX, readable in fast gameplay.
Composition: each effect isolated and centered, presented cleanly
with enough spacing to separate them.
Color palette: white, yellow, orange, red, smoke brown,
plus optional blue for energy effects.
Rendering constraints: crisp pixels, no anti-aliasing, no text, no labels,
no blur, no scene background.
Avoid: inconsistent styles, photorealism, painterly edges, muddy colors.
```

---

## Rendering Constraint Snippets

Reusable fragments to append to any prompt:

### Pixel art enforcement
```text
Use strict crisp pixel edges, no anti-aliasing, no soft glow, no blur, no painterly rendering.
```

### Gameplay readability
```text
Prioritize strong silhouette readability and clarity at small in-game scale.
```

### Transparent asset
```text
Transparent background, isolated asset, centered composition, no shadows outside the effect.
```

### Animation progression
```text
Each frame should show a clear readable progression from ignition to peak blast to breakup to dissipation.
```

### Stylized energy
```text
Emphasize sharp shock shapes, controlled color ramps, and dramatic contrast over realism.
```
