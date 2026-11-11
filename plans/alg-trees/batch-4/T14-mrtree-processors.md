<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — mrtree simple intermediate processors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T14): port nine mrtree intermediate processors`
Scratch: `$TMPDIR/alg-trees/T14/`

## Context

Mission 8a, TR3, TR7. Nine T6 staged files under `M/intermediate/`: `RootProcessor` (85), `LevelProcessor` (78; `gloLevelMap`
Integer keys, lookup only), `NeighborsProcessor` (127, level recursion `:80`), `LevelHeightProcessor` (132, `:81`),
`LevelCoordinatesProcessor` (74), `DirectionProcessor` (72), `NodePositionProcessor` (109), `GraphBoundsProcessor` (45),
`Untreeifyer` (50). `FanProcessor` and `CompactionProcessor` are T16's.

## Task

1. Replace the nine staged bodies with whole ports (keep marker and row). `gloLevelMap`: `JavaHashMap` (TR3), journaled.
   Boxed `Integer` comparisons from maps are stop 13 unless proven.
2. Tests: each processor from the stop before it to the stop after it, for every T1 row that runs it (each direction for
   `DirectionProcessor`).

## Write-set

`src/alg/mrtree/intermediate/{RootProcessor,LevelProcessor,NeighborsProcessor,LevelHeightProcessor,LevelCoordinatesProcessor,DirectionProcessor,NodePositionProcessor,GraphBoundsProcessor,Untreeifyer}{,.test}.ts`.

## Read-set

The nine Java files, T6's model and helpers, `decisions.md` TR3, TR7, stop-conditions 13.

## Interface contract (consumed by T17)

Each processor as an `ILayoutProcessor<TGraph>` with `process(graph, monitor)`.

## Acceptance criteria

- Given every T1 row reaching one of the nine processors, when it runs on the recorded "before" state, then the "after" stop equals
  the row at 1e-6.
- Given replay-alone coverage of the nine files, then ≥ 90 % branches (rest journaled as `U` candidates).

## Observability / Rollback

N/A — no new observable operations. Reversible.
