<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-loops-evidence: the mutant set (issue #55)

The ten mutants #55 names, fixed so T6 can rerun them ([D1](decisions.md#d1)). Each row is one edit made by
exact-string replacement in a scratch copy. The driver fails if the anchor does not match exactly once in its file
(widen the anchor with surrounding context if needed, and journal the widened text). TS lines are at the base
`4c380f26`; lines moved since 7g's T21 journal (for example `PortSideAssigner.ts:141` → `:147`). Paths are under
`src/alg/layered/`.

| Id | TS site | Java site | Anchor → mutant | Planning status (scoping, TS scratch only) |
| -- | ------- | --------- | --------------- | ------------------------------------------ |
| M1 | `intermediate/loops/ordering/PortSideAssigner.ts:147` | `ordering/PortSideAssigner.java:189` | `Math.trunc(slPorts.length / 2)` → `Math.ceil(slPorts.length / 2)` | Recipe found by reading ([T1](batch-1/T1-found-rows.md)), not yet run |
| M2 | `intermediate/wrapping/BreakingPointInserter.ts:294` | `wrapping/BreakingPointInserter.java:283` | `if (lDist < rDist) {` → `if (lDist <= rDist) {` | Recipe killed it in a TS scratch run ([T1](batch-1/T1-found-rows.md)). The issue's recipe does not |
| M3 | `intermediate/compaction/NetworkSimplexCompaction.ts:103` | `compaction/NetworkSimplexCompaction.java:130` | `delta = Math.max(0, delta);` → `delta = delta;` | Open: no negative `delta` in about 20 TS candidates ([T2](batch-1/T2-compaction-search.md)) |
| M4 | `intermediate/compaction/NetworkSimplexCompaction.ts:258` | `NetworkSimplexCompaction.java:254` | `srcPort.getSide() === PortSide.WEST && LPort.OUTPUT_PREDICATE(srcPort)` → `… PortSide.EAST …` | Open: the WEST block runs on a cycle graph, but the separation constraints fix the segment ([T2](batch-1/T2-compaction-search.md)) |
| M5 | `NetworkSimplexCompaction.ts:282` (`addInvertedPortEdge`, shared by both Java blocks) | `NetworkSimplexCompaction.java:264, :283` | `NEdge.of().delta(1).weight(EDGE_WEIGHT)` → `NEdge.of().delta(0).weight(EDGE_WEIGHT)` | Open, as M4 |
| M6 | `intermediate/compaction/LGraphToCGraphTransformer.ts:425` | `LGraphToCGraphTransformer.java:654` | `(lNode.getSize().y + lNode.getMargin().bottom)` → `(lNode.getSize().y)` | Open: the SOUTH dummy's margin was 0 in the TS runs. Whether the oracle gives it a bottom margin is unknown ([T2](batch-1/T2-compaction-search.md)) |
| M7 | `components/ComponentsCompactor.ts:95` | `components/ComponentsCompactor.java:173` | `this.yetAnotherOffset.negate();` → removed | Condition known, graph not found ([T3](batch-1/T3-components-search.md)) |
| M8 | `components/ComponentsCompactor.ts:96` | `ComponentsCompactor.java:174` | `this.compactedGraphSize.add(this.yetAnotherOffset);` → removed | As M7 |
| M9 | `components/ComponentsCompactor.ts:169-171` | `ComponentsCompactor.java:164-166` | the `else if (fuzzyEquals(last.y, v.y, EPSILON)) { … }` arm → removed | As M7 |
| M10 | `compaction/components/ComponentsToCGraphTransformer.ts:263` (the placeholder loop; the same text occurs twice in the file) | `compaction/components/ComponentsToCGraphTransformer.java:271` | `cNode.hitbox.y + cNode.hitbox.height` → `cNode.hitbox.y` | Scoping suggests the single-side recipe is equivalent (vertical lock). Two-side candidate untested ([T3](batch-1/T3-components-search.md)) |

## Verdicts (filled by T6)

| Id | Verdict (`killed` / `equivalent` / `open`) | Killing row(s) or proof | Kill-suite file that failed |
| -- | ------------------------------------------ | ----------------------- | --------------------------- |
| M1 | `killed` | `sites/PortSideAssigner/oddCornerSplit/EQUALLY` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M2 | `killed` | `sites/BreakingPointInserter/improveCutsTie` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M3 | `killed` | `sites/NetworkSimplexCompaction/negativeSeparationDelta` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M4 | `killed` | `sites/NetworkSimplexCompaction/westInvertedPortEdge` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M5 | `killed` | `sites/NetworkSimplexCompaction/westInvertedPortEdge` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M6 | `killed` | `sites/LGraphToCGraphTransformer/southExternalPortMargin/{INSIDE,OUTSIDE}` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M7 | `killed` | `sites/ComponentsCompactor/externalEdgeOffset/{west,northFlush,northAbove}` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M8 | `killed` | `sites/ComponentsCompactor/externalEdgeOffset/{west,northFlush,northAbove}` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M9 | `killed` | `sites/ComponentsCompactor/externalEdgeOffset/{northFlush,northAbove}` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |
| M10 | `killed` | `sites/ComponentsToCGraphTransformer/southPlaceholderExtent/{south,southWest}` | `LayeredLoopsSites.test.ts`, `LayeredLoopsVectors.test.ts` |

T6 ran the driver of [D1](decisions.md#d1) on a scratch copy of the T5 tree (`b7850d06`), with the kill suite of 12 files
and the nine sweep dirs at `/nonexistent`:

- unmutated: 2,619 tests pass;
- sanity mutant (`PortSideAssigner.ts:59`, `setSide(PortSide.NORTH)` → `SOUTH`): 238 tests fail, so the copy sees its edits;
- M1-M10: each is killed, and only by the replay of the new rows named above (2 to 6 failing tests per mutant: each row
  is replayed by both files). No anchored suite fails, so before this mission no test observed these arms.

No mutant is `equivalent` or `open`: stop 4 did not fire and no `needs-ruling` issue was filed.

Anchors: every anchor matched exactly once. Two were widened, as this file allows:

- M9 is the removal of the four lines of the `else if (fuzzyEquals(last.y, v.y, EPSILON)) { … }` arm.
- M10 is anchored on the five lines of the placeholder loop's body (from `const cNode = placeholder.getSecond() as CNode;`
  to the `bottomRight.y` line), because the mutated expression also occurs in the loop over the `cNodes`.

The TS lines of M7 and M8 in the table above are one too low: at the base the two statements are
`ComponentsCompactor.ts:96` and `:97`, and the M9 arm is `:170-173`.

How the graphs were found, and why three of #55's recipes could not work as written, is in
[unreached.md](unreached.md#mutant-findings-t6).
