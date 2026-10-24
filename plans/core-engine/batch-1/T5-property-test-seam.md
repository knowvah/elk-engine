<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `Property.test.ts`: ElkReflect seam → `LayoutMetaDataService.getInstance()`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T5): use the metadata service in the property test setup`

## Context
M8 (approved by the user 2026-10-23). `src/graph/properties/Property.test.ts:49-90` mirrors the seven
`ElkReflect.register` calls of Java's `LayoutMetaDataService.initElkReflect` because the service was not ported when
the test was written. It is now: `src/core/data/LayoutMetaDataService.ts:212-280` (`getInstance()` calls
`initElkReflect()`). Java's `PropertyTest` does it in `@BeforeClass` via `LayoutMetaDataService.getInstance()`.

## Task
Replace the temporary seam (comment + seven registrations) with `LayoutMetaDataService.getInstance()` in `beforeAll`
(or the existing setup hook), as the Java test does; drop the now-unused `ElkReflect` import if nothing else uses
it. Change no assertion. Check the module-boundaries fitness test still allows `src/graph` tests to import
`src/core` (test files may; if not, stop 1).

## Write-set
`src/graph/properties/Property.test.ts`.

## Read-set
`Property.test.ts:1-100`, `LayoutMetaDataService.ts:205-280`,
`$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/graph/properties/PropertyTest.java`,
`test/architecture/module-boundaries.fitness.test.ts` (test-file rules only).

## Acceptance criteria
- Given the replaced setup, when the file runs alone (`npx vitest run src/graph/properties/Property.test.ts`), then
  every test passes and the assertion lines are unchanged (`git diff` shows only the setup hunk and imports).
- Given the clone-failure test (`:172`), when run, then its message still matches.

## Observability / Rollback
N/A. Reversible: revert the commit.
