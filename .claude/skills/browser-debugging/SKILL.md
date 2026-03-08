---
name: browser-debugging
description: Use dev server logs and Chrome DevTools MCP to diagnose runtime browser errors. Load when debugging 500 errors, blank pages, or UI issues.
---

## Browser Debugging Workflow

### When you hit a runtime error

1. First, check the dev server log: `tail -30 .dev-logs/vite-dev.log`
2. If no server-side error, use Chrome DevTools MCP:
   - `navigate_page` to the failing route
   - `take_snapshot` to see what rendered
   - `get_console_messages` to read JS errors
   - `network_get_all_requests` to check for failed fetches
3. Diagnose from the evidence — don't guess
4. Fix the code
5. Verify: navigate + snapshot again to confirm the fix

### Common patterns

| Symptom | Check first |
|---------|-------------|
| White page, no errors | SSR hydration mismatch — check server log for `hydration` |
| 500 Internal Error | Server-side throw — `tail .dev-logs/vite-dev.log` |
| Page loads but game missing | `get_console_messages` for import/mount errors |
| Game canvas black | Expected if no scenes render content yet; check `ready` event in console |
| Styles broken | `take_snapshot` + check if Tailwind classes resolve |
| Asset 404s | Check manifest paths have `/assets/` prefix; check `static/assets/` directory |

### Dev server log commands

```bash
# Start dev server with logging
bash tools/scripts/dev-server.sh

# Check recent errors
tail -50 .dev-logs/vite-dev.log

# Grep for error patterns
grep -i "error\|500\|failed\|TypeError\|Cannot" .dev-logs/vite-dev.log | tail -20

# Stop dev server
bash tools/scripts/dev-stop.sh
```

### SvelteKit + Phaser gotchas

- Phaser accesses `window` at module scope — MUST use dynamic `import()` inside `onMount`, never top-level
- `onMount` cannot be async if it returns a cleanup function — use `.then()` for async work inside sync `onMount`
- Asset manifest paths are relative — PreloadScene prepends `/assets/` for SvelteKit's static serving
- HMR can leak WebGL contexts — always `handle.destroy()` in `onDestroy`

## Playwright Mobile Emulation

### Mobile viewport and touch context

```typescript
import { test, expect } from '@playwright/test';

// Create a mobile browser context with touch support
test('mobile touch test', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },  // iPhone 15 landscape
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/play');

  // Verify touch-action is set on game container
  const container = page.locator('.game-container');
  await expect(container).toHaveCSS('touch-action', 'none');
});
```

### Orientation simulation via viewport resize

Playwright does not have a native orientation API. Simulate orientation change by swapping viewport dimensions:

```typescript
// Landscape
await page.setViewportSize({ width: 844, height: 390 });

// Portrait (swap dimensions)
await page.setViewportSize({ width: 390, height: 844 });

// Verify rotate overlay appears in portrait
await expect(page.locator('[data-testid="rotate-overlay"]')).toBeVisible();

// Back to landscape — overlay should disappear
await page.setViewportSize({ width: 844, height: 390 });
await expect(page.locator('[data-testid="rotate-overlay"]')).not.toBeVisible();
```

### Touch interaction

```typescript
// Simulate touch on left half of screen (joystick area)
await page.touchscreen.tap(200, 300);

// Simulate touch drag (joystick movement)
// Note: Playwright touchscreen API is limited — for complex multi-touch,
// use CDP session:
const cdp = await page.context().newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ x: 200, y: 300 }],
});
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchMove',
  touchPoints: [{ x: 250, y: 300 }],
});
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchEnd',
  touchPoints: [],
});
```

### Visibility change simulation

```typescript
// Simulate tab backgrounding
await page.evaluate(() => {
  document.dispatchEvent(new Event('visibilitychange'));
  Object.defineProperty(document, 'hidden', { value: true, writable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
```

### Standard mobile device presets for this project

| Device | Viewport (landscape) | Scale factor | Use for |
|---|---|---|---|
| iPhone SE | 568x320 | 0.533 | Smallest target — readability, touch targets |
| iPhone 15 | 844x390 | 0.65 | Mid-range phone baseline |
| iPad mini | 1024x683 | 1.0 | Tablet baseline |
| iPad Air | 1366x1024 | 1.28 | Large tablet — oversized text check |
