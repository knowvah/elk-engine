<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Greedy-switch suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T8): port the greedy switch suites`

## Context

Three suites in `JT/intermediate/greedyswitch/` (follow [suite-rules.md](../suite-rules.md)):

| Java suite | Lines | Runs | `@Ignore` | Creator | Class under test (TS) |
| ---------- | ----: | ---: | --------: | ------- | --------------------- |
| `GreedySwitchProcessorTest` | 344 | 26 (13 × 2) | 0 | base, `NorthSouthEdgeTestGraphCreator` | `LayerSweepCrossingMinimizer` with the greedy-switch `CrossMinType`s (Java has no `GreedySwitchProcessor` class at this commit; the suite name is historical) |
| `NorthSouthEdgeNeighbouringNodeCrossingsCounterTest` | 483 | 26 | 0 | `NorthSouthEdgeTestGraphCreator` (extends it) | `NorthSouthEdgeNeighbouringNodeCrossingsCounter` |
| `SwitchDeciderTest` | 421 | 38 (19 × 2) | 0 | base, `NorthSouthEdgeTestGraphCreator` ×7, some nested graphs | `SwitchDecider`, `CrossingMatrixFiller`, `GraphInfoHolder` |

`SwitchDeciderTest`'s nested cases reach the hierarchical greedy switch (`SwitchDecider.java:63-121,147-154`), U for
7c's rows. The TS `SwitchDecider` takes a `{ graphData, oneSided }` record where Java takes six constructor arguments
(7c T7): map the Java call and note it.

## Task

Port the three suites to `src/alg/layered/intermediate/greedyswitch/<JavaName>.test.ts`.

## Write-set

`src/alg/layered/intermediate/greedyswitch/{GreedySwitchProcessorTest,NorthSouthEdgeNeighbouringNodeCrossingsCounterTest,SwitchDeciderTest}.test.ts`.

## Acceptance criteria

- Given the three ports, when run, then 90 cases pass and none is skipped, per suite as the table.
- Given a failing case, then a diagnosis artifact is reported and no `src/` file is changed.
- Given typecheck and prettier on the three files, then clean.

## Observability / Rollback

N/A — tests only. Reversible (new files).
