<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: layered-loops-evidence (issue #55, 2026-11-21)

Scoping by four read-only general-purpose agents (sonnet). Three ran mutants in TS scratch copies; none ran a JVM.
Every claim below is a planning claim: the brief's tasks verify it.

## Observation: three of #55's recipes do not discriminate as written

- **Context**: Checking each recipe of the issue against the Java and in TS scratch runs.
- **Finding**:
  - M2 (`BreakingPointInserter` `lDist < rDist`): with one skip edge per span the cuts stay [2,6] under both
    operators, because the tie at idx 4 scores about 5 and never beats idx 2/6. `5 × n0>n3` plus `4 × n4>n7` does
    discriminate (base [1,4], mutant [4,7]).
  - M6 (SOUTH external port `margin.bottom`): an outside SOUTH port label left the dummy's margin at 0 in the TS.
  - M10 (placeholder bottom): a WEST-only or EAST-only component is vertically locked (`setLock`), so a single-side
    edge "routed below every node" cannot move the placeholder.
- **Impact**: Recipes written into a follow-up issue from a mutation log are hypotheses. Pre-screen them before
  recording.
- **Confidence**: High (M2, a TS run); Medium (M6, M10).

## Observation: the `invertedPorts/*` rows never run the WEST inverted-port block

- **Context**: M4/M5 (`NetworkSimplexCompaction.java:250-290`).
- **Finding**: `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER` reverses the WEST-output edge before compaction, so the
  source-WEST guard is false. Only `…/northToEast` makes an inverted-port edge (target-EAST block). A cycle graph
  (a.p0 → b, a → x, x → b) keeps a forward WEST output edge and does enter the block.
- **Impact**: 7g's note "the rows reach the arm" holds for the EAST block only.
- **Confidence**: Medium (TS instrumentation, not the oracle).

## Observation: AlternatingLayerUnzipper produces edges between non-adjacent layers

- **Context**: `SplineEdgeRouterSegments.ts:137 if[1]`, which 7g found no graph for.
- **Finding**: `shiftNode` splits an in-layer edge between two nodes sent to different sub-layers, for example an
  inverted port's W → D, into W → d1 (later sub-layer) and d1 → e0 (earlier). The spline router then sees targets in
  neither adjacent layer. Every such edge lacks a segment, so the Java NPEs in `getSplinePath`. The loops recorder
  drops oracle-throw rows.
- **Impact**: Long-edge splitting is not the only invariant source for "edges span adjacent layers". The unzipper runs
  after it, before P4.
- **Confidence**: Medium (a hand trace; T4 runs it).

## Observation: the rectilinear-hull comparator arm is a sort-call-order question

- **Context**: Sc28, `PointQuadrant.ts:63`.
- **Finding**: The arm runs only if the sort calls the comparator with an earlier Q1 point first. In a Node v25.2.1
  scratch run, `Array.prototype.sort` made no such call on n = 2..5,000. 7g's "32+ points" figure was about the JDK's
  sort, which the port does not use.
- **Impact**: Comparator-arm reachability in the port depends on V8's call order, not on the Java's.
- **Confidence**: Medium (empirical, one Node build).

## Observation: loops ref headroom is 378 KB

- **Context**: Budgeting new rows.
- **Finding**: `layered-loops.json` is 16,399,101 bytes of 16,777,216 (the issue said about 418 KB). The landed `sites`
  rows average 3-14 KB; `scenarios/BreakingPointInserter` rows reach 150 KB.
- **Impact**: About 35 average rows fit. Node-level twins of the 27 root-option rows (about 226 KB) would not leave room
  for later missions.
- **Confidence**: High.
