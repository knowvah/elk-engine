<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `intermediate/compaction` with `HorizontalGraphCompactor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the horizontal graph compactor`
Scratch: `$TMPDIR/7g/T7/`.

## Context

W1, W2, W6, W7, W14. `J/intermediate/compaction/{VerticalSegment (186), EdgeAwareScanlineConstraintCalculation (257),
HorizontalGraphCompactor (258), NetworkSimplexCompaction (324), LGraphToCGraphTransformer (673)}.java`. They import
`org.eclipse.elk.alg.common.compaction.oned.*` and `alg.common.networksimplex.*` (W2): use the landed `src/alg/common/**`
classes. Hashed containers (W6): `LGraphToCGraphTransformer`'s `commentOffsets`, `nodesMap`, `verticalSegmentsMap`, `lockMap`
(`:67-72`; key sets iterated at `:209,467,488`), the `inc`/`out` sets (`:413-419`, size only), `NetworkSimplexCompaction`'s
`lNodeMap` and `HashMultimap<LEdge, CNode>` (`:207-208`). `VerticalSegment` is `Comparable` (`:169`).

## Task

1. Port the five classes under `src/alg/layered/intermediate/compaction/` (Java order and names; `@see` on every symbol).
2. One `ad10` journal row per hashed container with its reads; identity-keyed and iterated → insertion order (W6).
3. Replay every `scenarios/HorizontalGraphCompactor/*` row and the `models` rows stopping at `HORIZONTAL_COMPACTOR` through T2's
   loader with the class injected (`factoriesWith`), plus the `full/compaction/*` rows once T15 wires the arm (T16's).
4. Do not touch `SplineEdgeRouter` (W7's recheck is T16's replay).

## Write-set

`src/alg/layered/intermediate/compaction/**`.

## Read-set

The five Java files, `src/alg/common/compaction/oned/*.ts`, `src/alg/common/networksimplex/*.ts`, `src/guava/HashMultimap.ts`,
`J/GraphConfigurator.java:270-280`, T2's helpers, `decisions.md` W2, W6, W7.

## Acceptance criteria

- Given a `scenarios/HorizontalGraphCompactor/*` or `models/*/HORIZONTAL_COMPACTOR/*` row, when replayed with the class injected,
  then the dump equals the row (AD-4).
- Given each hashed container, when audited, then the journal holds an `ad10` row; where iteration is observable, a reversal
  twin on the reaching rows (T2's hook) either still matches (order-independent, journaled) or the site uses the order the
  oracle shows; a mismatch traced to the order is stop 17.
- Given a fresh process, when each module is imported, then no `ReferenceError`.

## Observability / Rollback

N/A. Reversible.
