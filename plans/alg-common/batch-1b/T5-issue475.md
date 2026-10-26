<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — `Issue475Test` port (P4)

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T5): port issue 475 fixed layout test`
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). `JT/issues/Issue475Test.java` lives in `alg.common.test` but runs only the fixed layout (5a), via
`LayoutTestRunner` with two `@Configurator`s over `tickets/core/475_fixedLayoutWithLongLabels.elkt`.
- The landed `test/helpers/elkt-layout-harness.ts` `layoutElkt(modelPath, algorithmId, configurator?)` is the TS runner
  (5b T12). `src/core/issues/{Issue457Test,Issue489Test}.test.ts` show the pattern.

## Task
1. Port `JT/issues/Issue475Test.java` to `src/alg/common/issues/Issue475Test.test.ts`.
   - Each Java `@Configurator` becomes one run of `layoutElkt` with that configurator, then the `@Test` body.
   - Expectations exactly as Java (`assertEquals(SIZE, …, 0)` and the other branch).
2. Port both branches of `doTestCompoundNodeSize`.
3. If the model or a property the test needs is missing, stop (stop 1). Do not stub it.

## Write-set
`src/alg/common/issues/Issue475Test.test.ts`.

## Read-set
- `JT/issues/Issue475Test.java`.
- `test/helpers/elkt-layout-harness.ts`, `src/core/issues/Issue457Test.test.ts`.
- `src/core/options/FixedLayouterOptions.ts`.

## Acceptance criteria
- Given the configurator that sets `NODE_SIZE_FIXED_GRAPH_SIZE = true` and size 20, when laid out, then every child
  keeps width and height 20 (`assertEquals(SIZE, …, 0)`).
- Given the configurator that sets it `false`, when laid out, then the other branch's Java assertions hold.
- Given the fitness tests, when run, then the new file passes them (SPDX header, bundle dependency direction).

## Observability / Rollback
N/A — test only. Reversible: revert the commit.
