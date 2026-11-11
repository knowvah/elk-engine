<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — mrtree node ordering and placement

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T12): port mrtree node ordering and placement`
Scratch: `$TMPDIR/alg-trees/T12/`

## Context

Mission 8a, TR7. `M/p2order/{OrderBalance (233), NodeOrderer (300)}`, `M/p3place/NodePlacer.java` (345: Walker's `firstWalk :137`,
`apportion :199`, `secondWalk :319`, recursive). `NodeOrderer` and `NodePlacer` are T6 staged files (replace bodies, keep marker and
row); `OrderBalance` is new. The four weightings (`MODEL_ORDER`, `DESCENDANTS`, `FAN`, `CONSTRAINT`) select `NodeOrderer` branches.

## Task

1. Port the three classes whole; recursion verbatim (TR7).
2. Tests: `NodeOrderer` and `NodePlacer` from the stop before each to the stop after it, for every T1 row (each weighting, each
   direction); `OrderBalance` through the `NodeOrderer` rows that reach it (replay-alone coverage shows it ran). Rows whose "before"
   state needs processors not yet ported take the recorded state as input, never a TS-computed one.

## Write-set

`src/alg/mrtree/p2order/{OrderBalance,NodeOrderer}{,.test}.ts`, `src/alg/mrtree/p3place/NodePlacer{,.test}.ts`.

## Read-set

The Java files above, `src/alg/mrtree/TreeUtil.ts`, `src/alg/mrtree/options/InternalProperties.ts`, T6's helpers, `decisions.md` TR7.

## Interface contract (consumed by T17)

`NodeOrderer`, `NodePlacer` as `ILayoutPhase<TreeLayoutPhases, TGraph>` with their Java `getLayoutProcessorConfiguration`.

## Acceptance criteria

- Given every T1 row reaching `NodeOrderer` or `NodePlacer`, when the phase runs on the recorded "before" state, then the "after"
  stop equals the row at 1e-6.
- Given replay-alone coverage of `p2order/**` and `p3place/**`, then ≥ 90 % branches (rest journaled as `U` candidates).

## Observability / Rollback

N/A — no new observable operations. Reversible.
