<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `BetweenLayerEdgeTwoNodeCrossingsCounterTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T6): port the between-layer two-node crossings counter suite`

## Context

`JT/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterTest.java` (419 lines, 15 runs, 1 `@Ignore`
method at line 345, same package as the creator so it calls its members unqualified) tests
`src/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.ts` (16 constructions). Follow
[suite-rules.md](../suite-rules.md).

## Task

Port to `src/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterTest.test.ts`.

## Write-set

`src/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterTest.test.ts`.

## Acceptance criteria

- Given the port, when run, then 15 cases pass and 1 is skipped.
- Given a failing case, then a diagnosis artifact is reported and no `src/` file is changed.
- Given typecheck and prettier on the file, then clean.

## Observability / Rollback

N/A — tests only. Reversible (new file).
