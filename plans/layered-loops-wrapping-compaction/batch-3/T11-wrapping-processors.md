<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Wrapping processors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T11): port the graph wrapping processors`
Scratch: `$TMPDIR/7g/T11/`.

## Context

W1, W6, W9, W13, W14. `J/intermediate/wrapping/{BreakingPointInserter (511, nested BPInfo), BreakingPointProcessor (395),
BreakingPointRemover (193), SingleEdgeGraphWrapper (292)}.java`; `GraphConfigurator` adds them for `wrapping.strategy`
`SINGLE_EDGE` and `MULTI_EDGE` (`J/GraphConfigurator.java:316-326`). `BreakingPointInserter.ts` and
`BreakingPointInserterBPInfo.ts` are staged since 7a (marker and registry rows stay until T15). Hashed containers (W6):
`alreadySplit` (`Sets.newHashSet`, `:134`, membership), `openEdges` (`newLinkedHashSet`, `:137`), `open` (`:341`, size and
add/remove only). `BreakingPointRemover` sets `SPLINE_SURVIVING_EDGE`/`inverseOrder` that the landed
`FinalSplineBendpointsCalculator.ts:96,141` reads (7e's hand-off).

## Task

1. Port the four processors and `BPInfo` (replace the staged bodies, keep markers, W13), using T6's heuristics.
2. Rewrite `BreakingPointInserter.test.ts` and `BreakingPointInserterBPInfo.test.ts` into tests of the real classes (W9,
   journaled with old and new).
3. Replay every `scenarios/<Class>/*` row and the `models` rows stopping at `BREAKING_POINT_INSERTER`, `BREAKING_POINT_PROCESSOR`,
   `BREAKING_POINT_REMOVER`, `SINGLE_EDGE_GRAPH_WRAPPER` through T2's loader with the classes injected (`factoriesWith`).

## Write-set

`src/alg/layered/intermediate/wrapping/{BreakingPointInserter,BreakingPointInserterBPInfo,BreakingPointProcessor,BreakingPointRemover,SingleEdgeGraphWrapper}.ts`
(plus sections) and their `.test.ts` files.

## Read-set

The four Java files, T6's classes, `src/alg/layered/intermediate/FinalSplineBendpointsCalculator.ts:90-150`,
`src/alg/layered/options/InternalProperties.ts` (`BREAKING_POINT_INFO`, `SPLINE_SURVIVING_EDGE`), T2's helpers,
`decisions.md` W6, W9, W13.

## Acceptance criteria

- Given a wrapping `scenarios` or `models` row, when replayed with the classes injected, then the dump equals the row (AD-4).
- Given `MULTI_EDGE` rows with `SPLINES`, when replayed, then `FinalSplineBendpointsCalculator`'s `inverseOrder` and surviving-edge
  arms run (coverage) and match.
- Given each hashed container, when audited, then the journal holds an `ad10` row.

## Observability / Rollback

N/A. Reversible.
