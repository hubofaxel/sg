Create a new Zod 4 schema, its tests, and sample content.

Schema name: $ARGUMENTS

Steps:
1. Read the zod4-content-schemas skill for patterns
2. Create `packages/contracts/src/$ARGUMENTS/$ARGUMENTS.schema.ts` with Zod schema + inferred type export
3. Add to barrel export `packages/contracts/src/index.ts`
4. Create `packages/contracts/src/$ARGUMENTS/$ARGUMENTS.test.ts` with validation tests
5. Create sample content data in the appropriate `packages/content/src/` subdirectory
6. Run `pnpm --filter @sg/contracts test --run`
7. Run `pnpm --filter @sg/contracts check`
8. Report results
