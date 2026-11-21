<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: search for M3-M6 (network simplex compaction, external SOUTH ports)

## Context

The planning scoping ran about 35 TS candidates without a kill. Its findings:

- **M3** (`NetworkSimplexCompaction.ts:103`, `Math.max(0, delta)`): `delta < 0` never occurred. It needs
  `incNode.cGroupOffset.x > cNode.cGroupOffset.x + width + spacing`, a grouped vertical segment with a large group
  offset. A first idea to try: the group master far left with another node between the master and the segment.
- **M4/M5** (inverted-port blocks, `.ts:258` / `:282`; Java `:250-290`):
  - `sites/HorizontalGraphCompactor/invertedPorts/{west,east,both}` never run the WEST block, because
    `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER` flips the edge. Only `…/northToEast` makes an edge.
  - A cycle (a.p0 → b, a → x, x → b; `a` FIXED_SIDE with p0 on WEST) does run the WEST block. But in 15 variants the
    segment sat at `leftNeighbour.right + 10`, fixed by a separation constraint that was not traced.
  - Next step: log `cNode.constraints` of the vertical-segment CNode and find which constraint pins it. Then build a
    graph with no node overlapping the segment's y-range on its left.
- **M6** (`LGraphToCGraphTransformer.ts:425`, `margin.bottom`):
  - A whole-layout row is needed (`layoutSite`): the external-port dummies are placed only in the nested compaction.
  - Adding an outside SOUTH port label to `northSouthExternalPorts/EDGE_LENGTH` left the dummy's margin at 0, and the
    label size was 0 at compaction. Settle why first.
  - The Java's `LabelAndNodeSizeProcessor.placeExternalPortDummyLabels` OUTSIDE branch reads as if it sets a bottom
    margin. Is that lost in the TS, in the JSON, or also on the oracle?

## Task

1. Make a scratch copy with switchable mutants (an environment variable per mutant is fine) and instrumentation:
   - the raw `delta` at `:103`;
   - entry to each inverted-port block, and the edges it creates;
   - the vertical-segment CNode's constraints;
   - the SOUTH dummy's `margin` in `applyExternalPortPositions`.
2. Search within the [stop-4 budget](../stop-conditions.md#search-budget-stop-4). Use the [T1](T1-found-rows.md)
   pre-screen method; for whole-layout candidates, clone a `layoutSite` row such as
   `sites/HorizontalGraphCompactor/northSouthExternalPorts/*` (`LayeredLoopsVectorsSites.java:309-343`).
3. M6 first step: hand the orchestrator the smallest graph with an outside SOUTH external-port label. The orchestrator
   runs a D4 oracle probe printing the SOUTH dummy's `getMargin()` at `LGraphToCGraphTransformer.applyExternalPortPositions`.
   If the oracle's margin is > 0 while the TS margin is 0, that is a port divergence: stop 2, diagnosis, not search. If
   it is 0 on both, draft the equivalence argument (where the margin is reset or never set) and name the oracle fact.
4. For each mutant, hand back one of:
   - a candidate (snippet, id, stop, the dump field the mutant changes);
   - a proof draft meeting [D4](../decisions.md#d4), naming the oracle facts it needs;
   - the budget spent, with the shapes tried.

## Write-set

None in the repository. Scratch: `$TMPDIR/layered-loops-evidence/T2/`.

## Read-set

`src/alg/layered/intermediate/compaction/{NetworkSimplexCompaction,LGraphToCGraphTransformer,HorizontalGraphCompactor}.ts`
and their Java (`compaction/*.java`); `src/alg/layered/intermediate/LabelAndNodeSizeProcessor.ts` (external-port dummy
labels); `tools/vectors/LayeredLoopsVectors/LayeredLoopsVectorsSites.java:297-345`; `plans/layered-loops-wrapping-compaction/unreached.md`
Sc29-Sc34.

## Acceptance criteria

- Given each of M3, M4, M5 and M6, when T2 ends, then the hand-back holds a TS-screened candidate, a D4 proof draft,
  or the spent budget with the shapes tried.
- Given M6, when the oracle probe runs, then its margin value is journaled before any equivalence claim is made.

## Observability

N/A: scratch search, no runtime code.

## Rollback

Nothing to roll back (no repository write).
