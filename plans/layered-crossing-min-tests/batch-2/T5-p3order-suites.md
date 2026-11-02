<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Five p3order suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T5): port five p3order unit suites`

## Context

Five suites under `JT/p3order/`, each extending `TestGraphCreator` (follow [suite-rules.md](../suite-rules.md)):

| Java suite | Lines | Runs | `@Ignore` | Class under test (TS) |
| ---------- | ----: | ---: | --------: | --------------------- |
| `AbstractBarycenterPortDistributorTest` | 246 | 6 | 1 (line 218) | `LayerTotalPortDistributor`, `GraphInfoHolder` |
| `BarycenterHeuristicTest` | 375 | 7 | 0 | `BarycenterHeuristic`, `ForsterConstraintResolver`, `NodeRelativePortDistributor` (uses `MockRandom` directly) |
| `GreedyPortDistributorTest` | 367 | 11 | 0 | `GreedyPortDistributor` (some nested graphs) |
| `LayerSweepHierarchicalTwoSidedGreedySwitchTest` | 258 | 6 | 0 | `LayerSweepCrossingMinimizer` with `TWO_SIDED_GREEDY_SWITCH`, nested graphs |
| `LayerSweepTypeDeciderTest` | 167 | 3 | 0 | `LayerSweepTypeDecider`, `GraphInfoHolder`, nested graphs |

The nested-graph cases reach 7c's hierarchical paths that no oracle row covers; a failing one is a likely T7 event.
The TS `GraphInfoHolder` and `LayerSweepTypeDecider` constructors may differ in shape from Java's (record parameters
under the 5-parameter limit): read the TS signature and map the Java call, noting the mapping.

## Task

Port the five suites to `src/alg/layered/p3order/<JavaName>.test.ts`.

## Write-set

`src/alg/layered/p3order/{AbstractBarycenterPortDistributorTest,BarycenterHeuristicTest,GreedyPortDistributorTest,LayerSweepHierarchicalTwoSidedGreedySwitchTest,LayerSweepTypeDeciderTest}.test.ts`.

## Acceptance criteria

- Given the five ports, when run, then 33 cases pass and 1 is skipped, per suite as the table.
- Given a failing case, then a diagnosis artifact is reported and no `src/` file is changed.
- Given typecheck and prettier on the five files, then clean.

## Observability / Rollback

N/A — tests only. Reversible (new files).
