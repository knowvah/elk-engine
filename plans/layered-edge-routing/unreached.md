<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7e branches unreached by the oracle replay (T11, L4 under X5, R12)

Measured 2026-11-03 on `feature/layered-edge-routing` after T10 (`test(T10)`): one run of the generic routing replay
alone (`src/alg/layered/LayeredRoutingVectors.test.ts`, 889 tests: 883 rows + 6 counts) with v8 coverage over
`p5edges/**` and `intermediate/**` (test files excluded), 1-minute load 38 (coverage is load-independent), then filtered
to the 7e classes: `src/alg/layered/p5edges/**` (sections and prefixed files included) and the six processors
`intermediate/{HyperedgeDummyMerger*,HierarchicalPortPositionProcessor,LayerSizeAndGraphHeightCalculator,LongEdgeJoiner,NorthSouthPortPostprocessor,FinalSplineBendpointsCalculator*}.ts`
(the 7b/7c/7d processors in the same directory, the staged `DebugUtil` and the enums' throwing arms are outside the measure):

```bash
npx vitest run --coverage --coverage.include='src/alg/layered/{p5edges,intermediate}/**' \
  --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text \
  --coverage.reportsDirectory=<scratch>/T11/cov src/alg/layered/LayeredRoutingVectors.test.ts
```

Totals over the 7e classes (46 files): 1,005 branches of which **309** untaken, 439 functions of which **94**
uncovered, 2,619 statements of which 698 uncovered; the threshold error the run prints reflects the unfiltered include
list. Fully covered by the replay: `EdgeRouterFactory`, `PolylineEdgeRouterInLayer`, `OrthogonalRoutingGeneratorCycles`,
`OrthogonalRoutingGeneratorTolerance`, `HyperedgeDummyMergerMergeState`, `SplineSegmentEdgeInformation`. Every untaken
site appears exactly once in the three group tables below (branch arms as v8 numbers them: `if[0]` the consequent,
`if[1]` the alternative, `binary-expr[k]` the k-th operand, `cond-expr[0]` the true arm, `switch[k]` the k-th case; a
classification script in the T11 scratchpad extracted the 403 items and three read-only analysts classified them per
group; the partition was checked by hand against the per-group totals):

| Category | Meaning | Branches + functions |
| -------- | ------- | -------------------- |
| S | Numeric or algorithmic behaviour: an oracle step scenario (`sites/*`) or a direct-call scenario (`calls/*`) (T13 row, T14 anchored test) | 172 (A 80, B 30, C 62) |
| J | Structural behaviour with Java-derived expectations: `getLayoutProcessorConfiguration`s, enum surfaces, `toString`s and the R6 one-decimal formatter, `equals`/`hashCode`/`compareTo`, constructors the recorder's reflection cannot reach (twins of oracle-pinned forms), exception branches and the explicit `TypeError` unboxing checks (the recorder records no throwing row), no-caller members | 164 (A 42, B 14, C 108) |
| U | Unreachable through 7e: labels and comments (7f), the hierarchical orthogonal router and its N/S direction strategies (7f), wrapping (`inverseOrder`, `SPLINE_SURVIVING_EDGE`) 7g, dead by construction (table below), two Medium-confidence splitter arms | 63 (A 35, B 25, C 3) |
| X | Enum `valueOf` throwing arms (3), the staged `DebugUtil.logDebugGraphHyperedges` call (1) | 4 (A 3, C 1) |

Two push-forward decisions widen S beyond the brief's U wording, following 7c S13 / 7d S12 (journaled): self loops
reach the 7e classes on step rows that omit `SELF_LOOP_PREPROCESSOR` (`sites/SelfLoop/*`), and the compaction arms of
`FinalSplineBendpointsCalculator.segmentAllowsSloppyRouting` read an option only, so a row that sets
`compaction.postCompaction.strategy=LEFT` without the 7g compactor reaches them (`sites/FinalSplineBendpoints/compaction/*`).

## Scenarios (20 ids, about 36 rows; stop 9 at about 30 ids)

Step scenarios are inline ELK JSON graphs plus the step list in T1's op vocabulary; the common orthogonal plan (A) is
`importGraph`, `normalise`, `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER`, `runPhase P1 GREEDY`, `LAYER_CONSTRAINT_PREPROCESSOR`,
`runPhase P2 NETWORK_SIMPLEX`, `LAYER_CONSTRAINT_POSTPROCESSOR`, `LONG_EDGE_SPLITTER`, `PORT_SIDE_PROCESSOR`,
`PORT_LIST_SORTER`, `runPhase P3 INTERACTIVE`, `IN_LAYER_CONSTRAINT_PROCESSOR`, `LABEL_AND_NODE_SIZE_PROCESSOR`,
`INNERMOST_NODE_MARGIN_CALCULATOR`, `runPhase P4 INTERACTIVE`, `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`,
`runPhase P5 ORTHOGONAL`, `dump` (explicit `x`/`y` fix the order and coordinates; the layer sweep and BK straighten the
edges so the critical coincidences never arise with them). Node widths 30, layer 0 at x=0, layer 1 at x=100; `id@y/h`;
"[p]" marks one explicit 4×4 port (EAST on the left side, WEST on the right), `portConstraints=FIXED_SIDE`. The A
carriers (Sc4–Sc8) were found by random search on the TS port (seeds 8324, 3131, 78235, 71176, 70711; graphs in the
T11 scratch `A/work/final_scenarios.json`) and every S arm of A was reached on the TS port; B and C graphs were probed
on the TS port (S5/S6 by simulation only). The oracle recording (T13) decides the expected values; a row the oracle
refuses or throws on moves its arms to U in the corrections section. Rows under ten nodes carry the full dump.

| # | Scenario id | TS sites | Graph / arguments | Steps / options | Expected field |
| - | ----------- | -------- | ----------------- | --------------- | -------------- |
| Sc1 | `sites/OrthogonalRoutingGenerator/crossedPair` | critical 2-cycle, basic split, one reachable area: `HyperEdgeCycleDetector.ts:256 if[1]`, `HyperEdgeSegmentSplitter.ts:48 if[1]`, `:245 if[1]`, `OrthogonalRoutingGenerator.ts:382 if[0]`, every "any split" site | a@0/30, b@50/30 → c@0/30, d@50/30; edges a→d, b→c | common plan | `geometry.edges` bend points (TS: e0 `(50,15),(50,65)`; e1 `(40,65),(40,40),(60,40),(60,15)`) |
| Sc2 | `sites/HyperEdgeSegmentSplitter/twoCycles` | `HyperEdgeSegment.ts:281`, splitter `:62`, `:178 if[0]`, `:204 if[0]`, `:207 if[1]` | L0@0, L1@50, L2@200, L3@250 → R0@0, R1@50, R2@200, R3@250 (h 30); L0→R1, L1→R0, L2→R3, L3→R2 | common plan | bend points, `layers`, layer sizes |
| Sc3 | `sites/HyperEdgeSegment/equalPortPositions` | `HyperEdgeSegment.ts:137 if[0]` | L0@0/30 with port L0.p at (30,13); R0@60/30 at x=100 with R0.p1, R0.p2 both at (−4,8); `portConstraints=FIXED_POS`; L0.p→R0.p1, L0.p→R0.p2 | common plan | bend points |
| Sc4 | `sites/HyperEdgeCycleDetector/criticalOutNoCriticalIn` | `HyperEdgeCycleDetector.ts:248`, `OrthogonalRoutingGeneratorConflicts.ts:80 if[0]` | a0@40/30, a1@160/30 → b0@40/30, b1@170/10; a0→b1, a1→b1, a1→b0 | common plan | bend points |
| Sc5 | `sites/HyperEdgeSegmentSplitter/hyperedgeSplitsRegular` | splitter `:129 if[0]`, `:204 if[0]` | a0@5/20, a1@80/30 [p] → b0@−5/50 [p], b1@75/50 [p], b2@165/30 [p]; a0→b1.p, a1.p→b0.p, a1.p→b2.p | common plan | bend points |
| Sc6 | `sites/HyperEdgeSegmentSplitter/areaRatingFewerDependencies` | splitter `:366 if[0]`, `:369 if[1]`, `:330 if[0]`, `:332`, the rating functions | a0@45/40, a1@260/10 → b0@40/50, b1@140/50 [p], b2@210/10, b3@240/50 [p]; a0→b1.p, a0→b3.p, a1→b0, a0→b2 | common plan | bend points |
| Sc7 | `sites/HyperEdgeSegmentSplitter/areaRatingFewerCrossings` | splitter `:362 if[0]`, `:370 if[1]`, `:390 if[1]` | a0@100/30 [p], a1@150/30 [p], a2@250/30 → b0@100/30 [p], b1@155/20 [p], b2@200/30 [p], b3@255/20 [p]; a0.p→b1.p, a1.p→b0.p, a1.p→b2.p, a2→b1.p, a2→b2.p, a0.p→b3.p | common plan | bend points |
| Sc8 | `sites/HyperEdgeSegmentSplitter/denseCycles` | splitter `:115 if[0]`, `:365 if[1]`, `:370 if[0]`, `OrthogonalRoutingGenerator.ts:388 if[1]` and most other arms | a0@−5/40, a1@50/30 [p], a2@100/30 [p], a3@155/20 [p] → b0@0/40, b1@65/10 [p], b2@115/10 [p], b3@155/30, b4@255/30; a0→b0, a0→b1.p, a0→b2.p, a0→b3, a1.p→b2.p, a1.p→b3, a2.p→b1.p, a3.p→b0, a3.p→b1.p, a2.p→b4 | common plan | bend points |
| S9 | `sites/HierarchicalPortPosition/fixedCoordinates/{fixedPos,fixedRatio,northSouth}` | `HierarchicalPortPositionProcessor.ts:65 if[1]`, `:75 if[0,1]`, `:81 binary-expr[0,1] if[0,1]`, `:87 if[0,1]` | the `external-chain` row's graph (target T, chain c0–c3, `edgeRouting=ORTHOGONAL`) with explicit port positions: `fixedPos` `portConstraints=FIXED_POS` with W, E, N, S ports; `fixedRatio` the same with `FIXED_RATIO` and ratio positions; `northSouth` `FIXED_POS`, N and S ports only (N→c0, S←last) so the replacement dummies sit in the first/last layer | the row's step list through `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`, `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`, stop `HIERARCHICAL_PORT_POSITION_PROCESSOR` | `geometry.nodes` (the E/W dummies' y: `finalY − anchor.y`, × graph height under `fixedRatio`) |
| S10 | `sites/HierarchicalPortPosition/emptyGraph` | `:45 if[1]`, `:49 if[1]` | a hierarchical target with no children | `importGraph T`, `normalise`, `runProcessor HIERARCHICAL_PORT_POSITION_PROCESSOR` | `layers` `[]`, `changed` empty |
| S11 | `sites/EmptyLayer/{layerSize,merger}` | `LayerSizeAndGraphHeightCalculator.ts:39 if[0]`; `HyperedgeDummyMerger.ts:81 if[0]` | 2 nodes a→b | `importGraph`, `normalise`, `layers [[a],[],[b]]` (the 7b op builds an empty `Layer`; T13 verifies the Java interpreter accepts an empty inner list), then `runProcessor LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR` / `HYPEREDGE_DUMMY_MERGER` | layer sizes (empty layer 0×0), graph size.y, offset.y / `layers`, `changed` |
| S12 | `sites/HyperedgeMerger/parallelLongEdges/{merger,splines}` | `HyperedgeDummyMerger.ts:208 if[1]`; `FinalSplineBendpointsCalculatorBezier.ts:75 if[1]` | a (EAST port a.p0, FIXED_SIDE), m, x (WEST port x.p0, FIXED_SIDE); a.p0→m, m→x.p0, a.p0→x.p0 twice; `mergeEdges=true`, `edgeRouting=SPLINES` (the shared ports are required: with per-edge ports nothing merges) | the plan through `INNERMOST_NODE_MARGIN_CALCULATOR`, stop `HYPEREDGE_DUMMY_MERGER` (`merger`); then P4 BK, `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, P5 SPLINES, `LONG_EDGE_JOINER`, stop `FINAL_SPLINE_BENDPOINTS_CALCULATOR` (`splines`) | `layers`, `edges`, `changed` / bend points of the two a.p0→x.p0 edges |
| S13 | `sites/SelfLoop/{polyline,orthogonal,splines}` | `PolylineEdgeRouter.ts:441 if[1]`; `NorthSouthPortPostprocessor.ts:20`, `:22 if[1]`, `:62 if[0]`, `:226`; `WestToEastRoutingStrategy.ts:54 if[1]`; `SplineEdgeRouterSegments.ts:119 if[0]`, `:162 if[0]` | 3 nodes a→b→c with a same-side NORTH self loop on b (`portConstraints=FIXED_SIDE`); the steps omit `SELF_LOOP_PREPROCESSOR` (7c S13 / 7d S12 device; a north–north loop through P4, P5 polyline and NSPP calls `processSelfLoop` once on the TS port; a W→E loop crashes P3 in `BinaryIndexedTree`, 7c finding) | the plan with `NORTH_SOUTH_PORT_PREPROCESSOR`, P5 `<R>`, `NORTH_SOUTH_PORT_POSTPROCESSOR` (before P5 under SPLINES) | bend points, `changed` |
| S14 | `sites/FinalSplineBendpoints/compaction/{near,far}` | `FinalSplineBendpointsCalculator.ts:186 if[1]`, `:193`, `:197`, `:201`, `:205 if[0,1]`, `:217 fn` | the `sloppy/long-edges` scenario graph with `compaction.postCompaction.strategy=LEFT` and `edgeRouting.splines.mode=SLOPPY`; `near`: a segment whose source and target nodes are within `segmentNodeDistanceThreshold`; `far`: beyond it | the SPLINES plan to `FINAL_SPLINE_BENDPOINTS_CALCULATOR` without the 7g compactor (option-only read at `FinalSplineBendpointsCalculator.java:586`) | bend points |
| S15 | `sites/SplineEdgeRouter/dependencyCycle/{uniform4,tie}` | `SplineEdgeRouterRanking.ts:58 if[1]`, `:72 if[0,1]`, `:73 if[0,1]`, `:126 if[0]`, `:149 if[0]`, `:197 if[0]`, `:199 binary-expr[0,1] if[0,1]`, `:211 if[0]` | two layers of 4 nodes, one edge per left node, port y = 40·index; `uniform4`: left i → right perm(i), perm (3,2,0,1) (three positive-weight dependencies in a cycle, draw size 1); `tie`: left y (0,200,240,280), right y (80,200,240,320), perm (2,3,0,1): a draw among 2 equal-outflow segments (`nextInt(2)`, R7) recorded under two `randomSeed` values that pick differently (T13 scans seeds on the TS port) | explicit node `y` (height 20, ports at the centre), `crossingMinimization.strategy=INTERACTIVE`, an interactive/simple placer, `edgeRouting=SPLINES`; plan to `runPhase P5 SPLINES` (simulation only; T13 verifies) | `geometry.splines` (rank, xDelta, box, chain), graph size x, `changed` |
| S16 | `sites/SplineEdgeRouter/rightwardNesting` | `SplineEdgeRouterRanking.ts:302 if[1]` | in-layer segments with no left port from FIXED_SIDE WEST output ports (inverted-port dummies share the layer); one long segment s=[0,200] with two disjoint nested segments t1=[50,100], t2=[120,160] (dependencies s→t1, s→t2 leave `s.outweight` 1 after t1) | the plan with `INVERTED_PORT_PROCESSOR`, interactive positions; `edgeRouting=SPLINES`; to `runPhase P5 SPLINES` (simulation only; T13 verifies) | `geometry.splines` rank, `isStraight` |
| S17 | `calls/NubSpline/extremePoints/*` | `NubSplineDerivation.ts` all 35, `NubSplineKnots.ts:202`, `NubSplinePolarCP.ts:111`, `NubSpline.ts:364 if[0]` + the four hidden statics | `NubSpline.getFirstVerticalPoint`/`getLastVerticalPoint`/`getFirstHorizontalPoint`/`getLastHorizontalPoint` (protected statics; the recorder's reflection reaches them) with `["nubs", true, 3, <6 points>]`, `["double", 1e-3]`, `["int", maxRecursion]`; polygons P1 (0,80),(30,40),(60,10),(40,30),(80,70),(120,90); P2 (100,0),(60,30),(20,60),(40,40),(80,20),(120,10); P3 (0,0),(10,10),(10,10),(30,5),(50,30),(60,40) (equal consecutive points); P4 monotone (0,0),(10,10),(20,25),(30,40),(50,60),(60,90); all four statics on P1–P3, P4 on FirstV and LastH; maxRecursion 10, plus 1 and 0 on a few; optionally `getPointOnCurve(nubs, t, true)` | `importGraph` only | `result` vector |
| S18 | `calls/NubSpline/construction/{padded-1pt,padded-2pt,padded-3pt,getPointOnCurve-unclamped,niceCurve}` | `NubSpline.ts:44 if[0]`, `:46 if[1]`, `NubSplineKnots.ts:223 if[1]`, hidden `generateNiceCurve`/`addMirrored`/`mirrorOnX` | `toBezier(nubs(true,3,[(10,5)]))`, `[(0,0),(10,5)]`, a 3-point list (padded to 4 by repeating the first point); `getPointOnCurve(nubs(false,3,<7 points>), ["double", 0.45])` (valid range [0.3, 0.7]); `generateNiceCurve()` (pins the aliased-vector quirk) | `importGraph` only | `nubs` / `vector` |
| S19 | `calls/Rectangle/extents/{union-node-*,getHeight-*,getWidth-*}` | `Rectangle.ts:195 if[0]`, `:211`, `:270`, `:275` | `Rectangle.union(["rectangle",…], ["node","g0/n0"])` with a node at non-zero x, y, w, h (one rectangle disjoint, one containing it) → `union(LShape)`; `getHeight`/`getWidth` on the three rectangles of the existing union rows | `importGraph` (node with explicit geometry) | `rectangle` / `double` |
| S20 | `calls/NubsSelfLoop/createCornerSelfLoop-undefined{,-northTarget}` | `NubsSelfLoop.ts:33 switch[4]` | one node, two ports with no `port.side` (UNDEFINED, no `PORT_SIDE_PROCESSOR`; T13 verifies the importer keeps UNDEFINED, `ElkGraphImporterPorts.ts:133`); `createCornerSelfLoop(p0, p1, 12.0, 18.0)`; variants both UNDEFINED / source NORTH, target UNDEFINED | `importGraph` only | `nubs` incl. `firstLabelPosition` |

## Per-group tables

### Group A — `p5edges/orthogonal/**`, `OrthogonalEdgeRouter` (160 items: S 80, J 42, U 35, X 3)

| TS site | Java | Cat | Detail |
| ------- | ---- | --- | ------ |
| `OrthogonalEdgeRouter.ts:241 fn getLayoutProcessorConfiguration`, `:248 if[0,1]`, `:253 binary-expr[0,1] if[0,1]`, `:256,:261,:265,:269,:273,:277 if[0,1]` | `OrthogonalEdgeRouter.java:170-209` | J | the replay names processors explicitly and never asks the phase; the eight `GraphProperties` arms (`HYPEREDGES`, `NON_FREE_PORTS \|\| FEEDBACK_EDGES`, `NORTH_SOUTH_PORTS`, `EXTERNAL_PORTS`, `SELF_LOOPS`, `HYPERNODES`, `CENTER_LABELS`, `END_LABELS`); `OrthogonalEdgeRouter.test.ts` |
| `HyperEdgeCycleDetector.ts:248 binary-expr[2] if[0]` | `HyperEdgeCycleDetector.java:187` | S | Sc4 `sites/HyperEdgeCycleDetector/criticalOutNoCriticalIn`: in the non-critical pass an unprocessed segment has `criticalOutWeight > 0`, `criticalInWeight <= 0`, neither source nor sink (≥ 2 critical dependencies without a critical cycle plus a regular-dependency cycle) |
| `HyperEdgeCycleDetector.ts:256 if[1]` | `:194-195` | S | Sc1 `sites/OrthogonalRoutingGenerator/crossedPair`: in the critical pass two unprocessed segments have equal outflow (a critical 2-cycle) |
| `HyperEdgeSegment.ts:137 if[0]` | `HyperEdgeSegment.java:150` | S | Sc3 `sites/HyperEdgeSegment/equalPortPositions`: `insertSorted` meets an equal coordinate (one source port feeding two `FIXED_POS` WEST ports at the same offset) |
| `HyperEdgeSegment.ts:257 fn setSplitPartner`, `:266 fn getSplitBy`, `:271 fn setSplitBy`, `:286 fn representsHyperedge`, `:292 binary-expr[1]`, `:363 fn splitAt` | `:295-334,:403` | S | any split (Sc1, Sc2, Sc5–Sc8) |
| `HyperEdgeSegment.ts:281 fn getLength` | `:320` | S | Sc2 `sites/HyperEdgeSegmentSplitter/twoCycles`: the sort comparator runs with ≥ 2 split segments |
| `HyperEdgeSegment.ts:337 fn simulateSplit` | `:377` | S | Sc6–Sc8: a split segment reaching ≥ 2 free areas |
| `HyperEdgeSegment.ts:400 fn equals`, `:401 if[0,1]`, `:408 fn hashCode`, `:413 fn toString`, `:420 if[0,1]`, `:425 if[0,1]` | `:441-465` | J | `equals`/`hashCode` on `mark`, `toString` with a ports list (a node with and without a designation, one vs two ports); `HyperEdgeSegment.test.ts` (the `toString` arms are a gap to close in T14a) |
| `HyperEdgeSegmentDependency.ts:167 fn toString` | `HyperEdgeSegmentDependency.java:181` | J | `HyperEdgeSegmentDependency.test.ts` |
| `HyperEdgeSegmentDependency.ts:178 if[1]` | `:138,:160` | U | dead: `setSource`/`setTarget` add `this` to the new list and remove it from the old one in the same call (`:136-148,:158-170`), so `remove()`/`reverse()` always find the dependency |
| `HyperEdgeSegmentDependencyDependencyType.ts:42 fn`, `:43 if[1]`, `:51 fn ordinal`, `:55 fn name`, `:59 fn toString`, `:63 fn compareTo` | `HyperEdgeSegmentDependency.java:35` | J | enum surface; `HyperEdgeSegmentDependency.test.ts` |
| `HyperEdgeSegmentDependencyDependencyType.ts:43 if[0]` | — | X | `valueOf` throwing arm |
| `HyperEdgeSegmentSplitter.ts:48 if[1]` | `HyperEdgeSegmentSplitter.java:57` | S | Sc1: `detectCycles(criticalOnly)` returns ≥ 1 dependency |
| `HyperEdgeSegmentSplitter.ts:62 fn (comparator)` | `:71` | S | Sc2 (≥ 2 segments to split) |
| `HyperEdgeSegmentSplitter.ts:63 fn`, `:72 fn findFreeAreas`, `:77 fn`, `:78 fn`, `:85 if[0,1]`, `:105 fn decideWhichSegmentsToSplit`, `:115 binary-expr[0,1] if[1]`, `:129 binary-expr[0] if[1]`, `:151 fn split`, `:166 fn updateDependencies`, `:178 binary-expr[0,1,2] if[1]`, `:195 fn computePosition…`, `:204 if[1]`, `:207 if[0]`, `:209 if[0]`, `:220 if[0]`, `:242 fn chooseBestAreaIndex`, `:386 fn useArea`, `:390 if[0]`, `:400 if[0]`, `:406 if[0]` | `:72-404` | S | any split |
| `HyperEdgeSegmentSplitter.ts:115 if[0]` | `:128` | S | Sc8 `sites/HyperEdgeSegmentSplitter/denseCycles`: a later cycle dependency has an endpoint already chosen |
| `HyperEdgeSegmentSplitter.ts:129 binary-expr[1]` | `:142` | S | Sc5, Sc7, Sc8: the dependency source represents a hyperedge |
| `HyperEdgeSegmentSplitter.ts:129 if[0]` | `:142` | S | Sc5 `sites/HyperEdgeSegmentSplitter/hyperedgeSplitsRegular`: a hyperedge source and a regular target, so the target is split |
| `HyperEdgeSegmentSplitter.ts:178 if[0]` | `:187` | S | Sc2, Sc6, Sc8: a fourth segment exists, `createDependencyIfNecessary` runs for the split halves |
| `HyperEdgeSegmentSplitter.ts:204 if[0]` | `:212` | S | Sc2, Sc5: a free area entirely below the segment's end (loop break) |
| `HyperEdgeSegmentSplitter.ts:207 if[1]` | `:215` | S | Sc2, Sc6, Sc8: a free area ending above the segment's start (skipped) |
| `HyperEdgeSegmentSplitter.ts:209 if[1]` | `:217` | S | Sc6–Sc8: a second reachable area |
| `HyperEdgeSegmentSplitter.ts:220 if[1]` | `:228` | U | no usable area for a segment to split: by construction a critical-cycle segment has a free area in its own span, so it could arise only after an earlier split consumed it; not constructed in 150,000 random 2-layer graphs, not provably dead (Medium) |
| `HyperEdgeSegmentSplitter.ts:245 if[1]` | `:248` | S | Sc1, Sc2, Sc5: exactly one reachable area |
| `HyperEdgeSegmentSplitter.ts:245 if[0]`, `:260 if[0,1]`, `:281 fn rateArea`, `:326 fn updateConsideringBothOrderings`, `:330 if[1]`, `:349 fn countCrossingsForSingleOrdering`, `:361 fn isBetter`, `:362 if[1]`, `:365 if[0]`, `:366 if[1]` | `:248-363` | S | Sc6–Sc8: ≥ 2 reachable areas rated |
| `HyperEdgeSegmentSplitter.ts:330 if[0]`, `:332 if[0,1]` | `:328-330` | S | Sc6, Sc8: equal crossings in both orders (> 0, a two-cycle; = 0) |
| `HyperEdgeSegmentSplitter.ts:362 if[0]` | `:358` | S | Sc6, Sc7: a later area has fewer crossings |
| `HyperEdgeSegmentSplitter.ts:365 if[1]`, `:370 if[0]` | `:362,:368` | S | Sc8: a later area has more crossings; a larger area |
| `HyperEdgeSegmentSplitter.ts:366 if[0]`, `:369 if[1]` | `:363,:367` | S | Sc6 `sites/HyperEdgeSegmentSplitter/areaRatingFewerDependencies`: fewer / more dependencies |
| `HyperEdgeSegmentSplitter.ts:369 if[0]` | `:367` | S | Sc7, Sc8: equal dependencies |
| `HyperEdgeSegmentSplitter.ts:370 if[1]`, `:390 if[1]` | `:368,:388` | S | Sc7 `sites/HyperEdgeSegmentSplitter/areaRatingFewerCrossings`: same size or smaller area; the used area's half size below the critical threshold |
| `HyperEdgeSegmentSplitter.ts:400 if[1]`, `:406 if[1]` | `:398,:404` | U | in exact arithmetic equivalent to `:390 if[0]`; reachable only through a 1-ulp rounding gap (a spacing whose 0.2·m is not exactly representable and a gap of exactly 0.8·m); not met in 150,000 random graphs (Medium; T13 may try such a spacing) |
| `HyperEdgeSegmentSplitterAreaRating.ts:16 fn constructor` | `:459` | S | Sc6–Sc8 (`rateArea` only) |
| `HyperEdgeSegmentSplitterFreeArea.ts:18 fn constructor` | `:439` | S | any split |
| `OrthogonalRoutingGenerator.ts:267 if[0]` | `OrthogonalRoutingGenerator.java:190,:212` | X | `debugPrefix != null && monitor.isLoggingEnabled()` calls the staged `DebugUtil.logDebugGraphHyperedges` (throws naming 7f; pinned by a unit test) |
| `OrthogonalRoutingGenerator.ts:382 if[0]` | `:344` | S | Sc1 and any split: `conflicts1 == CRITICAL` (a critical 2-cycle makes both directions critical) |
| `OrthogonalRoutingGenerator.ts:388 if[1]` | `:350` | S | Sc8: `conflicts1` critical and `conflicts2` not (an outgoing coordinate within 0.2 × the minimum distance of an incoming one, no match in the reverse direction) |
| `OrthogonalRoutingGeneratorConflicts.ts:80 if[0]` | `:412` | S | Sc4, Sc8: a non-critical conflict (within 0.5 × edge-edge spacing but not within the critical threshold) |
| `BaseRoutingDirectionStrategy.ts:57 cond-expr[1]` | `BaseRoutingDirectionStrategy.java:88` | U | 7f: `vertical=false` is passed only by `NorthToSouthRoutingStrategy.java:69,78,86,91` and `SouthToNorthRoutingStrategy.java:69,78,86,91` |
| `BaseRoutingDirectionStrategy.ts:73 if[0]` | `:122` | U | dead: `JUNCTION_POINTS` never null (`CoreOptions.ts:313` default, `MapPropertyHolder.java:67-73` stores a clone) |
| `BaseRoutingDirectionStrategy.ts:111 fn getCreatedJunctionPoints` | `:137` | J | no Java caller; `BaseRoutingDirectionStrategy.test.ts:42` |
| `BaseRoutingDirectionStrategyForRoutingDirection.ts:20 switch[1,2]` | `:61-64` | U | 7f: `NORTH_TO_SOUTH`/`SOUTH_TO_NORTH` are constructed only at `HierarchicalPortOrthogonalEdgeRouter.java:547-548,:570-571` |
| `BaseRoutingDirectionStrategyForRoutingDirection.ts:20 switch[3]` | `:65-66` | U | dead: the default throw of a three-constant enum whose cases are all handled |
| `NorthToSouthRoutingStrategy.ts` and `SouthToNorthRoutingStrategy.ts`: `:21,:26,:31,:36,:67 fn` and `:38,:54,:58,:78 if[0,1]` (13 items each) | the matching Java files, `calculateBendPoints :45-92` | U | 7f: run only from `HierarchicalPortOrthogonalEdgeRouter` (the three trivial accessors are pinned by `BaseRoutingDirectionStrategy.test.ts`) |
| `RoutingDirection.ts:39 fn`, `:40 if[1]`, `:48 fn ordinal`, `:52 fn name`, `:56 fn toString`, `:60 fn compareTo` | `RoutingDirection.java:23` | J | enum surface; `RoutingDirection.test.ts` |
| `RoutingDirection.ts:40 if[0]` | — | X | `valueOf` throwing arm |
| `WestToEastRoutingStrategy.ts:38 if[0]`, `:78 if[0]` | `WestToEastRoutingStrategy.java:47,:73` | S | any split: the dummy split partner is skipped; `splitPartner != null` gives four bend points |
| `WestToEastRoutingStrategy.ts:54 if[1]` | `:58` | S | `sites/SelfLoop/orthogonal`: `edge.isSelfLoop()` on a self loop kept by omitting `SELF_LOOP_PREPROCESSOR` (7c S13 precedent; the real plan hides it, so the row is chain-forced) |

Group-A S scenarios (8 ids, the Sc1–Sc8 carriers below, plus the shared `sites/SelfLoop/orthogonal`).

### Group B — `PolylineEdgeRouter*`, the six processors (69 items: S 20, J 14, U 35)

| TS site | Java | Cat | Detail |
| ------- | ---- | --- | ------ |
| `PolylineEdgeRouter.ts:159 fn getLayoutProcessorConfiguration`, `:166 if[0,1]`, `:170 if[0,1]`, `:174 if[0,1]`, `:178 if[0,1]` | `PolylineEdgeRouter.java:154-174` | J | the replay runs `create().process()` and never asks for the configuration; the baseline and the four additions (`NORTH_SOUTH_PORTS`, `SELF_LOOPS`, `CENTER_LABELS`, `END_LABELS`) are pinned by `PolylineEdgeRouter.test.ts` |
| `PolylineEdgeRouter.ts:441 if[1]` | `:469` | S | `sites/NorthSouth/selfLoop/polyline`: `!edge.isSelfLoop()` false on a same-side north self loop kept by omitting `SELF_LOOP_PREPROCESSOR` (7c S13 / 7d S12 precedent) |
| `PolylineEdgeRouter.ts:451 if[0]` | `:479` | U | dead: `JUNCTION_POINTS` is a stored clone of the cloneable default (`MapPropertyHolder.java:68-72`), never null |
| `HyperedgeDummyMerger.ts:16 if[0]` | `:141,:199-200` | J | `firstPort` → `NoSuchElementException` on a `LONG_EDGE` dummy without a WEST port; `HyperedgeDummyMerger.test.ts` |
| `HyperedgeDummyMerger.ts:32 fn inFrontOfLabelDummyIfAny`, `:34 binary-expr[0,1]`, `:40 fn behindLabelDummyIfAny`, `:42 binary-expr[0,1]`, `:151 if[1]`, `:162 binary-expr[0,1]`, `:166 binary-expr[1]`, `:169 binary-expr[1,2,3]` | `:139-164` | U | 7f: `LONG_EDGE_HAS_LABEL_DUMMIES` is set only from label dummies (`LongEdgeSplitter.java:197-214`) |
| `HyperedgeDummyMerger.ts:81 if[0]` | `:79` | S | `sites/EmptyLayer/merger`: an empty `Layer` object |
| `HyperedgeDummyMerger.ts:208 if[1]` | `:217` | S | `sites/HyperedgeMerger/parallelLongEdges/merger`: `keepTargetPort` when both merged dummies share a non-null `LONG_EDGE_TARGET` |
| `HierarchicalPortPositionProcessor.ts:45 if[1]`, `:49 if[1]` | `:74,:78` | S | `sites/HierarchicalPortPosition/emptyGraph`: zero layers |
| `HierarchicalPortPositionProcessor.ts:65 if[1]`, `:75 if[0,1]`, `:81 binary-expr[0,1]`, `:81 if[0,1]`, `:87 if[0,1]` | `:95-117` | S | `sites/HierarchicalPortPosition/fixedCoordinates/{fixedPos,fixedRatio,northSouth}`: `portConstraints` `FIXED_POS`/`FIXED_RATIO` on the target (every current row is `FREE`/`FIXED_SIDE`); `:75 if[0]`/`:81 if[0]` need an N/S replacement dummy in the first or last layer (`northSouth`), `:87` the ratio arm |
| `LayerSizeAndGraphHeightCalculator.ts:39 if[0]` | `:64` | S | `sites/EmptyLayer/layerSize`: an empty `Layer` object (the zero-layer case is covered through `foundNodes=false`) |
| `LongEdgeJoiner.ts:19 if[0]` | `:109,:111` | J | `firstPort` → `NoSuchElementException`; `LongEdgeJoiner.test.ts` via the public `joinAt` |
| `LongEdgeJoiner.ts:162 if[1]`, `:163 if[0]` | `:164-165` | U | dead: `JUNCTION_POINTS` clone, never null (`MapPropertyHolder.java:67-73`) |
| `NorthSouthPortPostprocessor.ts:20 fn firstPort`, `:22 if[1]`, `:62 if[0]`, `:226 fn processSelfLoop` | `:86,:213-217` | S | `sites/NorthSouth/selfLoop/{polyline,orthogonal}`: the self-loop dummy (ORIGIN an `LEdge`, `NorthSouthPortPreprocessor.java:633`) survives when `SELF_LOOP_PREPROCESSOR` is omitted (7c S13 precedent; a TS probe with a north–north loop through P4, P5 polyline and NSPP calls `processSelfLoop` once) |
| `NorthSouthPortPostprocessor.ts:22 if[0]` | `:216-217` | J | `NoSuchElementException` on a self-loop dummy without a WEST port; `NorthSouthPortPostprocessor.test.ts` |
| `NorthSouthPortPostprocessor.ts:137 if[0]` | `:104` | U | dead: ports with different ORIGINs arise only under `!USE_NEW_APPROACH` (`NorthSouthPortPreprocessor.java:148` is `true`); the two-origin self-loop dummy branches off at `:86` first |
| `NorthSouthPortPostprocessor.ts:213 if[0]` | `:162-163,:198-199` | U | dead: `JUNCTION_POINTS` clone |
| `FinalSplineBendpointsCalculator.ts:28 fn reverseInPlace`, `:141 if[0]`, `:142 fn (anonymous)` | `:173` | U | 7g: `inverseOrder` is set only at `wrapping/BreakingPointRemover.java:117` |
| `FinalSplineBendpointsCalculator.ts:186 if[1]`, `:193 if[0,1]`, `:197 if[0,1]`, `:201 if[0,1]`, `:205 if[0,1]`, `:217 fn segmentNodeDistanceThreshold` | `:586-616` | S | `sites/FinalSplineBendpoints/compaction/*`: `COMPACTION_POST_COMPACTION_STRATEGY` ≠ `NONE` read from the option alone (`:586`); the step row sets `compaction.postCompaction.strategy=LEFT` and omits the 7g compactor (the option-without-processor precedent); variants per arm: a segment whose source/target node is near (`:591-605`) and far |
| `FinalSplineBendpointsCalculatorBezier.ts:45 if[0]` | `:488,:524` | J | `TypeError` for a null unboxed `SPLINE_NS_PORT_Y_COORD`; `FinalSplineBendpointsCalculator.test.ts` on a hand-built chain |
| `FinalSplineBendpointsCalculatorBezier.ts:57 if[0]` | `:483-491` | U | dead in 7e: `clearThenFillMappings` (`SplineEdgeRouter.java:354-443`) collects only EAST/WEST-port edges and NSPP runs before P5 under SPLINES (`:116`), so an edge sourced at a N/S port is never a start edge (7g wrapping may revisit through `BreakingPointRemover.java:129`) |
| `FinalSplineBendpointsCalculatorBezier.ts:75 if[1]` | `:507` | S | `sites/HyperedgeMerger/parallelLongEdges/splines`: two start edges sharing their tail edge, the second conversion finds the shared edge's bend points cleared |
| `FinalSplineBendpointsCalculatorBezier.ts:120 if[0]` | `:466` | U | dead: `getEdgeChain` always adds the start edge first (`SplineEdgeRouter.java:941-949`) and `SPLINE_EDGE_CHAIN`/`SPLINE_ROUTE_START` are set together (`:304-308`) |
| `FinalSplineBendpointsCalculatorBezier.ts:127 cond-expr[0]` | `:108` | U | 7g: `SPLINE_SURVIVING_EDGE` is set only at `BreakingPointRemover.java:129` |
| `FinalSplineBendpointsCalculatorBezier.ts:132 if[0]` | `:479` | J | `IllegalArgumentException` on a chain whose first edge has a non-NORMAL, non-N/S source; `FinalSplineBendpointsCalculator.test.ts` |
| `FinalSplineBendpointsCalculatorControlPoints.ts:134 if[1]` | `:273` | U | dead: `isWestOfInitialLayer` is set only for the first gap (`SplineEdgeRouter.java:287`), whose edges leave WEST ports (`:406-415`) and so have `invertedLeft` (`SplineSegment.java:241`); the dispatcher takes the inverted method (`:152`) before `:273` (corrects T9's note: the inverted arm is covered, the conservative one is dead) |

Group-B S scenarios (6 ids, 11 rows): `sites/HierarchicalPortPosition/fixedCoordinates/{fixedPos,fixedRatio,northSouth}`, `sites/HierarchicalPortPosition/emptyGraph`, `sites/EmptyLayer/{layerSize,merger}`, `sites/HyperedgeMerger/parallelLongEdges/{merger,splines}`, `sites/NorthSouth/selfLoop/{polyline,orthogonal}`, `sites/FinalSplineBendpoints/compaction/{near,far}`.

### Group C — `p5edges/splines/**` (174 items: S 62, J 108, U 3, X 1)

| TS site | Java | Cat | Detail |
| ------- | ---- | --- | ------ |
| `NubSpline.ts:44 if[0]`, `:46 if[1]` | `NubSpline.java:109-111` | S | `calls/NubSpline/construction/padded-{1pt,2pt,3pt}`: a `nubs` with 1–3 control points, dim 3 (the `add(0, get(0))` padding loop) |
| `NubSpline.ts:46 if[0]` | `:110` | J | `ArrayList.get(0)` on an empty list → `IndexOutOfBoundsException` (the recorder records no throwing row); `NubSpline.test.ts` |
| `NubSpline.ts:62 if[0]` | `:104` | J | `IllegalArgumentException` for dimension < 1; `NubSpline.test.ts` |
| `NubSpline.ts:72 if[0]` | `:113-115` | U | dead: the padding loop at `:109` ends with `size - 1 >= dimension`, so the guard cannot fire (the TS function is not exported) |
| `NubSpline.ts:164 cond-expr[1]` | `:152` | J | the `KVector...` overload delegates to the list form (twin); `NubSpline.test.ts` |
| `NubSpline.ts:227 if[1]`, `:239 fn setOuterBox`, `:267 fn getControlPointsSize`, `:463 fn toString` | `:294-299,:306,:340,:1005` | J | cached `getOuterBox`, the protected setter and the size getter (no caller in the bundle), the debug `toString`; `NubSpline.test.ts` |
| `NubSpline.ts:364 if[0]` | `:717` | S | `calls/NubSpline/extremePoints/*`: `getPointOnCurve(knot, true)` is the loop body of the four extreme-point statics (`:583,610,637,663`), `modify=true` has no other caller |
| `NubSplineBezier.ts:56 if[1]`, `:87 if[1]`, `:93 if[1]`, `:101 if[1]` | `:881,:912,:918,:926` | J | `toBezier` on an already-bezier spline (a no-op: twin of the `toBezier-chain-*` rows), `getBezierCP` on a bezier spline, the `(true, *)`/`(*, true)` overloads (a `KVectorChain` is no recorder result type: twin of the row's control points); `NubSpline.test.ts` |
| `NubSplineDerivation.ts:111,:142,:174,:204 fn` (the four statics), `:117,:148,:180,:210 binary-expr[0,1]`, `:232 fn interpolateZero`, `:248 fn getZeroY`, `:301 fn getZeroX`, `:281 binary-expr[0,1] if[0,1]`, `:286 binary-expr[0..3] if[0,1]`, `:334 binary-expr[0,1] if[0,1]`, `:339 binary-expr[0..3] if[0,1]` (35 items) | `:572-668,:737-835` | S | `calls/NubSpline/extremePoints/*`: `:281`/`:334 if[0]` a zero at the second control point (two equal consecutive points), `:286`/`:339 if[0]` a sign change of the derivative polygon, `if[1]` no change |
| `NubSplineKnots.ts:164 if[0]` | `:410` | J | `createUniformKnotVector` size < 2·dim throw: the only Java caller (`:123`) passes size ≥ 2·dim, a direct call of the exported function reaches it; `NubSpline.test.ts` |
| `NubSplineKnots.ts:202 fn getTFromPolar`, `NubSplinePolarCP.ts:111 fn getPolarCoordinate` | `:455,:1116` | S | `calls/NubSpline/extremePoints/*` (only the zero finders call them, `:770-834`) |
| `NubSplineKnots.ts:223 if[1]` | `:478` | S | `calls/NubSpline/construction/getPointOnCurve-unclamped`: `insertKnot` with `isClamped == false` |
| `NubSplinePolarCP.ts:16 fn listToString`, `:17 fn`, `:120 fn toString`, `:126 fn polarCPsToString`, `:127 fn`, `:90 if[0]`, `:106 fn setCp`, `:116 fn setPolarCoordinate` | `:1129,:1005,:1040,:1107,:1123` | J | `PolarCP.toString`/`NubSpline.toString` helpers, the `PolarCP` copy constructor (no caller), the setters (inlined into the TS constructor; "vector is not copied" pinned); `NubSpline.test.ts` |
| `NubsSelfLoop.ts:33 switch[4]` | `NubsSelfLoop.java:191,208` | S | `calls/NubsSelfLoop/createCornerSelfLoop-undefined`: a port with side UNDEFINED reaches `default: break` (`portSideToDirection(UNDEFINED)` is 0.0, the corner stays (0,0)) |
| `NubsSelfLoop.ts:79 if[0]`, `:88 cond-expr[0]`, `:81 if[0]`, `:83 if[1]`, `:86 cond-expr[0,1]`, `:108 fn setFirstLabelPosition` | `:48-50,:61,:87,:108` | J | the private copy constructor (copies `firstLabelPosition` by reference), the public `(boolean, int, List)` constructor, the private `(int, KVector...)` overload (twin of the 40 factory rows), the setter (no caller); `NubsSelfLoop.test.ts` |
| `Rectangle.ts:21 fn`, `:22 if[0,1]`, `:25 binary-expr[0,1] cond-expr[0,1]`, `:27 if[0,1]`, `:30 if[0,1]`, `:34 binary-expr[0,1] if[0,1]`, `:36 cond-expr[0,1]`, `:341 fn toString` | `Rectangle.java:322-334` | J | the one-decimal HALF_EVEN formatter of `toString` (R6; ICU twin on exact ties only); `Rectangle.test.ts` |
| `Rectangle.ts:109 if[0]`, `:142 fn constructFromPosition`, `:111 if[0]`, `:150 fn constructFromShape`, `:113 if[1]`, `:170 fn constructFromVectors`, `:171 if[0,1]`, `:122 if[0]`, `:124 if[0]`, `:162 if[0]` | `:57-60,:85,:97,:113-114,:130-132` | J | the `KVector`/`LShape`/`KVector...` constructors (the recorder's reflection skips constructors; twins of the `Iterable` form), the `top > bottom`/`left > right`/empty-`Iterable` throws; `Rectangle.test.ts` |
| `Rectangle.ts:195 if[0]`, `:211 fn unionShape`, `:270 fn getHeight`, `:275 fn getWidth` | `:160-163,:227,:236` | S | `calls/Rectangle/extents/*`: `union(rectangle, node)` resolving to `union(LShape)`; `getHeight`/`getWidth` on the existing union rectangles |
| `Rectangle.ts:228 cond-expr[1]`, `:245 if[0,1]` | `:196-206` | J | `union(Collection<Rectangle>)` (no recorder argument kind builds a collection of rectangles; pins the first-argument mutation), the empty-collection throw; `Rectangle.test.ts` |
| `SplineEdgeRouter.ts:171 fn getLayoutProcessorConfiguration`, `:179,:183,:187,:191 if[0,1]` | `SplineEdgeRouter.java:126-148` | J | the replay never asks the phase; the four `GraphProperties` arms; `SplineEdgeRouter.test.ts` |
| `SplineEdgeRouterDependency.ts:40 fn toString` | `:1035` | J | prose only; `SplineEdgeRouter.test.ts` |
| `SplineEdgeRouterRanking.ts:29 if[1]` | `:802` | U | dead: `target.incoming.remove(dependency)` always finds it (the constructor adds to both lists `:1030-1031`; a dependency is reversed at most once `:800`) |
| `SplineEdgeRouterRanking.ts:58 if[1]`, `:72 if[0,1]`, `:73 if[0,1]`, `:126 if[0]`, `:149 if[0]`, `:197 if[0]`, `:199 binary-expr[0,1] if[0,1]`, `:211 if[0]` | `:736,:763-782,:804,:829-843` | S | `sites/SplineEdgeRouter/dependencyCycle/{uniform4,tie}`: unprocessed segments remain after sink/source peeling only inside a positive-weight dependency cycle; `:72 if[1]` two distinct outflow values, `:73 if[1]` an equal pair (the `random.nextInt` draw `:777`, R7), `:149` the reversal of a weight > 0 dependency, `:197-211` `updateNeighbors` on an unprocessed neighbour |
| `SplineEdgeRouterRanking.ts:302 if[1]` | `:919-922` | S | `sites/SplineEdgeRouter/rightwardNesting`: a rightward segment (no left port) with two outgoing dependencies keeps `outweight` 1 after its first target |
| `SplineEdgeRouterSegments.ts:102 if[1]` | `:401,:448` | U | dead: the only caller is the unhandled arm, where the edge was pushed in the same iteration, so `List.remove` always finds it |
| `SplineEdgeRouterSegments.ts:119 if[0]`, `:162 if[0]` | `:378,:413-414,:425` | S | `sites/SelfLoop/splines`: a self-loop edge reaching the router when `SELF_LOOP_PREPROCESSOR` is omitted (7c S13 precedent); `selfLoopsLayer` is declared `:166`, cleared `:368` and never read in the Java |
| `SplineEdgeRouterSegments.ts:137 if[1]` | `:399-401,:446-448` | J | the "unhandled situation": an edge out of an EAST port (left layer) or WEST port (right layer) whose target layer is neither of the pair; `LongEdgeSplitter.java:75-92` splits every such edge out of layers 0..n−2 and the last layer's edges are in-layer, so no plan the replay builds reaches it (Medium, by reading; T13 may find a graph); unit test on `clearThenFillMappings` with a hand-built 3-layer graph; `SplineEdgeRouter.test.ts` |
| `SplineEdgeRouterSegments.ts:246 if[1]`, `:257 if[1]` | `:534,:545` | J | "Source/Target port must be in one of the port sets." throws, unreachable through `clearThenFillMappings` (every source port is added first, a target is added or its edge dropped); unit test on the exported `createSplineSegments` with a crafted state |
| `SplineEdgeRouterSideToProcess.ts:36 fn`, `:37 if[1]`, `:45 fn ordinal`, `:49 fn name`, `:53 fn toString` | `:1043` | J | enum surface; `SplineEdgeRouter.test.ts` |
| `SplineEdgeRouterSideToProcess.ts:37 if[0]` | `:1043` | X | `valueOf` with an unknown name (enum throwing arm) |
| `SplineSegment.ts:293 if[0]`, `:309 fn compareTo` | `SplineSegment.java:247,:261` | J | the explicit `TypeError` for the unboxing NPE, `compareTo` by `mark`; `SplineSegment.test.ts` |
| `SplinesMath.ts:34 fn`, `:35 if[0,1]`, `:38 binary-expr[0,1] cond-expr[0,1]`, `:40 if[0,1]`, `:43 if[0,1]`, `:47 binary-expr[0,1] if[0,1]`, `:49 cond-expr[0,1]`, `:159 cond-expr[0,1]`, `:160,:163,:178,:186 if[0,1]`, `:166 cond-expr[0,1]` | `SplinesMath.java:135-185` | J | `convertKVectorToString` (null, single, array, iterable forms) and its one-decimal formatter: debug text whose only caller is `PolarCP.toString`; `SplinesMath.test.ts` with the ICU twin on exact ties |

Hidden uncovered statics (v8 counts every class static once, so they are outside the 174 although their statements are untouched): `NubSpline.ts` `getFirst/Last{Vertical,Horizontal}Point` (`:301,:314,:327,:340`) → `calls/NubSpline/extremePoints/*`; `generateNiceCurve` (`:408`), `addMirrored` (`:446`), `mirrorOnX` (`:459`) → `calls/NubSpline/construction/niceCurve`; `Rectangle.ts` `unionCollection` (`:242`), `SplineEdgeRouter.ts` the five `*_PROCESSING_ADDITIONS` getters (`:98,:112,:129,:146,:160`), `isStraight` (`:423`), `isNormalNode` (`:470`), `SplineEdgeRouterSideToProcess.ts` `values`/`valueOf`, `SplinesMath.ts` `convertKVectorToString` and its four helpers (`:158,:172,:177,:185,:193`) → J.

Group-C S scenarios (7 ids): `calls/NubSpline/extremePoints/*`, `calls/NubSpline/construction/*`, `calls/Rectangle/extents/*`, `calls/NubsSelfLoop/createCornerSelfLoop-undefined`, `sites/SplineEdgeRouter/dependencyCycle/{uniform4,tie}`, `sites/SplineEdgeRouter/rightwardNesting`, `sites/SelfLoop/splines` (shared with group B's self-loop family).

## U: dead by construction (the mechanism per site)

| Site | Mechanism |
| ---- | --------- |
| `PolylineEdgeRouter.ts:451 if[0]`, `LongEdgeJoiner.ts:162 if[1]`, `:163 if[0]`, `NorthSouthPortPostprocessor.ts:213 if[0]`, `BaseRoutingDirectionStrategy.ts:73 if[0]` | `JUNCTION_POINTS == null` arms: `MapPropertyHolder.getProperty` stores a clone of the cloneable default `KVectorChain` (`MapPropertyHolder.java:67-73`), never null unless set to null (nothing does) |
| `NorthSouthPortPostprocessor.ts:137 if[0]` | ports with different ORIGINs arise only under `!USE_NEW_APPROACH` (`NorthSouthPortPreprocessor.java:148` is `true`); the two-origin self-loop dummy branches off at `:86` first |
| `FinalSplineBendpointsCalculatorBezier.ts:57 if[0]` | an edge sourced at a N/S port is never a start edge: `clearThenFillMappings` collects EAST/WEST-port edges only (`SplineEdgeRouter.java:354-443`) and NSPP runs before P5 under SPLINES (`:116`); 7g wrapping may revisit through `BreakingPointRemover.java:129` |
| `FinalSplineBendpointsCalculatorBezier.ts:120 if[0]` | `getEdgeChain` always adds the start edge first (`SplineEdgeRouter.java:941-949`); `SPLINE_EDGE_CHAIN`/`SPLINE_ROUTE_START` are set together (`:304-308`) |
| `FinalSplineBendpointsCalculatorControlPoints.ts:134 if[1]` | `isWestOfInitialLayer` is set only for the first gap (`SplineEdgeRouter.java:287`), whose edges leave WEST ports and are `invertedLeft`; the dispatcher takes the inverted method (`FinalSplineBendpointsCalculator.java:152`) before `:273` |
| `NubSpline.ts:72 if[0]` | the padding loop at `NubSpline.java:109` ends with `size − 1 >= dimension` |
| `SplineEdgeRouterRanking.ts:29 if[1]` | `target.incoming.remove(dependency)` always finds it (`SplineEdgeRouter.java:1030-1031`; reversed at most once, `:800`) |
| `SplineEdgeRouterSegments.ts:102 if[1]` | the only caller is the unhandled arm, where the edge was pushed in the same iteration (`:401,:448`) |
| `HyperEdgeSegmentDependency.ts:178 if[1]` | `setSource`/`setTarget` add `this` to the new list and remove it from the old one (`HyperEdgeSegmentDependency.java:136-148,:158-170`) |
| `BaseRoutingDirectionStrategyForRoutingDirection.ts:20 switch[3]` | the default throw of a three-constant enum whose cases are all handled (`BaseRoutingDirectionStrategy.java:65-66`) |

U by later mission: **7f** `HyperedgeDummyMerger` label-dummy paths (13 items; `LONG_EDGE_HAS_LABEL_DUMMIES` set only by
`LongEdgeSplitter.java:197-214`), the N/S direction strategies and `forRoutingDirection`'s two arms and the
`vertical=false` branch (29 items; constructed only at `HierarchicalPortOrthogonalEdgeRouter.java:547-548,:570-571`);
**7g** `inverseOrder` (3 items; `BreakingPointRemover.java:117`), `SPLINE_SURVIVING_EDGE` (1; `:129`);
**Medium** `HyperEdgeSegmentSplitter.ts:220 if[1]`, `:400 if[1]`, `:406 if[1]` (3; not provably dead, not constructed in
150,000 random graphs; T13 may try the 1-ulp spacing).

## J: owners

`OrthogonalEdgeRouter.test.ts` (the eight configuration arms), `PolylineEdgeRouter.test.ts` (five),
`SplineEdgeRouter.test.ts` (five + the `SideToProcess` enum surface, `Dependency.toString`, the "unhandled situation"
and the two port-set throws on hand-built states), `HyperEdgeSegment.test.ts` (`equals`/`hashCode`/`toString` arms: a gap
to close in T14a), `HyperEdgeSegmentDependency.test.ts` (incl. the `DependencyType` enum), `RoutingDirection.test.ts`,
`BaseRoutingDirectionStrategy.test.ts` (`getCreatedJunctionPoints`), `HyperedgeDummyMerger.test.ts`,
`LongEdgeJoiner.test.ts`, `NorthSouthPortPostprocessor.test.ts` (the `NoSuchElementException` throws),
`FinalSplineBendpointsCalculator.test.ts` (the `TypeError` and the `:479` `IllegalArgumentException`),
`SplineSegment.test.ts` (`TypeError`, `compareTo`), `Rectangle.test.ts` (formatter, the constructors the reflection
skips, the throws, `union(Collection)`), `SplinesMath.test.ts` (`convertKVectorToString` and its formatter),
`NubSpline.test.ts` (throws, cached outer box, no-caller members, the Bezier arms, `toString`, `PolarCP` surface),
`NubsSelfLoop.test.ts` (the constructors, the setter). Twin comparisons stand in where the recorder cannot carry the
form (constructors, `KVectorChain` results), per L4.

## X

`HyperEdgeSegmentDependencyDependencyType.ts:43 if[0]`, `RoutingDirection.ts:40 if[0]`,
`SplineEdgeRouterSideToProcess.ts:37 if[0]` (`valueOf` throwing arms); `OrthogonalRoutingGenerator.ts:267 if[0]`
(the staged `DebugUtil.logDebugGraphHyperedges` call, pinned by a unit test).

## Hidden statics

v8 counts every class static once, so these functions are outside the 309 + 94 although their statements are untouched:
`NubSpline.ts` `getFirst/Last{Vertical,Horizontal}Point` (`:301,:314,:327,:340`) → S17; `generateNiceCurve` (`:408`),
`addMirrored` (`:446`), `mirrorOnX` (`:459`) → S18; `Rectangle.ts` `unionCollection` (`:242`), `SplineEdgeRouter.ts` the
five `*_PROCESSING_ADDITIONS` getters (`:98,:112,:129,:146,:160`), `isStraight` (`:423`), `isNormalNode` (`:470`),
`SplineEdgeRouterSideToProcess.ts` `values`/`valueOf`, `SplinesMath.ts` `convertKVectorToString` and its four helpers
(`:158,:172,:177,:185,:193`) → J.

## T13 corrections

(appended by T13: rows the oracle refused or threw on, arms a row could not reach, with the Java mechanism)

- **T13 (2026-11-03).** All 20 S ids recorded (25 `sites/*` rows, 35 new `calls/*` rows; `rowCounts` 94 / 25 / 158); no
  oracle refusal or throw; `layers [[a],[],[b]]` is accepted by the Java interpreter. Graph changes: S9 `northSouth` adds
  two normal nodes `s0`/`t0` so the first and last layers hold a normal node beside the replacement dummy (the described
  N→c0 / S←c3 shape left only the dummy there, `:75 if[0]` unreachable); S13 uses an EAST–EAST loop on a node made
  narrower than its layer by a 100-wide sibling plus a NORTH–NORTH loop (`NORTH_SOUTH_PORT_PREPROCESSOR` rewrites N–N
  loops into dummies, so only E–E/W–W loops reach the routers; the polyline arm needs the x-distance to the layer edge
  above the tolerance); S16 minimised to 6 nodes (`b2`/`b3` with W,E,E,W ports); S12 `splines` inserts
  `HYPEREDGE_DUMMY_MERGER` after `INNERMOST_NODE_MARGIN_CALCULATOR`; S15 `tie` records seeds 1 and 4096 (seeds 1–40 all
  draw `nextInt(2) == 1`; 4096 is the first that draws 0; ranks `[3,2,0,1]` vs `[1,0,2,3]`, oracle and port agree);
  S17 adds `getLastHorizontalPoint-p4-r10`; S20's `-northTarget` variant gives the source NORTH and the target UNDEFINED.
  Per-row coverage: 161 of the 163 S-classified items plus the hidden statics are hit. **Corrections → U:**
  `FinalSplineBendpointsCalculator.ts:197 if[0]` and `:205 if[0]` (`:597`, `:607`, the `return false` arms of
  `segmentAllowsSloppyRouting`): both distances are at most `layerSize.x − w` (`LGraphUtil.java:223-290` clamps `xpos`,
  `LayerSizeAndGraphHeightCalculator.java:75-79` sets `layerSize.x = max(w + margins)`) while the threshold is
  `layerSize.x − w/2` (`:616`), so a distance above it needs `w < 0`; derived by reading (Medium). The `compaction/far`
  row keeps its id (the `fan` graph) and reaches the same eight arms as `near`. The three Medium splitter arms were not
  attempted. Final partition: **S 170 / J 164 / U 65 / X 4.**
- **T14 (2026-11-03).** Every S row anchored (T14a 20 cases, T14b 42; 22 structural cases). Line corrections: the Bezier
  `isEmpty` test is `FinalSplineBendpointsCalculator.java:503`; the spline self-loop skips are `SplineEdgeRouter.java:378,:425`
  (collection `:413-414`); `FinalSplineBendpointsCalculatorBezier.ts:57 if[0]` is reachable from a hand-built N/S source
  start edge (U for 7e plans only, J-pinned). Rows that reach an arm without discriminating it: `rightwardNesting`
  (`Ranking.ts:302`), `uniform4` (`:149`), `equalPortPositions` through its bend points (a sites case anchors the segment's
  port lists instead), `EmptyLayer/merger` (`mergeLayer([])` is a no-op). `LNode.getDesignation` never returns null
  (`HyperEdgeSegment.toString`'s null arm reached via a test subclass only). Per-class branch coverage after T14: 100 % for
  20 of the 46 files; below 90 % only `HyperedgeDummyMerger` 77.1 (7f label dummies), `LongEdgeJoiner` 80 (two dead
  arms), `BaseRoutingDirectionStrategyForRoutingDirection` 75 (dead default + 7f), `FinalSplineBendpointsCalculator.ts`
  89.7 (`inverseOrder` 7g, the far arms), the two N/S direction strategies 0 (7f).
