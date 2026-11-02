<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `LayerSweepCrossingMinimizerTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T4): port the layer sweep crossing minimizer suite`

## Context

`JT/p3order/LayerSweepCrossingMinimizerTest.java` (1,693 lines; `@RunWith(Parameterized.class)`, 37 tests × 2
`CrossMinType` parameters = 74 runs; 4 `@Ignore` methods at lines 659, 771, 1488, 1652) exercises
`src/alg/layered/p3order/LayerSweepCrossingMinimizer.ts` through `TestGraphCreator` graphs, many of them nested
(`nestedGraph`, external port dummies, `HierarchyHandling.INCLUDE_CHILDREN`). Those hierarchical paths are reached by
no 7c oracle row (U until 7h, `plans/layered-crossing-min/unreached.md`), so this suite is their first real check: a
failing case there is the most likely T7 event of the mission. Follow [suite-rules.md](../suite-rules.md).

## Task

Port the suite to `src/alg/layered/p3order/LayerSweepCrossingMinimizerTest.test.ts` (split per rule 1 if over about
1,500 lines). The Java test's `new Random()` usage (line search `Random(`) must be checked against rule 5.

## Write-set

`src/alg/layered/p3order/LayerSweepCrossingMinimizerTest*.test.ts`.

## Read-set

The Java suite; `test/helpers/TestGraphCreator.ts` (header: overload mapping); `LayerSweepCrossingMinimizer.ts` and
its section files; `LayerSweepCrossingMinimizerCrossMinType.ts` (the parameter values).

## Acceptance criteria

- Given the port, when run, then 74 cases pass and 8 are skipped (the 4 `@Ignore` methods inside the 2-parameter
  `describe.each`).
- Given a failing case, then a diagnosis artifact is reported and no `src/` file is changed.
- Given typecheck and prettier on the file(s), then clean.

## Observability / Rollback

N/A — tests only. Reversible (new files).
