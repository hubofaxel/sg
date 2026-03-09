# Edge-to-Edge Canvas — Architecture Correction

Fixes the off-center canvas issue caused by CSS safe-area padding on the game container. Implements the correct mobile game rendering model: canvas fills the entire physical screen, safe areas are consumed inside Phaser for HUD positioning only.

---

## 1. What's Wrong With the Current Approach

PR-1 applied safe area handling as CSS padding on the game container:

```css
/* Current (wrong for a game) */
.game-container {
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}
```

This treats the game like a document layout — push content away from unsafe edges. For a web page, that's correct. For a game canvas, it causes three problems:

1. **Off-center canvas.** On a Pixel with a 67px left camera cutout inset and 0px right, the canvas shifts 67px right. The game world is no longer centered on the physical screen. The player perceives the game as misaligned.

2. **Black bleed instead of world bleed.** The padding area shows the page background (black), not the game world. On a phone with a notch, there's a black bar where the starfield should continue. This breaks immersion and looks like a rendering bug.

3. **Reduced canvas area.** The CSS padding shrinks the container, which shrinks the Phaser canvas, which means `computeWorldSize()` sees a smaller container and computes a narrower world. The game loses playable area to CSS insets.

### The correct model (three layers):

| Layer | Responsibility | Uses safe area? |
|---|---|---|
| **HTML/CSS shell** | Claim the entire screen. Canvas is `100vw × 100vh`, zero margin, zero padding. | No — `viewport-fit=cover` enables full bleed, but no `env()` padding on container |
| **Game canvas** | Fill the physical screen edge to edge. Background renders under notches and cutouts. Camera centers on physical screen center. | No — the canvas is ignorant of safe areas |
| **HUD/UI inside Phaser** | Position interactive elements (score, controls, buttons) inward from screen edges by safe area amounts. | Yes — safe area pixel values passed into Phaser, consumed by HudManager and any in-canvas controls |

---

## 2. Changes Required

### 2a. HTML Meta — Already Correct, Verify

`app.html` should have:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

PR-1 added `viewport-fit=cover`. Verify it's still there. Do NOT add `user-scalable=no` (accessibility concern, and modern browsers may ignore it). Do NOT add `maximum-scale=1.0` — it hurts accessibility and `touch-action: none` on the canvas already prevents pinch-zoom where it matters.

### 2b. Manifest — Change display Mode

Current `manifest.webmanifest` has `"display": "standalone"`.

Change to `"display": "fullscreen"` for the installed PWA path. This strips all system UI (status bar, navigation bar) when the game is launched as an installed app. In a browser tab, `fullscreen` has no effect (the browser controls remain), so this is safe — it only matters for the installed experience.

Keep `"orientation": "landscape"`.

### 2c. CSS Shell — Remove Safe Area Padding from Game Container

**This is the critical fix.** The game container and canvas must have zero insets.

In `apps/web/src/routes/play/+page.svelte` (or wherever the game container is styled):

Remove:
```css
padding: env(safe-area-inset-top) env(safe-area-inset-right)
         env(safe-area-inset-bottom) env(safe-area-inset-left);
```

Replace the game container styling with:
```css
.game-shell {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #000;
}
```

Note: using `100vw`/`100vh` here, not `100dvw`/`100dvh`. With `viewport-fit=cover`, the viewport extends into the unsafe areas. Dynamic viewport units (`dvh`) account for browser chrome collapse/expand, which matters for scrollable pages but not for a fixed fullscreen game canvas. The game container should match the physical screen, period.

Alternatively, keep `100dvw`/`100dvh` if testing shows they give more consistent behavior across browsers with `viewport-fit=cover`. The important thing is: **zero padding, zero margin, full bleed.**

The canvas element inside the container should fill it completely. Phaser's FIT + CENTER_BOTH handles sizing the canvas within the container.

### 2d. Safe Area Value Extraction — New Utility

Create a JavaScript utility that reads the browser's safe area inset values and makes them available to Phaser:

```typescript
// packages/game/src/systems/SafeAreaInsets.ts

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function getSafeAreaInsets(): SafeAreaInsets {
  // Read CSS env() values by computing them against a probe element
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '0';
  div.style.height = '0';
  div.style.paddingTop = 'env(safe-area-inset-top, 0px)';
  div.style.paddingRight = 'env(safe-area-inset-right, 0px)';
  div.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
  div.style.paddingLeft = 'env(safe-area-inset-left, 0px)';
  document.body.appendChild(div);

  const computed = getComputedStyle(div);
  const insets: SafeAreaInsets = {
    top: parseFloat(computed.paddingTop) || 0,
    right: parseFloat(computed.paddingRight) || 0,
    bottom: parseFloat(computed.paddingBottom) || 0,
    left: parseFloat(computed.paddingLeft) || 0,
  };

  document.body.removeChild(div);
  return insets;
}
```

This reads the actual pixel values the browser computes for the safe area insets. The values change based on device, orientation, and whether the app is in fullscreen/standalone mode.

Store in the Phaser registry at mount time and update on resize/orientation change:

```typescript
// In mountGame.ts
const insets = getSafeAreaInsets();
game.registry.set('safeAreaInsets', insets);

// On resize (in the existing debounced resize handler)
const newInsets = getSafeAreaInsets();
game.registry.set('safeAreaInsets', newInsets);
```

### 2e. HUD Positioning — Consume Safe Area Inside Phaser

HudManager currently positions elements at fixed offsets from world edges:

```typescript
// Current
scoreText.setPosition(10, 10);           // top-left
waveText.setPosition(width / 2, 12);     // top-center
debugOverlay.setPosition(width - 10, 10); // top-right
```

These need to be offset inward by the safe area insets, **converted from screen pixels to world coordinates:**

```typescript
// In HudManager, read insets from registry
const insets = this.scene.game.registry.get('safeAreaInsets') as SafeAreaInsets;

// Convert screen-pixel insets to world-coordinate insets
// The scale factor converts from display (screen) pixels to game world units
const scaleX = this.scene.scale.gameSize.width / this.scene.scale.displaySize.width;
const scaleY = this.scene.scale.gameSize.height / this.scene.scale.displaySize.height;

const worldInsets = {
  top: insets.top * scaleY,
  right: insets.right * scaleX,
  bottom: insets.bottom * scaleY,
  left: insets.left * scaleX,
};

// Apply to HUD positioning
scoreText.setPosition(10 + worldInsets.left, 10 + worldInsets.top);
livesText.setPosition(10 + worldInsets.left, 30 + worldInsets.top);
creditsText.setPosition(10 + worldInsets.left, 50 + worldInsets.top);
waveText.setPosition(width / 2, 12 + worldInsets.top);
debugOverlay.setPosition(width - 10 - worldInsets.right, 10 + worldInsets.top);
```

The same principle applies to any in-canvas controls or interactive elements: offset inward from screen edges by the world-coordinate safe area values.

**BossManager:** Boss health bar and warning text are centered (`width / 2`) with percentage-based Y positioning. The centering is unaffected by horizontal insets. Verify the top-edge Y positioning clears the top inset on devices with status bar or Dynamic Island.

**GameOverlay (DOM):** If the overlay remains as a DOM layer, its buttons should also respect safe area insets. Since the overlay is positioned over the full-bleed canvas, the buttons need CSS positioning that accounts for insets:

```css
.pause-button {
  position: absolute;
  top: calc(8px + env(safe-area-inset-top));
  right: calc(8px + env(safe-area-inset-right));
}
```

This is the one place where CSS `env()` is correct — the DOM overlay sits on top of the full-bleed canvas and its buttons must avoid unsafe areas.

### 2f. SafeZone Interaction

The safe zone (800×600 gameplay density area) and safe area insets (hardware cutouts) are independent concepts:

- **Safe zone** = where enemies spawn and gameplay density is designed. Defined by `computeWorldSize()` and `createSafeZone()`. Unaffected by this change.
- **Safe area insets** = where hardware obstructs the screen (notch, camera, gesture bars). Consumed only by HUD positioning.

On most phones in landscape, the safe area insets are small (the camera cutout might be 30-67px on one side). The safe zone margins are much larger (200+ px on each side of an 1200-wide world). The HUD offset from safe area insets is a small nudge within the already-large margin. No conflict.

On 4:3 devices where safe zone margins are zero, the safe area insets still matter — HUD elements near the top-left or top-right need to clear any status bar or notch.

### 2g. Symmetry Consideration

The spec mentions symmetry: if the left inset is 67px and the right is 0px, some designers pad both sides equally for visual balance. For Ship Game, this is NOT recommended:

- The HUD is already visually balanced by the safe zone (centered gameplay, symmetric margins)
- Artificial symmetry padding wastes screen space on the side without a cutout
- The background bleeds edge to edge, so there's no visible asymmetry in the game world

If testing reveals the HUD feels unbalanced (score offset 67px on the left but debug overlay flush on the right), consider it then. Don't pre-optimize for symmetry.

---

## 3. Files to Modify

| File | Change | Agent |
|---|---|---|
| `apps/web/src/app.html` | Verify `viewport-fit=cover` present | svelte-shell |
| `apps/web/static/manifest.webmanifest` | Change `display` to `fullscreen` | svelte-shell |
| `apps/web/src/routes/play/+page.svelte` | Remove `env(safe-area-inset-*)` padding from game container. Container is `position: fixed; inset: 0; margin: 0; padding: 0;` | svelte-shell |
| `packages/game/src/systems/SafeAreaInsets.ts` | Create: `SafeAreaInsets` interface, `getSafeAreaInsets()` probe function | phaser-integrator |
| `packages/game/src/mountGame.ts` | Store safe area insets in registry at mount. Update on resize. | phaser-integrator |
| `packages/game/src/systems/HudManager.ts` | Read insets from registry. Offset HUD positions inward by world-coordinate insets. Update on registry change. | phaser-integrator |
| `packages/game/src/systems/BossManager.ts` | Verify top-edge text clears top inset | phaser-integrator |
| `apps/web/src/lib/components/GameOverlay.svelte` | Button positioning uses `env(safe-area-inset-*)` in CSS (this is correct for DOM overlay elements) | svelte-shell |
| `apps/web/src/routes/settings/+page.svelte` | Settings page is NOT a game canvas — it keeps `env()` CSS padding as normal web page layout | svelte-shell (no change) |
| `apps/web/src/routes/+page.svelte` | Home page same — keeps normal web layout with safe area CSS | svelte-shell (no change) |

**Important:** Only the play page changes. The home page and settings page are standard web pages — they correctly use CSS safe area padding for layout. This change is specific to the game canvas rendering model.

---

## 4. Non-Game Pages Are Unaffected

The edge-to-edge model applies only to the play page (game canvas). Other routes are standard web pages:

- `/` (home): normal layout, CSS safe area padding is correct
- `/settings`: normal layout, CSS safe area padding is correct

Do not apply the full-bleed model to these pages. They are document-style layouts where CSS `env()` padding is the right approach.

---

## 5. Testing Requirements

**Chrome DevTools device emulation does NOT accurately simulate `viewport-fit=cover` or hardware cutouts.** The safe area inset values will be 0 in DevTools emulation. This means:

- Unit tests can verify the HUD offset logic (given insets X, Y, Z → HUD positions at A, B, C)
- E2e tests in Playwright can verify the page renders without error
- **Real-device testing is required** to verify the safe area insets are correctly read and applied

For automated testing without real devices:
- Test `getSafeAreaInsets()` returns `{0, 0, 0, 0}` when no insets exist (the desktop/emulator case)
- Test HUD positioning with zero insets equals current behavior (no regression)
- Test HUD positioning with synthetic insets (e.g., `{top: 47, right: 0, bottom: 20, left: 67}`) produces correct offsets
- The synthetic inset test can be done by mocking the registry value, not by simulating hardware

---

## 6. Acceptance Criteria

- [ ] Game canvas fills entire physical screen on a phone — no black bars at notch or camera cutout
- [ ] Game background (starfield) renders under the notch/cutout area
- [ ] HUD text (score, lives, wave indicator) does NOT overlap with notch or camera cutout
- [ ] HUD text is offset inward from screen edges by the safe area inset amount
- [ ] Game world is visually centered on the physical screen (not shifted by asymmetric insets)
- [ ] Desktop behavior unchanged (insets are 0, HUD at normal positions)
- [ ] 4:3 tablet behavior unchanged (insets may be small or zero)
- [ ] Settings page and home page still use CSS safe area padding (unaffected)
- [ ] GameOverlay DOM buttons clear safe area insets
- [ ] `pnpm validate` passes
- [ ] `pnpm test:e2e` passes
- [ ] Real-device verification required for safe area correctness (cannot be automated)

---

## 7. Commit Sequence

```
1. fix(web): remove CSS safe-area padding from game container, full-bleed canvas
2. feat(game): add SafeAreaInsets utility for reading browser inset values
3. refactor(game): offset HUD positioning by safe area insets in world coordinates
4. fix(web): update manifest display to fullscreen
5. test(game): add HUD safe-area offset unit tests with synthetic insets
```

Small, focused PR. The architectural change is in commit 1 (remove CSS padding). The rest is wiring the inset values through Phaser's internal positioning.
