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
