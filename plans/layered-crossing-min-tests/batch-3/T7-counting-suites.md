<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Counting and in-layer suites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T7): port the crossing counter suites`

## Context

Four suites (follow [suite-rules.md](../suite-rules.md)):

| Java suite | Lines | Runs | `@Ignore` | Creator | Class under test (TS) |
| ---------- | ----: | ---: | --------: | ------- | --------------------- |
| `p3order/counting/AllCrossingsCounterTest` | 243 | 14 | 0 | base, `NorthSouthEdgeTestGraphCreator` ×5, `InLayerEdgeTestGraphCreator` ×1 | `AllCrossingsCounter`, `GraphInfoHolder` |
| `p3order/counting/CrossingsCounterTest` | 373 | 13 | 1 (`benchmark`, `// @Test`, uses `new Random()` and `Date`) | `InLayerEdgeTestGraphCreator` | `CrossingsCounter` |
| `p3order/counting/NorthSouthEdgeAllCrossingsCounterTest` | 244 | 20 | 0 | `NorthSouthEdgeTestGraphCreator` | `CrossingsCounter` |
| `intermediate/greedyswitch/InLayerEdgeTwoNodeCrossingCounterTest` | 393 | 21 | 1 (line 323) | `InLayerEdgeTestGraphCreator` | `CrossingsCounter` |

`AllCrossingsCounterTest` builds several creators in one test: construct each as the Java does (`new
NorthSouthEdgeTestGraphCreator()` per call site), never share instances the Java does not share. The `benchmark`
method is the only unseeded `Random` use; it is `@Ignore`d and timing-only (rule 5: port as `it.skip`).

## Task

Port the four suites beside their classes under test: the three counting suites in `src/alg/layered/p3order/counting/`,
`InLayerEdgeTwoNodeCrossingCounterTest` in `src/alg/layered/intermediate/greedyswitch/` (its Java package).

## Write-set

`src/alg/layered/p3order/counting/{AllCrossingsCounterTest,CrossingsCounterTest,NorthSouthEdgeAllCrossingsCounterTest}.test.ts`,
`src/alg/layered/intermediate/greedyswitch/InLayerEdgeTwoNodeCrossingCounterTest.test.ts`.

## Acceptance criteria

- Given the four ports, when run, then 68 cases pass and 2 are skipped, per suite as the table.
- Given a failing case, then a diagnosis artifact is reported and no `src/` file is changed.
- Given typecheck and prettier on the four files, then clean.

## Observability / Rollback

N/A — tests only. Reversible (new files).
