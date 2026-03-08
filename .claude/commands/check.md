Run the full quality gate sweep and report results.

Steps:
1. `pnpm check` — TypeScript checking across all packages
2. `pnpm lint` — Biome lint + format check
3. `pnpm test --run` — All Vitest tests
4. `pnpm asset:validate` — Asset catalog, manifest, and file consistency
5. Summarize: list each gate as PASS or FAIL with relevant output
6. If any FAIL, suggest which agent or action should fix it:
   - Type errors in contracts -> schema-validator agent
   - Type errors in game -> phaser-integrator agent
   - Type errors in web -> svelte-shell agent
   - Lint/format failures -> run `pnpm lint:fix`
   - Test failures -> test-runner agent
   - Asset validation failures -> asset-pipeline agent
