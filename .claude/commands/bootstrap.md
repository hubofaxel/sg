Scaffold the complete ship-game monorepo from scratch.

Follow these steps exactly:

1. Verify Node 24 LTS is active: `node --version` (must be 24.x)
2. Enable Corepack and pin pnpm 10: `corepack enable && corepack use pnpm@latest-10`
3. Create `pnpm-workspace.yaml` with `packages: [apps/*, packages/*, tools/*]`
4. Scaffold SvelteKit: `npx sv create apps/web` (TypeScript, minimal template)
5. Create package stubs:
   - `packages/contracts/` with `package.json`, `tsconfig.json`, `src/index.ts`
   - `packages/content/` with `package.json`, `tsconfig.json`, placeholder dirs
   - `packages/game/` with `package.json`, `tsconfig.json`, `src/index.ts`
   - `packages/ui/` with `package.json`, `tsconfig.json`, `src/index.ts`
   - `tools/scripts/` with `package.json`
6. Add root `biome.json`
7. Install Phaser 4 RC exact: `pnpm --filter @sg/game add phaser@4.0.0-rc.6`
8. Install Zod 4: `pnpm --filter @sg/contracts add zod@4`
9. Install Tailwind 4: `pnpm --filter @sg/web add -D tailwindcss @tailwindcss/vite`
10. Install Vitest 4 and Biome at workspace root
11. Add root scripts: `dev`, `build`, `check`, `test`, `test:e2e`, `format`, `lint`, `lint:fix`, `validate`
12. Run `pnpm install` and `pnpm check`
13. Report the final tree and any errors
