<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-loops-evidence: decisions

Locked decisions AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) apply unchanged. AD-13 governs every row: a new
expected value comes from an oracle run, never from the port or by hand.

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next` on 2026-11-21 with nobody present. Each decision records the options it
rejected and the evidence, so the maintainer can audit it. The evidence came from four read-only scoping passes
(general-purpose agents, sonnet). Three of them ran mutants in TS scratch copies; none ran a JVM. The planner re-read the
key claims (file:line cited).

### D1

**The mutant set is the ten edits of #55, fixed in [mutants.md](mutants.md) (M1-M10). The kill suite and the method
follow label-switcher-mutants D2/D3.**

- Kill suite: `src/alg/layered/LayeredLoopsSites.test.ts`, `src/alg/layered/LayeredLoopsVectors.test.ts`, and the
  anchored suites of the mutated classes: `intermediate/loops/LoopsAnchored.test.ts`, `intermediate/loops/ordering/OrderingAnchored.test.ts`,
  `intermediate/wrapping/{WrappingAnchored,WrappingRows,BreakingPointInserter}.test.ts`,
  `intermediate/compaction/{CompactionAnchored,HorizontalGraphCompactor}.test.ts`, `compaction/CompactionAnchored.test.ts`,
  `components/{ComponentsCompactor,ComponentsCompactorAnchored}.test.ts` (all under `src/alg/layered/`). Run them with the
  nine sweep dirs set to `/nonexistent`. No other suite counts toward a kill.
- Method: copy the repository to `$TMPDIR/layered-loops-evidence/mutants/` with `rsync -a --exclude .git --exclude coverage`
  and `node_modules` symlinked. A driver applies one mutant by exact-string replacement (it fails unless the anchor
  matches exactly once), runs the kill suite, and restores the file. The worktree is never mutated. The driver and its
  log stay in `$TMPDIR`, and the journal quotes the log's summary.
- Rejected: a mutation-testing dependency. It is not EPL-reviewed, and the set is ten edits.

### D2

**New rows are `sites` step rows in the loops recorder, appended after the 64 landed `sites` rows. Candidate graphs are
pre-screened on a TS scratch copy carrying the mutant; the oracle row is the only evidence.**

- Where: a new method `evidenceSites()`, called last in `LayeredLoopsVectorsSites.java`'s group list (`:93-99`), so every
  new row follows the landed ones. If `LayeredLoopsVectorsSites.java` would pass 500 lines (345 at planning; the
  complexity hook blocks a larger file), the method goes into a new helper `LayeredLoopsVectorsEvidence.java` instead.
  The helper is inserted into the superclass chain between `LayeredLoopsVectorsSites` and `LayeredLoopsVectorsBuild`
  (`LayeredLoopsVectorsBuild.java:31`), and the helper headers' "Helper n of 10" counts are updated. Every helper class
  name starts with `LayeredLoopsVectors`, because `elkFrame` tells recorder frames from ELK frames by that prefix
  (`.agent-notes/vector-recorder-debts.md`).
- Ids: `sites/<Class>/<scenario>[/<variant>]` under the class the arm lives in, never children of a landed id. Shapes:
  `stopSite(id, elk, STOP, manager, sets…)` for a step row, `layoutSite(id, elk, target)` for a nested graph that needs
  the recursive engine (compaction of external ports, components compaction).
- Pre-screen: a candidate is recorded only if, in a TS scratch copy, the mutant changes the replayed dump of the
  candidate row. The planning scoping already did this for M2. This is a search aid. It is pure TS, so it is not
  evidence. After recording, T6 reruns every mutant against the recorded rows.
- Rejected: (B) `scenarios` rows. The group is the 7g scenario catalogue, and `sites` is where arm-targeted rows go
  (7g T20 precedent). (C) A second loops ref. Planning estimates about 60-120 KB of new rows against 378 KB of headroom
  ([D3](#d3)), so it is not needed.

### D3

**The ref changes only by appended rows, with an id-keyed diff, and the new rows stay within a 250 KB byte budget.**

- `test/golden/refs/java/layered-loops.json` is the one ref this brief names (queue gate 7). A scratch script compares
  base and new by row id: every base row byte-equal (compact JSON), every new id under the D2 prefixes, and the header
  differing only in `rowCounts.sites`. Each regeneration is journaled with the oracle stamp (`8bca22f4` + 0001-0004).
- Budget: 16,399,101 bytes at planning, 16,777,216 cap. The new rows must total ≤ 250 KB, leaving at least 128 KB for
  later missions. The recorder's own `MAX_BYTES` check (`LayeredLoopsVectorsEncoding.java:32`) stays as is.
- If the measured total passes 250 KB, drop rows in this order: the [D7](#d7) rows 3-4, then any second variant of one
  mutant's rows. A mutant's only killing row is kept.

### D4

**Proof standard for `equivalent` (label-switcher-mutants D6, unchanged).**

- An argument from the code that holds for **every** input. "No graph found" is never a proof.
- An argument that rests on a runtime fact holds only after that fact is shown on the oracle. Use a single-file `java`
  probe on the oracle classpath under `$TMPDIR` that prints the value at the processor's entry, and quote its output in
  the journal.
- Planning's open runtime facts:
  - M6: does an external-port dummy on the SOUTH side ever carry `margin.bottom > 0` when `applyExternalPortPositions`
    runs on the oracle?
  - M10: is a single-side WEST/EAST component locked vertically, so that its placeholder bottom never exceeds the hull
    bottom?
  - M3: can `incNode.cGroupOffset.x > cNode.cGroupOffset.x + width + spacing` hold?
- A mutant with neither a killing row nor a proof is `open`. It becomes a `needs-ruling` issue (stop 4); it is not a halt.

### D5

**`SplineEdgeRouterSegments.ts:137 if[1]`: an oracle probe, an X classification, and a TS test that the port throws
where the Java throws. No ref row.**

- Context: the scoping traced a producer that 7g did not consider. It is `AlternatingLayerUnzipper`
  (`layerUnzipping.strategy=ALTERNATING`), which splits an in-layer edge of an inverted port into a backward or
  layer-skipping edge. The graph: W (FIXED_SIDE) with a WEST output port to T, `edgeRouting=SPLINES`, and the order
  [W, D] after `INVERTED_PORT_PROCESSOR`. Both Java sites (`SplineEdgeRouter.java:398-402` and `:445-449`) map to the one
  TS arm. Every hit then reaches `getSplinePath` with an edge that has no segment: a `NullPointerException` in the Java
  (`SplineEdgeRouter.java:951-957`), and the TypeError the port documents (`SplineEdgeRouter.ts:441-443`). The loops
  recorder does not record oracle throws (`LayeredLoopsVectors.java:72-75`).
- Decision: T4 confirms the trace on the TS port (the arm runs, then the TypeError at `getSplinePath`). The orchestrator
  runs a single-file oracle probe of the same graph that prints the exception class and its first ELK frame. T7 adds a
  case to `src/alg/layered/p5edges/splines/SplineEdgeRouter.sites.test.ts` that runs the graph through the TS layered
  layout. It asserts that the arm is taken (by a spy or counter on the TS side) and that the layout throws a `TypeError`
  whose stack names `getSplinePath`, citing the probe's journal row. This mission's [unreached.md](unreached.md)
  reclassifies the arm from S to X, which is 7g's class for `:246 if[1]` and `:257 if[1]`.
- Rejected: (B) teaching the loops recorder to record a `throws` expectation, as the trees recorders do. That changes
  the recorder's ORACLE THROWS policy, the row format and the replay helper, and recording the 51 dropped rows would
  change the ref beyond D3. (C) A `calls/` row in `LayeredRoutingVectors`. The method is private, and the call would
  still NPE.
- If the oracle probe does not throw at `getSplinePath`, or the TS port does not reach the arm, apply stop 2.

### D6

**Sc28 (the four rectilinear-hull arms): proofs in this mission's [unreached.md](unreached.md), no row.**

- Context (scoping, to be verified by T4):
  - `RectilinearConvexHull.ts:17` cond-expr[0]: dead. Equal-x points in one quadrant always differ in convexity.
  - `:223` if[1]: dead. The last sorted point is a convex Q2/Q3 point at xmax, which queues.
  - `RectilinearConvexHullRectangleEventHandler.ts:71` if[1]: dead. The Q1/Q4 convex points at xmin sort first and set
    minY/maxY.
  - `PointQuadrant.ts:63` binary-expr[1]: reached only if the sort calls the comparator with an earlier Q1 point first.
    `Scanline.ts:44` uses `Array.prototype.sort`, which made no such call on n = 2..5,000 in a Node v25.2.1 scratch
    run. 7g's "32+ points" came from the JDK's sort, which does not apply to the port.
  - No recorder calls `RectilinearConvexHull`. The loops recorder has no `call` step (`LayeredLoopsVectorsSteps.java`).
- Decision: T4 turns each argument into a proof that meets D4, or into a reproducible scratch measurement where the
  claim is empirical (the V8 call order: a script that records comparator call pairs over the hulls of every landed
  `components-compaction` and `ComponentsCompactor` row, plus random and adversarial point sets; journaled with the Node
  version). The PointQuadrant arm is classified **U on V8** with that evidence, not as dead code. The Java's own call
  order is irrelevant to the port's coverage, and the comparator is consistent, so the sort result is the same either
  way.
- Rejected: (B) a new `call` step kind with a point-list codec and replay in the loops recorder. It adds tooling to
  reach arms that the public method cannot reach in the port. (C) A 32+-point hull layout row (7g's plan). No such row
  reaches the arm on V8.

### D7

**Node-level `selfLoopDistribution` × `selfLoopOrdering`: four new FREE-node rows. The 27 root-level rows stay
untouched.**

- Context: the 27 `full/self-loops/*/distribution-*/ordering-*` rows (`LayeredLoopsVectorsModelRows.java:261-268`) set
  the options on the root. The options target nodes (`Layered.melk:667, :676`). Readers:
  - distribution: `PortSideAssigner.java:42`, FREE nodes only.
  - ordering: `PortRestorer.java:70` and `routing/LabelPlacer.java:79`.
  - Each single value is already observed at node level (`full/self-loops/self_loops-free/*`,
    `sites/PortSideAssigner/hiddenAndVisible/*`, `sites/PortRestorer/reverseStacked/*`). On a FREE node, (NORTH,
    REVERSE_STACKED), (NORTH_SOUTH, REVERSE_STACKED), (EQUALLY, SEQUENCED) and (EQUALLY, REVERSE_STACKED) are missing.
- Decision: rows `sites/PortRestorer/freeDistribution/<DIST>-<ORDER>` for those four. Each is a FREE node with all
  ports hidden, two-port loops (2, 3, 9 and 9 loops respectively; the EQUALLY rows need a ninth loop to put two
  one-sided loops on one side), stopped at `SELF_LOOP_PORT_RESTORER` with `manager` false. About 36 KB in all. Before a
  row is accepted, its dump's `ports` must show two one-sided loops on one side.
- Rejected: (B) 27 node-level twins of the root rows (about 226 KB, 60% of the headroom, redundant for single values).
  (C) No rows. The issue offers it as a "could", but the combinations are cheap.

### D8

**No existing assertion changes (AD-13).** `LayeredLoopsVectors.test.ts:54` reads `sites` from the ref's header, and
`LayeredLoopsSites.test.ts` iterates the rows, so neither needs an edit. A changed assertion about an existing row is
stop 3. Documentation counts ("`sites` 64", "1,627 rows") are updated in T8 as documentation, not as tests.

### D9

**No `src/` change is planned.** A TS mismatch on a new row is diagnosed (stop 2). A fix is allowed only with the full
artifact (mechanism, origin, causal chain, ruled out), inside the class the row targets, with the row as its test, and
journaled.

### D10

**Earlier plans are not edited.** `plans/layered-loops-wrapping-compaction/unreached.md` keeps its text. This mission's
[unreached.md](unreached.md) records each reclassification (spline `:137`, the Sc28 arms, any `equivalent` mutant)
under the 7g row it corrects, and the roadmap revision names it.

### D11

**Landing:** one squashed commit. Subject `test(layered): add oracle rows for the 7g survivors and arms` (60
characters), or `fix(layered): …` if a D9 fix landed. Footer `Refs: #55`, no attribution lines (queue rule). Tag
`layered-loops-evidence/pre-squash` before `git reset --soft <base>`.
