# tools/scripts — Build and dev scripts

- Utility scripts for development workflow
- No runtime dependencies — keep lightweight
- Scripts should be invocable via `pnpm --filter @sg/scripts`

## Dev server scripts

- `dev-server.sh` — Start Vite dev server with logging to `.dev-logs/vite-dev.log`
- `dev-stop.sh` — Stop the dev server started by `dev-server.sh`
- `chrome-debug.sh` — Launch Chrome with remote debugging on port 9222
