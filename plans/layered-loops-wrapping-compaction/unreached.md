<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7g branches unreached by the oracle replay (T18, W10, W14, F12 shape)

Measured 2026-11-10 on `chore/issue-queue` after batch 8, alone and in the foreground (1-minute load 12.7; coverage is
load-independent): the row replays of `LayeredLoopsVectors.test.ts` (1,573 tests, run A: the oracle evidence alone) and the same
file plus the ported Java suites of the mission (run B, 11 files, 1,610 tests: `CompactionTest`, `RectlinearConvexHullTest`,
`SelfLoopPreprocessorTest`, `SelfLoopHolderTest`, `PolylineSelfLoopRouterTest`, `RoutingDirectorTest`,
`Issue{433,444,463,870}Test`), with v8 coverage over `src/alg/layered/**` (test files excluded), then filtered to the 7g classes
and their split files. Each run:

```bash
npx vitest run --coverage --coverage.include='src/alg/layered/**' --coverage.exclude='**/*.test.ts' --coverage.reporter=json \
  --coverage.reporter=text --coverage.reportsDirectory=<scratch>/A src/alg/layered/LayeredLoopsVectors.test.ts \
  --coverage.thresholds.statements=0 --coverage.thresholds.branches=0 \
  --coverage.thresholds.functions=0 --coverage.thresholds.lines=0
```

Run B appends the ten other test files to the command (the zero thresholds only stop the repository gate from failing a partial
run). Filter (89 files, paths under `src/alg/layered/`):
`intermediate/{SelfLoopPreProcessor,SelfLoopPortRestorer,SelfLoopRouter,SelfLoopPostProcessor,DummySelfLoopProcessor}.ts`,
`intermediate/loops/**` (ordering, routing), `intermediate/wrapping/**`, `intermediate/compaction/**`, `compaction/**`
(components, oned, oned/algs, recthull) and `components/ComponentsCompactor*.ts`. A scratch script (`gen.py`, scratch directory
only) reads `coverage-final.json`, lists every untaken branch arm and uncovered function, assigns each to exactly one row below
(first match, an unmatched item stops the script) and writes this file, so the per-class rows are a partition of the items. Arms
are keyed as in the labels map: the line of the branch, `if[0]` the consequent, `if[1]` the alternative (including the implicit
else), `binary-expr[k]` the k-th operand, `cond-expr[k]` the k-th arm, `switch[k]` the k-th case; a repeated key `xN` means N
branches on that line.

Totals over the 89 files. Run A: **1,433 branches of which 284 untaken, 707 functions of which 88 uncovered** (372 items). Run
B: 1,433 branches of which 248 untaken, 707 functions of which 81 uncovered (the ported suites add 43 items, all J).

| Category | Meaning | Branches + functions |
| -------- | ------- | -------------------- |
| S | Behaviour a new oracle scenario reaches (`sites/*` row, T20) | 97 (85 + 12) |
| J | Reached by a ported Java suite (run B) | 43 (36 + 7) |
| U | Unreachable: owner 7h, or dead by construction (Java line given) | 211 (142 + 69) |
| X | A throwing arm (Java NPE / index / no-such-element); an oracle throw is not recordable | 21 (21 + 0) |
| total | | 372 (284 + 88) |

Files of the filter without any item in run A: `IComponent.ts`, `IConnectedComponents.ts`, `CGraph.ts`, `ICGraphTransformer.ts`,
`ICompactionAlgorithm.ts`, `IConstraintCalculationAlgorithm.ts`, `LongestPathCompaction.ts`,
`ScanlineConstraintCalculatorConstraintsScanlineHandler.ts`, `ScanlineConstraintCalculatorTimestamp.ts`,
`RectilinearConvexHullMaximalElementsEventHandler.ts`, `ScanlineEventHandler.ts`, `ComponentsCompactorHullpoints.ts`,
`ComponentsCompactorInternalComponent.ts`, `ComponentsCompactorOuterSegments.ts`, `ComponentsCompactorSegments.ts`,
`DummySelfLoopProcessor.ts`, `SelfLoopPostProcessor.ts`, `SelfLoopRouter.ts`, `CNodeOrigins.ts`, `SelfLoopPort.ts`,
`AbstractSelfLoopRouter.ts`, `ARDCutIndexHeuristic.ts`.

## Findings that shape the scenarios

- **Two one-dimensional compactors.** `HorizontalGraphCompactor` (and `EdgeAwareScanlineConstraintCalculation`,
  `NetworkSimplexCompaction`) drive the `alg.common` copy (`J/intermediate/compaction/HorizontalGraphCompactor.java:19-22`),
  which is outside the 7g filter; `compaction/oned/**` of the layered bundle is reached only through `ComponentsCompactor` ->
  `OneDimensionalComponentsCompaction`, which never calls `setConstraintAlgorithm` / `setCompactionAlgorithm`, starts every
  compaction at LEFT and passes `n -> true`, `n -> 0.0` to the scanline. So the layered `QuadraticConstraintCalculation`, the
  direction transitions from UNDEFINED to RIGHT/UP/DOWN, the default spacings handler and the ungrouped-CNode path are J only
  (run B), and the scanline filter / spacing arms are U. The recorded `RIGHT` and `QUADRATIC` rows exercise the `alg.common`
  copy (their arms are counted in the 7e/common map, not here).
- **Root-level options do not reach the loop nodes.** The 27 `full/self-loops/*/distribution-<D>-ordering-<O>` rows set
  `selfLoopDistribution` and `selfLoopOrdering` on the root, but the loops sit on child nodes: a single-row coverage run of
  `.../self_loops-label/distribution-EQUALLY-ordering-REVERSE_STACKED` shows `PortRestorer.ts:167` taking STACKED (`switch 167
  [0,0,1,0]`, `reverseList` 0 calls). Every ordering / distribution scenario below therefore sets the option on the node itself
  (setProperty step or node-level `layoutOptions`). Row ids and refs of the landed rows are untouched.
- **Forbidden indices forbid everything.** `GraphStats.java:287-302` fills `cutsAllowed` with false and, for a user list, only
  writes false again, so the recorded `LOOK_BACK` / `GREEDY` rows with forbidden indices [3] always end in the `validCuts.size()
  == 1` early return (`SingleEdgeGraphWrapper.java:165-168`). The body of `validifyIndexesLookingBack` (`:175-213`) is reachable
  only without that property, on a graph whose layers differ in cut permission (Sc1).
- **`JUNCTION_POINTS` is never null.** Its default is `new KVectorChain()` (`Core.melk:675`) and `MapPropertyHolder.getProperty`
  stores a clone (`:50-73`), so every `!= null` / `== null` test on it is dead: `BreakingPointRemover.ts:115,159`,
  `VerticalSegment.ts:71`, `NorthSouthPortPostprocessor.ts:213 if[0]`. The junction-point merge of
  `BreakingPointRemover.java:166-172` therefore always runs and needs no hyperedge scenario; only the SPLINES / POLYLINE switch
  arms are open.
- **Java bug kept, dead arm.** `PortRestorer.java:174-190` tests `positiveNetFlowIndex` twice (the second loop also compares `>
  0`), so the second return (`PortRestorer.ts:224 if[0]`) cannot be taken: it needs `P > 0 && P < size - 1`, which already
  returned at `:210`.
- **Empty graph.** With `separateConnectedComponents=false` an ELK graph without children reaches every processor with zero layers
  (`ComponentsProcessor.java:99-113`); the wrappers then return (`SingleEdgeGraphWrapper.java:71`) or throw
  (`MSDCutIndexHeuristic.java:43-47`, `GraphStats.java:236-240`). Sc5 records the returning cases; the throws are X.
- **v8 caveat.** Line-less tiny functions (accessors, `toString`) are counted individually; every uncovered function below was
  matched against its callers in the Java (`grep` over `plugins/` and `test/`) before being called U.

## W10: the three U items of `plans/layered-labels/unreached.md`

- `DotDebugUtil.ts:211` (`J/DotDebugUtil.java:191`): measured in run A, **0 hits**: the file is never entered (16 arms, 2
  functions at 0) because no row of `layered-loops.json` enables logging (the inherited `logging` op is unused). Verdict **S,
  Sc25**: the same-side self-loop dummy (`NorthSouthPortPreprocessor.java:627-653`, origin an `LEdge`) exists in the rows of the
  `DummySelfLoopProcessor` family (`scenarios/DummySelfLoopProcessor/NORTH-NORTH/RIGHT/end`, plan without the SELF_LOOP arms)
  and the logged dump reaches `getNodeName` for it. Re-classified U -> S (journal at T20).
- `JsonDebugUtilGraph.ts:191` (`J/JsonDebugUtil.java:643`): measured, **0 hits** (the whole file: 22 arms, 5 functions). Verdict
  **S, Sc25** (same row).
- `EndLabelPreprocessor.ts:145` (`J/intermediate/EndLabelPreprocessor.java:180`): measured, `if[1]` **0 hits** (the file's only
  untaken arm). Verdict **S, Sc24**: `gatherLabels(port)` reads every port of a node, and the same-side loop dummy holds a port
  of the loop's target next to one of its source, so the dummy port whose origin is the other port takes the alternative. It
  needs END_LABEL_PREPROCESSOR in the plan (an end label somewhere in the graph) and no SELF_LOOP_PREPROCESSOR (the dummy exists
  only then).

## 7e hand-off list ("7g:" of `plans/roadmap.md`, § Revision 2026-11-03 (layered-edge-routing))

- `NorthSouthPortPostprocessor.processSelfLoop`: **reached**, row `scenarios/DummySelfLoopProcessor/NORTH-NORTH/RIGHT/end`
  (single-row run: 1 call; the EAST-EAST row makes 0 calls, its loop goes to the router). The arms around it that stay open are
  the dummies with several ports (Sc23: `NorthSouthPortPostprocessor.ts:122 if[1]`, `:137 if[1]`, `:170 if[0]`, `:200 if[0]`,
  `:213 if[1]`); `:137 if[0]` and `:213 if[0]` are U (new approach: one origin per dummy,
  `NorthSouthPortPreprocessor.java:148,481`; `JUNCTION_POINTS` never null), `:22 if[0]` is X.
- The P5 routers' self-loop arms: ORTHOGONAL **reached**, e.g. `scenarios/DummySelfLoopProcessor/EAST-EAST/RIGHT/end` (single-row
  run: `WestToEastRoutingStrategy.ts:54` takes both arms, 2 self-loop edges). POLYLINE `PolylineEdgeRouter.ts:441 if[1]` and
  SPLINES `SplineEdgeRouterSegments.ts:119 if[0]`, `:162 if[0]`, `:137 if[1]`, `:246 if[1]`, `:257 if[1]` are **S, Sc22**.
  `NorthToSouthRoutingStrategy.ts` / `SouthToNorthRoutingStrategy.ts` `:54 if[1]` (self loop), `:38`, `:58`, `:78` are **U, 7h**
  (the strategies run only from the hierarchical port router). `SplineSelfLoopRouter` calls `NubSpline`, not `NubsSelfLoop`
  (`J/p5edges/splines/NubsSelfLoop.java` has no caller in ELK): all 27 untaken items of `NubsSelfLoop.ts` stay **U** (dead in
  Java, proven by 7e call rows).
- `inverseOrder` / `SPLINE_SURVIVING_EDGE` in `FinalSplineBendpointsCalculator`: `inverseOrder` arms (`:141 if[0]`, `:142`, `:28
  reverseInPlace`) **S, Sc10** (only `BreakingPointRemover.java:137` sets it); `SPLINE_SURVIVING_EDGE` (`:96`) has no untaken
  arm (any spline row of the compaction family, e.g.
  `full/compaction/compaction_oned-labels-edgeLabelAndSplines/left-scanline-splines`, takes both); the BreakingPointRemover
  writer (`:149`) is inside the Sc10 SPLINES arm.
- The compaction arms of `segmentAllowsSloppyRouting` (`FinalSplineBendpointsCalculator.ts:184-205`): **all arms reached**, e.g.
  `full/compaction/compaction_oned-labels-edgeLabelAndSplines/edge-length-scanline-splines` (single-row run: the no-compaction
  return 0, the compaction path 4; the far arm of the initial segment 3 true / 1 false and of the last segment 1 true / 0
  false). 7e's belief that the far arms are unreachable by the horizontal placement is refuted by these rows.
- The random draw of `RoutingSlotAssigner.java:64` (`HyperEdgeCycleDetector.java:203-205`): the draw itself is reached (no untaken
  arm); the arms that decide it are `OrthogonalRoutingGeneratorCycles.ts:24 if[1]` (a positive-weight dependency is reversed),
  `HyperEdgeSegmentDependency.ts:89 fn reverse`, `HyperEdgeCycleDetector.ts:255 if[1]`, `:297 if[1]`, `:301 if[1]`: **S, Sc21**
  (needs an intransitive triple of hyper loops, with two seeds). `:248 binary-expr[1,2]`/`if[0]` (critical out weight with
  `!criticalOnly`) is U for loops (`createAndAddRegular` makes only regular dependencies, `RoutingSlotAssigner.java:211-233`)
  and belongs to the 7e orthogonal router otherwise.

## Size budget

`layered-loops.json` is 15,724,579 bytes; the limit is 16,777,216, so the headroom is 1,052,637 bytes (1.0 MiB). The plan below
has 34 scenarios and 67 rows at 1-60 KB each: about 824 KB (about 0.80 MiB, 80% of the headroom). The estimate comes from the
landed rows (a stop row with `dump` of a 3-12 node graph is 6-30 KB, 15.7 MB over 1,563 rows is 10 KB on average). Style: every
scenario is a `scenarios` stop row (small graph, `dump` of the fields named under Expected) except the ones marked `full`: Sc5
(empty graph, a few hundred bytes of layout), Sc7, Sc26, Sc27, Sc28, Sc32 (whole layout of a nested or wrapped graph: the
compaction and components arms need the recursive engine or the whole plan), and Sc22 (`end` rows run the rest of the plan).
Sc25 (logging) is the single large row (about 60 KB): the logged DOT/JSON strings of every processor; keep that graph at two
nodes and one loop, and drop Sc25 first if the measured total passes 0.95 MiB. The per-row figures can be off by 40% (worst case
about 1.1 MiB): the second cut is the tier 3 probes (Sc9, Sc21, Sc28, Sc34), about 100 KB, then the third row of Sc33 and the
SPLINES half of Sc22.

## Scenarios (34 ids, about 40 at most; 67 rows)

Seed 1, ELK JSON input, nodes 30 x 30, direction RIGHT, unless stated; `setProperty` steps use the landed op vocabulary
(`importGraph`, `normalise`, `setProperty`, `runProcessor`, `runPhase`, `processor`, `layout`, `dump`, plus the inherited
`labelManager` and `logging`). Tier 1 = the Java text fixes the recipe; tier 2 = the recipe depends on the order the earlier
phases produce (adjust the graph, keep the idea); tier 3 = a probe, reported U with its mechanism if no graph reaches the arm. A
scenario that cannot reach its arm is reported by T20 as a U candidate with the mechanism. T20 confirms each arm with a
single-row run (`-t '<row id>$'`).

| id | Scenario row id | Rows x KB | Tier |
| -- | --------------- | --------- | ---- |
| Sc1 | `sites/SingleEdgeGraphWrapper/validifyLookBack/{lower,upper,skip}` | 3 x 6 | 1 |
| Sc2 | `sites/SingleEdgeGraphWrapper/{aspectAbove,manualNoCuts}` | 2 x 5 | 1 |
| Sc3 | `sites/GraphStats/forbiddenOutOfRange/{greedy,lookBack}` | 2 x 6 | 1 |
| Sc4 | `sites/GraphStats/northSouthHeight` | 1 x 8 | 1 |
| Sc5 | `sites/Empty/{ORTHOGONAL,POLYLINE,SPLINES}/{wrap,compact}` | 5 x 1 | 1 |
| Sc6 | `sites/BreakingPointInserter/oneLayerImproveCuts` | 1 x 5 | 1 |
| Sc7 | `sites/BreakingPointRemover/multiCutEdge/{ORTHOGONAL,POLYLINE}` | 2 x 12 | 1 |
| Sc8 | `sites/BreakingPointProcessor/inLayerDummies/{improveOn,improveOff}` | 2 x 15 | 2 |
| Sc9 | `sites/BreakingPointProcessor/emptyBreakingLayer` | 1 x 10 | 3 |
| Sc10 | `sites/BreakingPointRemover/wrapSplinesPolyline/{SPLINES,POLYLINE}` | 2 x 24 | 1 |
| Sc11 | `sites/CuttingUtils/negativeThickness` | 1 x 8 | 1 |
| Sc12 | `sites/SelfLoopRouter/inlineLabels/{RIGHT,DOWN}` | 2 x 18 | 1 |
| Sc13 | `sites/SelfLoopRouter/labelManager/{shrink}` | 2 x 16 | 1 |
| Sc14 | `sites/LabelPlacer/sequencedSouthOnly` | 1 x 12 | 1 |
| Sc15 | `sites/LabelPlacer/fourSidesLabel/{northFirst,otherFirst}` | 2 x 16 | 1 |
| Sc16 | `sites/LabelPlacer/westLoopLabel` | 1 x 12 | 1 |
| Sc17 | `sites/RoutingSlotAssigner/labelledThenUnlabelled` | 1 x 12 | 1 |
| Sc18 | `sites/PortRestorer/splitIndex` | 1 x 10 | 1 |
| Sc19 | `sites/PortRestorer/reverseStacked/{reverse,sequenced}` | 2 x 16 | 1 |
| Sc20 | `sites/PortSideAssigner/hiddenAndVisible/{EQUALLY,NORTH_SOUTH}` | 2 x 16 | 2 |
| Sc21 | `sites/RoutingSlotAssigner/cyclicHyperLoops/{seed1,seed4096}` | 2 x 20 | 3 |
| Sc22 | `scenarios/DummySelfLoopProcessor/<pair>/RIGHT/end with edgeRouting POLYLINE and SPLINES` | 6 x 10 | 1 |
| Sc23 | `sites/NorthSouthPortPostprocessor/multiPortDummy/{north,south}` | 2 x 16 | 1 |
| Sc24 | `sites/EndLabelPreprocessor/sameSideLoopDummy` | 1 x 12 | 1 |
| Sc25 | `sites/DebugUtil/sameSideLoopDummy` | 1 x 60 | 2 |
| Sc26 | `sites/ComponentsCompactor/loneExternalPorts` | 2 x 10 | 1 |
| Sc27 | `sites/ComponentsCompactor/threeSideExtension/{ESW,NSW}` | 2 x 12 | 1 |
| Sc28 | `sites/ComponentsCompactor/alignedHulls` | 2 x 10 | 3 |
| Sc29 | `sites/HorizontalGraphCompactor/commentWithoutEdge/{LEFT,EDGE_LENGTH}` | 2 x 10 | 1 |
| Sc30 | `sites/HorizontalGraphCompactor/hyperedgeFanIn/{LRCL,EDGE_LENGTH}` | 2 x 12 | 1 |
| Sc31 | `sites/HorizontalGraphCompactor/selfLoopLabel/{ORTHOGONAL,SPLINES}` | 2 x 12 | 1 |
| Sc32 | `sites/HorizontalGraphCompactor/northSouthExternalPorts/{LEFT,EDGE_LENGTH}` | 2 x 16 | 1 |
| Sc33 | `sites/HorizontalGraphCompactor/invertedPorts/{west,east,both}` | 3 x 12 | 2 |
| Sc34 | `sites/HorizontalGraphCompactor/splinePrecalculated/{hyperedge,plain}` | 2 x 16 | 3 |

### Sc1 `sites/SingleEdgeGraphWrapper/validifyLookBack/{lower,upper,skip}`

- **Graph:** path-like graph n0 -> n1 -> n2 -> n3 -> {p, q} -> n5 -> n6 -> n7 -> n8 (p, q both fed by n3 and both feeding n5: 9
  layers; the layer of {p, q} and the layer of n5 forbid a cut, `GraphStats.java:332-352`); nodes 30 x 30, direction RIGHT
- **Steps / options:** `wrapping.strategy=SINGLE_EDGE`, `wrapping.cutting.strategy=MANUAL`,
  `wrapping.validify.strategy=LOOK_BACK`, NO forbidden indices (a set forbidden-indices property makes every cut forbidden:
  `GraphStats.java:293-302` only writes false); cuts via a setProperty step on g0 as the scenarios do: `lower` [4] (validCuts
  1,2,3,6,7,8: dist 1 vs 2, picks 3), `upper` [5] (dist 2 vs 1, picks 6), `skip` [5, 5] (second cut dropped by the inner while,
  `SingleEdgeGraphWrapper.java:204-207`); stop SINGLE_EDGE_GRAPH_WRAPPER, dump
- **Expected field:** layers (the rebuilt layering)
- **TS sites:** `SingleEdgeGraphWrapper.ts` 23 fn listGet; 24 binary-expr[0,1]; 24 if[1]; 139 if[0]; 143 if[1]; 163
  binary-expr[0,1]; 173 if[0,1]; 181 binary-expr[0,1].

### Sc2 `sites/SingleEdgeGraphWrapper/{aspectAbove,manualNoCuts}`

- **Graph:** chain of 8 nodes (30 x 30), direction RIGHT
- **Steps / options:** `aspectAbove`: `wrapping.strategy=SINGLE_EDGE`, `aspectRatio=20` (> the 8 layers: early return
  `SingleEdgeGraphWrapper.java:82-86`); `manualNoCuts`: SINGLE_EDGE, `wrapping.cutting.strategy=MANUAL`, no cuts
  (`ICutIndexCalculator.java:52-58` returns the empty list); stop SINGLE_EDGE_GRAPH_WRAPPER, dump
- **Expected field:** layers (unchanged)
- **TS sites:** `ICutIndexCalculator.ts` 36 if[1]; `SingleEdgeGraphWrapper.ts` 69 if[0].

### Sc3 `sites/GraphStats/forbiddenOutOfRange/{greedy,lookBack}`

- **Graph:** chain of 8 nodes
- **Steps / options:** `wrapping.strategy=SINGLE_EDGE`, MANUAL cuts [3], `wrapping.validify.forbiddenIndices` = [0, 99] (both fail
  `f > 0 && f < size`, `GraphStats.java:298-302`), validify GREEDY / LOOK_BACK; stop SINGLE_EDGE_GRAPH_WRAPPER, dump
- **Expected field:** layers
- **TS sites:** `GraphStats.ts` 298 if[1].

### Sc4 `sites/GraphStats/northSouthHeight`

- **Graph:** chain a -> b -> c -> d -> e -> f -> g -> h; b has `portConstraints=FIXED_SIDE` and a NORTH port bn; the edge a -> b
  targets bn
- **Steps / options:** `wrapping.strategy=SINGLE_EDGE`, default cutting (MSD: `getHeights()` reaches `determineLayerHeight`,
  `GraphStats.java:242-253`), `aspectRatio=0.3`; stop SINGLE_EDGE_GRAPH_WRAPPER, dump (the NORTH_SOUTH_PORT dummy exists after
  P3)
- **Expected field:** layers
- **TS sites:** `GraphStats.ts` 246 if[0].

### Sc5 `sites/Empty/{ORTHOGONAL,POLYLINE,SPLINES}/{wrap,compact}`

- **Graph:** ELK graph `{ id: root }` with no children
- **Steps / options:** `separateConnectedComponents=false` (an empty component list would skip every processor,
  `ComponentsProcessor.java:99-113`); `wrap`: `wrapping.strategy=SINGLE_EDGE`; `compact`:
  `compaction.postCompaction.strategy=LEFT` (not for POLYLINE: no HORIZONTAL_COMPACTOR, `GraphConfigurator.java:273-275`);
  edgeRouting per variant; whole layout. The zero-layer arms are `SingleEdgeGraphWrapper.java:71`, the routers' empty-layers
  returns and `findMinimumSpacing` on an empty cGraph. If the Java throws on an empty graph the rows are an oracle-throws case
  (not recordable): journal as X
- **Expected field:** layout (root size)
- **TS sites:** `EdgeAwareScanlineConstraintCalculation.ts` 170 cond-expr[0]; `SingleEdgeGraphWrapper.ts` 58 if[0];
  `PolylineEdgeRouter.ts:217 if[1]` (hand-off); `SplineEdgeRouter.ts:205 if[0]` (hand-off).

### Sc6 `sites/BreakingPointInserter/oneLayerImproveCuts`

- **Graph:** two unconnected nodes (one layer)
- **Steps / options:** `wrapping.strategy=MULTI_EDGE`, `wrapping.cutting.strategy=MANUAL`, cuts [1] (setProperty on g0),
  `wrapping.multiEdge.improveCuts` default true (the loop of `improveCuts` runs for `idx` in 1..size-1: nothing, so `bestCut ==
  null`, `BreakingPointInserter.java:305`); stop BREAKING_POINT_INSERTER, dump
- **Expected field:** layers (unchanged, no breaking points)
- **TS sites:** `BreakingPointInserter.ts` 266 if[1].

### Sc7 `sites/BreakingPointRemover/multiCutEdge/{ORTHOGONAL,POLYLINE}`

- **Graph:** chain n0..n11 plus the long edge n0 -> n11 (it crosses every cut)
- **Steps / options:** `wrapping.strategy=MULTI_EDGE`, MANUAL cuts [3, 6] (setProperty), `edgeRouting` per variant; whole layout;
  the chained breaking points give `bpi.next != null` at the first end dummy (`BreakingPointRemover.java:68-72`,
  `BreakingPointInserter.java:215-219`)
- **Expected field:** layout (edge bend points)
- **TS sites:** `BreakingPointRemover.ts` 43 if[1].

### Sc8 `sites/BreakingPointProcessor/inLayerDummies/{improveOn,improveOff}`

- **Graph:** chain n0..n8 plus three long edges n0 -> n8, n1 -> n8, n2 -> n8
- **Steps / options:** `wrapping.strategy=MULTI_EDGE`, MANUAL cuts [4] (setProperty); `improveWrappedEdges` true / false; stop
  BREAKING_POINT_PROCESSOR, dump. The wrapped long edges become in-layer dummies that sit between long-edge dummies
  (`BreakingPointProcessor.java:340-358,380-383`). Probe: if no ordering puts an in-layer dummy between two others, vary the
  number of skip edges
- **Expected field:** layers, edges
- **TS sites:** `BreakingPointProcessor.ts` 322 if[1]; 349 if[0].

### Sc9 `sites/BreakingPointProcessor/emptyBreakingLayer`

- **Graph:** two components a -> b and c -> d -> e placed so that no edge crosses the cut: `layering.strategy=INTERACTIVE` with a
  gap between the x extents (`layering.layerId` per node)
- **Steps / options:** `wrapping.strategy=MULTI_EDGE`, MANUAL cuts [2]; stop BREAKING_POINT_PROCESSOR, dump. The arm needs a bp
  layer without breaking-point dummies (`BreakingPointProcessor.java:151`); with the default layerers a layer k+1 always has an
  open edge, so this is a probe: if no layering leaves the cut uncrossed, report U with that mechanism
- **Expected field:** layers
- **TS sites:** `BreakingPointProcessor.ts` 98 if[1].

### Sc10 `sites/BreakingPointRemover/wrapSplinesPolyline/{SPLINES,POLYLINE}`

- **Graph:** chain n0..n11 plus skip edges n1 -> n6, n3 -> n9
- **Steps / options:** `wrapping.strategy=MULTI_EDGE`, MANUAL cuts [3, 6, 9] (setProperty); `edgeRouting` SPLINES / POLYLINE; stop
  FINAL_SPLINE_BENDPOINTS_CALCULATOR for SPLINES (`inverseOrder` reverse, `FinalSplineBendpointsCalculator.java` after the
  remover), BREAKING_POINT_REMOVER for POLYLINE; dump
- **Expected field:** edges (bend points), layers
- **TS sites:** `BreakingPointRemover.ts` 66 switch[0,1]; 125 fn joinSplineRoutes; 137 fn anonymous_5;
  `FinalSplineBendpointsCalculator.ts:141 if[0]` (hand-off); `FinalSplineBendpointsCalculator.ts:142 fn` (hand-off);
  `FinalSplineBendpointsCalculator.ts:28 fn reverseInPlace` (hand-off).

### Sc11 `sites/CuttingUtils/negativeThickness`

- **Graph:** chain of 8 nodes, edge n0 -> n7 with `edge.thickness=-2`
- **Steps / options:** `wrapping.strategy=SINGLE_EDGE`, MANUAL cuts [3]; stop SINGLE_EDGE_GRAPH_WRAPPER, dump
  (`CuttingUtils.java:105-110` resets the thickness to 0)
- **Expected field:** edge thickness property, dummy sizes
- **TS sites:** `CuttingUtils.ts` 127 if[0].

### Sc12 `sites/SelfLoopRouter/inlineLabels/{RIGHT,DOWN}`

- **Graph:** node a 80 x 80, `portConstraints=FIXED_SIDE`; four loops with one center label each (60 x 12) and
  `edgeLabels.inline=true`: {N,E,W} (label side NORTH), {E,W} (SOUTH), {N,S} (EAST), {N,S,W} (WEST); `selfLoopDistribution`
  default
- **Steps / options:** stop SELF_LOOP_ROUTER, dump (per-label positions and loop bend points); `LabelPlacer.java:218-240` keeps
  the inline property only for opposing and three-sided loops, and `OrthogonalSelfLoopRouter.java:104-107,156-158,360-377` adds
  the half label size
- **Expected field:** selfLoops (label positions), edges
- **TS sites:** `SelfLoopEdge.ts` 71 if[0]; 79 fn getLabelSide; `LabelPlacer.ts` 272 if[0]; 280 if[0]; 292 if[0];
  `OrthogonalSelfLoopRouter.ts` 158 if[0]; 164 if[0]; 343 if[0]; 362 binary-expr[1]; 362 if[0]; 366 binary-expr[1,2]; 366
  cond-expr[0]; 375 fn reserveInlineLabelSpace; 376 if[0,1]; 378 if[0,1]; 408 fn adjustVectorForLabelSide; 409 switch[0,1,2,3].

### Sc13 `sites/SelfLoopRouter/labelManager/{shrink}`

- **Graph:** node a 80 x 80 with labelled loops of every alignment: E-E (TOP), N-N (CENTER), N-E corner with leftmost NORTH
  (LEFT), E-N corner with rightmost NORTH (RIGHT); label widths above the available width
- **Steps / options:** `labelManager` step op (kind of the labels recorder, `tools/vectors/LayeredLoopsVectors.java:1564`), first
  step before importGraph; stop SELF_LOOP_ROUTER, dump; `LabelPlacer.java:46-48,341-370` and `applyLabelManagement`
- **Expected field:** selfLoops (label sizes), edges
- **TS sites:** `SelfHyperLoopLabels.ts` 96 fn applyLabelManagement; `LabelPlacer.ts` 46 if[0]; 341 fn manageLabels; 355
  switch[0,1,2,3].

### Sc14 `sites/LabelPlacer/sequencedSouthOnly`

- **Graph:** node a with two one-sided labelled loops on the SOUTH side and none on the NORTH
- **Steps / options:** `edgeRouting.selfLoopOrdering=SEQUENCED` set on the node itself (a root-level option does not reach the
  node, see the notes); stop SELF_LOOP_ROUTER, dump (`LabelPlacer.java:123-130`)
- **Expected field:** selfLoops (label sides and alignments)
- **TS sites:** `LabelPlacer.ts` 82 if[1].

### Sc15 `sites/LabelPlacer/fourSidesLabel/{northFirst,otherFirst}`

- **Graph:** two nodes, each with one FOUR_SIDES hyper loop (ports on N, E, S, W) and a center label; in the first the leftmost
  port is NORTH (`LabelPlacer.java:249` reads the leftmost port twice, so `||` evaluates its second operand only when the
  leftmost side is not NORTH), in the second it is not
- **Steps / options:** stop SELF_LOOP_ROUTER, dump
- **Expected field:** selfLoops (label side), edges
- **TS sites:** `LabelPlacer.ts` 100 switch[4]; 306 fn assignFourSidesSideAndAlignment; 318 binary-expr[0,1]; 318 if[0,1].

### Sc16 `sites/LabelPlacer/westLoopLabel`

- **Graph:** node a with a one-sided WEST loop (two ports, FIXED_SIDE) and a center label
- **Steps / options:** stop SELF_LOOP_ROUTER, dump (`LabelPlacer.java:158-163`: on WEST the rightmost port lies above the leftmost
  one)
- **Expected field:** selfLoops (label alignment reference), edges
- **TS sites:** `LabelPlacer.ts` 157 if[0].

### Sc17 `sites/RoutingSlotAssigner/labelledThenUnlabelled`

- **Graph:** node a with two one-sided loops on the NORTH side in port order: loop 1 with a center label, loop 2 without
- **Steps / options:** stop SELF_LOOP_ROUTER, dump (`RoutingSlotAssigner.java:99-103`: loop 2 has no labels)
- **Expected field:** selfLoops (routing slots), edges
- **TS sites:** `RoutingSlotAssigner.ts` 96 if[1].

### Sc18 `sites/PortRestorer/splitIndex`

- **Graph:** node a, `portConstraints=FREE`, three ports on one side with edges p2 -> p1 and p3 -> p1 (net flows -2, +1, +1,
  sorted [-2, 1, 1])
- **Steps / options:** selfLoopOrdering default (STACKED); stop SELF_LOOP_PORT_RESTORER, dump (`PortRestorer.java:174-178`: P=1 is
  strictly inside, returned)
- **Expected field:** ports (order and sides)
- **TS sites:** `PortRestorer.ts` 210 if[0].

### Sc19 `sites/PortRestorer/reverseStacked/{reverse,sequenced}`

- **Graph:** node a with two one-sided loops on the same side, FREE ports
- **Steps / options:** `edgeRouting.selfLoopOrdering=REVERSE_STACKED` (and a SEQUENCED twin) set on the node itself; stop
  SELF_LOOP_PORT_RESTORER, dump (`PortRestorer.java:120-160`)
- **Expected field:** ports (order)
- **TS sites:** `PortRestorer.ts` 19 fn reverseList; 149 if[0]; 167 switch[1].

### Sc20 `sites/PortSideAssigner/hiddenAndVisible/{EQUALLY,NORTH_SOUTH}`

- **Graph:** node a, `portConstraints=FREE`, one hyper loop over four ports: two with only loop edges (hidden) and two that also
  carry an edge to a neighbour (visible), net flows ordered so that a visible port sits in each half of the sorted list
- **Steps / options:** `edgeRouting.selfLoopDistribution` EQUALLY / NORTH_SOUTH set on the node; stop SELF_LOOP_PORT_RESTORER,
  dump (`PortSideAssigner.java:185,193`)
- **Expected field:** ports (sides)
- **TS sites:** `PortSideAssigner.ts` 145 if[1]; 152 if[1].

### Sc21 `sites/RoutingSlotAssigner/cyclicHyperLoops/{seed1,seed4096}`

- **Graph:** node a with three disjoint hyper loops over nine ports so that their crossing counts are intransitive (a brute force
  over rings of 6..12 ports finds none on one side with spans that do not wrap; the first natural arrangement is N = 9: loops
  {0,1,5}, {2,6,7}, {3,4,8} with arcs 0..5, 6..2, 3..8, every pair weighted 1; spread the nine ports over the four sides)
- **Steps / options:** `randomSeed` 1 and 4096 (seeds 1..40 draw the same first `nextInt(2)`, 4096 the other); stop
  SELF_LOOP_ROUTER, dump. `breakNonCriticalCycles` then reverses a positive-weight dependency
  (`OrthogonalRoutingGenerator.java:471-483`) and `detectCycles` takes the random draw (`HyperEdgeCycleDetector.java:203-205`).
  Probe: the arcs come from `RoutingDirector`; if no natural arrangement gives a cycle, report U (the arm is then dead for self
  loops: loops never produce critical dependencies)
- **Expected field:** selfLoops (routing slots), edges
- **TS sites:** `OrthogonalRoutingGeneratorCycles.ts:24 if[1]` (hand-off); `HyperEdgeSegmentDependency.ts:89 fn reverse`
  (hand-off); `HyperEdgeCycleDetector.ts:255 if[1]` (hand-off); `HyperEdgeCycleDetector.ts:297 if[1]` (hand-off);
  `HyperEdgeCycleDetector.ts:301 if[1]` (hand-off).

### Sc22 `scenarios/DummySelfLoopProcessor/<pair>/RIGHT/end with edgeRouting POLYLINE and SPLINES`

- **Graph:** the DummySelfLoopProcessor graph (node a between n0 and n2 with a bypass) with an EAST-EAST loop, a WEST-WEST loop
  and a NORTH-EAST loop (E-E / W-W loops stay for the P5 routers, N-N / S-S become dummies)
- **Steps / options:** `edgeRouting` POLYLINE and SPLINES (three pairs each, six rows); whole plan without the SELF_LOOP arms,
  `processor DummySelfLoopProcessor` op as the landed rows; `end`
- **Expected field:** layout (edge bend points)
- **TS sites:** `PolylineEdgeRouter.ts:441 if[1]` (hand-off); `SplineEdgeRouterSegments.ts:119 if[0]` (hand-off);
  `SplineEdgeRouterSegments.ts:162 if[0]` (hand-off); `SplineEdgeRouterSegments.ts:137 if[1]` (hand-off);
  `SplineEdgeRouterSegments.ts:246 if[1]` (hand-off); `SplineEdgeRouterSegments.ts:257 if[1]` (hand-off).

### Sc23 `sites/NorthSouthPortPostprocessor/multiPortDummy/{north,south}`

- **Graph:** node n with a NORTH port pn (FIXED_SIDE) fed by two edges a -> pn and b -> pn (north) / a SOUTH port ps with two
  edges ps -> c and ps -> d (south); orthogonal routing
- **Steps / options:** stop NORTH_SOUTH_PORT_POSTPROCESSOR, dump (the dummy has two ports with one origin: `sameOriginPort`,
  junction points, `NorthSouthPortPostprocessor.java:97-118,150-170`)
- **Expected field:** edges (bend and junction points)
- **TS sites:** `NorthSouthPortPostprocessor.ts:122 if[1]` (hand-off); `NorthSouthPortPostprocessor.ts:137 if[1]` (hand-off);
  `NorthSouthPortPostprocessor.ts:170 if[0]` (hand-off); `NorthSouthPortPostprocessor.ts:200 if[0]` (hand-off);
  `NorthSouthPortPostprocessor.ts:213 if[1]` (hand-off).

### Sc24 `sites/EndLabelPreprocessor/sameSideLoopDummy`

- **Graph:** DummySelfLoopProcessor graph with a NORTH-NORTH loop on a and a head label (30 x 12) on the edge n0 -> a, so
  END_LABELS puts END_LABEL_PREPROCESSOR in the plan
- **Steps / options:** processor DummySelfLoopProcessor, stop END_LABEL_PREPROCESSOR, dump (`EndLabelPreprocessor.java:180`: the
  loop dummy has two ports of two origins, `NorthSouthPortPreprocessor.java:636-649`)
- **Expected field:** labels (positions), ports
- **TS sites:** `EndLabelPreprocessor.ts:145 if[1] (W10)` (hand-off).

### Sc25 `sites/DebugUtil/sameSideLoopDummy`

- **Graph:** the Sc24 graph reduced to a, one NORTH-NORTH loop and one neighbour (two nodes)
- **Steps / options:** `logging` step op (inherited from the labels recorder), whole plan without the SELF_LOOP arms, logged
  terminal dump: the DOT and JSON strings of every logged graph (G3a comparator); `DotDebugUtil.java:191`,
  `JsonDebugUtil.java:643` read the dummy whose origin is an LEdge
- **Expected field:** the logged `lgraph` DOT / JSON strings
- **TS sites:** `DotDebugUtil.ts:211 if[1] (W10)` (hand-off); `JsonDebugUtilGraph.ts:191 if[1] (W10)` (hand-off).

### Sc26 `sites/ComponentsCompactor/loneExternalPorts`

- **Graph:** compound node c with four ports (WEST, NORTH, EAST, SOUTH) and no edge to the inside, next to one regular child (x)
  so the level has components: each port dummy is its own component with no regular node
- **Steps / options:** `compaction.connectedComponents=true` on c, direction RIGHT, whole layout of the nested level
  (`ComponentsCompactor.java:80-83,205-206,310-345`); each of the four sides in its own component
- **Expected field:** layout (port and node positions)
- **TS sites:** `ComponentsCompactor.ts` 80 binary-expr[1]; 205 if[0]; 357 fn createDummyNode; 379 if[0,1]; 381 if[0,1]; 383
  if[0,1]; 385 if[0,1].

### Sc27 `sites/ComponentsCompactor/threeSideExtension/{ESW,NSW}`

- **Graph:** compound node c with ports on three sides and one child node x connected to all three (one component whose
  `EXT_PORT_CONNECTIONS` is {E,S,W} resp. {N,S,W})
- **Steps / options:** `compaction.connectedComponents=true` on c, direction RIGHT; whole layout
  (`ComponentsToCGraphTransformer.java:227-232`)
- **Expected field:** layout
- **TS sites:** `ComponentsToCGraphTransformer.ts` 221 if[0]; 224 if[0].

### Sc28 `sites/ComponentsCompactor/alignedHulls`

- **Graph:** three components whose hull rectangles share an x edge (two nodes of equal width stacked, one L-shaped component next
  to them)
- **Steps / options:** `compaction.connectedComponents=true`, `separateConnectedComponents=true`, direction RIGHT; whole layout
  (`RectilinearConvexHull` tie breaks at equal x). Probe for `PointQuadrant:63`, the equal arm of `integerCompare`,
  `RectilinearConvexHull.ts:223` and `RectangleEventHandler.ts:71`
- **Expected field:** layout
- **TS sites:** `PointQuadrant.ts` 63 binary-expr[1]; `RectilinearConvexHull.ts` 17 cond-expr[0]; 223 if[1];
  `RectilinearConvexHullRectangleEventHandler.ts` 71 if[1].

### Sc29 `sites/HorizontalGraphCompactor/commentWithoutEdge/{LEFT,EDGE_LENGTH}`

- **Graph:** a -> b plus a node c with `commentBox=true` and no edge
- **Steps / options:** `compaction.postCompaction.strategy` LEFT / EDGE_LENGTH, ORTHOGONAL; stop HORIZONTAL_COMPACTOR, dump
  (`LGraphToCGraphTransformer.java:136-137`)
- **Expected field:** layout (comment position)
- **TS sites:** `LGraphToCGraphTransformer.ts` 155 if[1].

### Sc30 `sites/HorizontalGraphCompactor/hyperedgeFanIn/{LRCL,EDGE_LENGTH}`

- **Graph:** three nodes a, b, c (first layer) with edges a -> t.p, b -> t.p, c -> t.p into one port of t (a hyperedge with
  several sources and one target)
- **Steps / options:** `compaction.postCompaction.strategy=LEFT_RIGHT_CONNECTION_LOCKING` and EDGE_LENGTH, ORTHOGONAL; stop
  HORIZONTAL_COMPACTOR, dump (`LGraphToCGraphTransformer.java:419-425`: three distinct sources, one target)
- **Expected field:** edges (bend points), layers
- **TS sites:** `LGraphToCGraphTransformer.ts` 278 if[0].

### Sc31 `sites/HorizontalGraphCompactor/selfLoopLabel/{ORTHOGONAL,SPLINES}`

- **Graph:** node a with an EAST-EAST self loop with a center label and a neighbour b
- **Steps / options:** `compaction.postCompaction.strategy=LEFT`; ORTHOGONAL / SPLINES; stop HORIZONTAL_COMPACTOR, dump
  (`LGraphToCGraphTransformer.java:487-498` moves the label by the node shift; the spline variant covers the spline loop offsets
  under compaction)
- **Expected field:** edges, labels (positions)
- **TS sites:** `LGraphToCGraphTransformer.ts` 393 fn anonymous_23.

### Sc32 `sites/HorizontalGraphCompactor/northSouthExternalPorts/{LEFT,EDGE_LENGTH}`

- **Graph:** compound node c with ports on NORTH and SOUTH (and WEST/EAST) and a child connected to each; compaction applies to
  the level of c
- **Steps / options:** `compaction.postCompaction.strategy` on c; whole layout of the nested level (the external port dummies are
  positioned by `applyExternalPortPositions`, `LGraphToCGraphTransformer.java:641-655`)
- **Expected field:** layout
- **TS sites:** `LGraphToCGraphTransformer.ts` 414 switch[2,3].

### Sc33 `sites/HorizontalGraphCompactor/invertedPorts/{west,east,both}`

- **Graph:** a -> b with a.p on WEST (an output port: inverted) and b.q on EAST (an input port: inverted), both FIXED_SIDE; a
  second edge from a.p to c so the edge has two vertical segments
- **Steps / options:** `compaction.postCompaction.strategy=EDGE_LENGTH`, ORTHOGONAL; stop HORIZONTAL_COMPACTOR, dump
  (`NetworkSimplexCompaction.java:250-290`: `lEdgeMap.get(lEdge)` with several elements, source and target in one group)
- **Expected field:** edges, layers
- **TS sites:** `NetworkSimplexCompaction.ts` 279 if[0].

### Sc34 `sites/HorizontalGraphCompactor/splinePrecalculated/{hyperedge,plain}`

- **Graph:** hyperedge model of `tests/layered/splines/hyperedges` reduced to three nodes
- **Steps / options:** `compaction.postCompaction.strategy=EDGE_LENGTH`, SPLINES; stop HORIZONTAL_COMPACTOR, dump. Probe for
  `NetworkSimplexCompaction.ts:83` (a precalculated constraint inside one group, alg.common
  `OneDimensionalCompactor.java:439-450`); if no graph produces it, report U
- **Expected field:** edges
- **TS sites:** `NetworkSimplexCompaction.ts` 83 if[0].

## Per class

`J/` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered` (alg.common and core are named in
full). One entry per (file, category, evidence); items are `line kind[arms]` as keyed above.

### `compaction/components/ComponentsToCGraphTransformer.ts`

- **S** 221 if[0], 224 if[0] — Sc27: lock rows for the sides sets E-S-W and N-S-W
  (J/compaction/components/ComponentsToCGraphTransformer.java:227,230)
- **U** 147 if[1] — J/compaction/components/ComponentsToCGraphTransformer.java:163: union extension always has a placeholder
  (J/components/ComponentsCompactor.java:228-297)

### `compaction/components/ComponentsToCGraphTransformerCRectNode.ts`

- **U** 45 fn getElementPosition — J/compaction/oned/CNode.java:103: no caller of the abstract accessor in ELK
- **U** 49 fn toString — J/compaction/components/ComponentsToCGraphTransformer.java: debug-only override returning ""

### `compaction/components/IExternalExtension.ts`

- **U** 42 cond-expr[0] — J/components/ComponentsCompactor.java:668-760: only InternalUnionExternalExtension reaches the
  transformer and it overrides getPlaceholder (:696)

### `compaction/components/OneDimensionalComponentsCompaction.ts`

- **U** 450 if[0] — J/compaction/components/OneDimensionalComponentsCompaction.java:320: List.remove of an element added by
  addExternalEdgeRepresentations

### `compaction/oned/CGroup.ts`

- **J** 52 if[0,1] — CompactionTest (B): CGroup built with nodes; the pipeline never builds an ungrouped CNode
  (OneDimensionalCompactor.java:84-91)
- **U** 81 if[1] — J/compaction/components/OneDimensionalComponentsCompaction.java:320: only caller removes a node it added to
  that group
- **X** 66 if[0] — J/compaction/oned/CGroup.java: RuntimeException "CNode belongs to another CGroup"

### `compaction/oned/CNode.ts`

- **U** 91 fn getDebugSVG, 96 cond-expr[0,1], 104 fn toString — J/compaction/oned/OneDimensionalCompactor.java:552-581:
  drawHitboxes has no caller in the ELK tree (grep over plugins and tests)

### `compaction/oned/CompareFuzzy.ts`

- **U** 16 fn constructor — J/compaction/oned/CompareFuzzy.java: private constructor of a static utility class

### `compaction/oned/ISpacingsHandler.ts`

- **J** 37 fn getHorizontalSpacing, 41 fn getVerticalSpacing — CompactionTest (B): default handler; the pipeline always installs
  ComponentsToCGraphTransformer.java:337 handler

### `compaction/oned/OneDimensionalCompactor.ts`

- **J** 77 if[0], 109 fn setConstraintAlgorithm — CompactionTest (B): ungrouped CNodes and setConstraintAlgorithm; the layered
  copy has no pipeline caller (HGC uses alg.common)
- **U** 69 fn anonymous_1 — J/compaction/components/OneDimensionalComponentsCompaction.java:150: default locking strategy replaced
  before the first applyLockingStrategy (:208)
- **U** 100 fn setCompactionAlgorithm, 326 fn drawHitboxes — J/compaction/oned/OneDimensionalCompactor.java:110,552: no caller in
  the layered tree; HorizontalGraphCompactor.java:22 imports the alg.common copy
- **U** 125 if[0] — J/compaction/components/OneDimensionalComponentsCompaction.java:205,249: every compact() follows a
  changeDirection
- **U** 184 if[0] — J/compaction/components/ComponentsToCGraphTransformer.java:133: CGraph supports EnumSet.allOf(Direction)
- **X** 120 if[0], 178 if[0] — J/compaction/oned/OneDimensionalCompactor.java: IllegalStateException after finish()

### `compaction/oned/OneDimensionalCompactorConstraints.ts`

- **U** 27 if[1] — J/compaction/oned/algs/ScanlineConstraintCalculator.java:241,249; QuadraticConstraintCalculation.java:39: both
  calculators skip same-group pairs

### `compaction/oned/OneDimensionalCompactorDebug.ts`

- **U** 18 fn determineViewBox, 37 fn drawHitboxes — J/compaction/oned/OneDimensionalCompactor.java:552: debug SVG, no caller

### `compaction/oned/OneDimensionalCompactorDirections.ts`

- **J** 23 switch[1,2,3], 50 switch[2], 73 switch[1,2], 98 switch[1], 121 switch[0,1] — CompactionTest (B): direction transitions
  other than UNDEFINED/LEFT/RIGHT -> LEFT/UP/DOWN chains; ComponentsCompactor starts at LEFT
- **U** 23 switch[4], 50 switch[3], 73 switch[3], 98 switch[3], 121 switch[3], 158 switch[5] —
  J/compaction/oned/OneDimensionalCompactor.java:195-290: default of a switch over the five Direction constants; no caller
  passes UNDEFINED as the new direction

### `compaction/oned/OneDimensionalCompactorTransforms.ts`

- **U** 53 if[0] — J/compaction/oned/CNode.java:42: CNode.parentNode is never assigned in the layered tree

### `compaction/oned/Quadruplet.ts`

- **U** 25 if[1], 37 if[1], 44 fn setDirection, 45 switch[0,1,2,3,4], 70 switch[4] — J/compaction/oned/Quadruplet.java:35-85: only
  the 4-argument set (ComponentsToCGraphTransformer.java:184-239) and get have callers

### `compaction/oned/algs/QuadraticConstraintCalculation.ts`

- **J** 14 fn calculateConstraints, 24 if[0,1], 28 binary-expr[0,1], 28 if[0,1], 33 if[0,1], 43 if[0,1], 54
  binary-expr[0,1,2,3,4,5] — CompactionTest (B): QUADRATIC_CONSTRAINTS of the layered copy has no pipeline caller (HGC sets the
  alg.common one)

### `compaction/oned/algs/ScanlineConstraintCalculator.ts`

- **U** 77 if[1], 94 if[0], 100 if[0], 101 if[0,1], 104 if[0,1], 113 if[0], 119 if[0], 120 if[0,1], 123 if[0,1], 134 fn
  spacesFirstSide, 136 binary-expr[0,1] x2, 137 binary-expr[0,1], 142 fn spacesSecondSide, 144 binary-expr[0,1] x2, 145
  binary-expr[0,1] — J/compaction/oned/algs/ScanlineConstraintCalculator.java:54: sole caller sweep(n -> true, n -> 0.0): filter
  always true, spacing 0; no subclass in the layered tree (EdgeAware extends the alg.common copy)

### `compaction/oned/algs/ScanlineConstraintCalculatorTreeSet.ts`

- **U** 47 fn floor, 49 cond-expr[0,1], 53 fn ceiling — J/compaction/oned/algs/ScanlineConstraintCalculator.java:232-250: the
  handler reads only lower/higher; floor/ceiling are TS shim API

### `compaction/recthull/Point.ts`

- **J** 47 fn toString, 48 cond-expr[0,1], 52 fn equals, 53 binary-expr[0,1], 53 if[1], 56 if[1], 61 binary-expr[0,1] —
  RectlinearConvexHullTest (B): Point.toString/equals
- **U** 53 if[0], 56 if[0], 65 fn hashCode — J/compaction/recthull/Point.java: equals(null) / foreign class and hashCode have no
  caller in ELK

### `compaction/recthull/PointQuadrant.ts`

- **S** 63 binary-expr[1] — Sc28: tie break of RIGHT_SPECIAL_ORDER between points of the quadrant pairs Q1/Q4 at equal x
- **J** 90 fn toString — RectlinearConvexHullTest (B): Quadrant.toString
- **U** 39 fn anonymous_3, 40 if[0,1], 86 fn name, 94 fn compareTo — J/compaction/recthull/Point.java: Java Enum API (valueOf,
  name, compareTo) of Quadrant has no caller

### `compaction/recthull/RectilinearConvexHull.ts`

- **S** 17 cond-expr[0] — Sc28: integerCompare equal arm: two same-quadrant points with equal x and equal convexity (aligned
  hulls)
- **S** 223 if[1] — Sc28: hull whose scan queues no rectangle (degenerate, probe)
- **U** 141 if[0], 153 if[0] — J/compaction/recthull/RectilinearConvexHull.java: DEBUG constant is false
- **X** 232 if[0] — J/compaction/recthull/RectilinearConvexHull.java: NullPointerException on a hull without extremal points

### `compaction/recthull/RectilinearConvexHullRectangleEventHandler.ts`

- **S** 71 if[1] — Sc28: queueing point before both minY and maxY exist (FIXME else? in the Java; probe)
- **X** 17 if[0] — J/compaction/recthull/RectilinearConvexHull.java: NullPointerException on a point without quadrant

### `compaction/recthull/Scanline.ts`

- **U** 38 cond-expr[0] — J/compaction/recthull/Scanline.java: every caller passes a single EventHandler; the Iterable overload is
  for tests

### `components/ComponentsCompactor.ts`

- **S** 80 binary-expr[1], 205 if[0], 357 fn createDummyNode, 379 if[0,1], 381 if[0,1], 383 if[0,1], 385 if[0,1] — Sc26: component
  that is a lone external-port dummy (J/components/ComponentsCompactor.java:80-83,205-206,310-345)
- **U** 169 if[1], 222 if[1], 290 if[1] — J/components/ComponentsCompactor.java:155-170,238-297: switch without default over the
  four external sides; rectilinear hull steps share one coordinate

### `components/ComponentsCompactorEdgeTransformer.ts`

- **U** 114 if[1], 183 if[1], 201 if[1] — J/graph/LGraphUtil.java:844-907: EXT_PORT_SIDE is N/E/S/W (assert false at :907, set at
  :964)

### `components/ComponentsCompactorInternalConnectedComponents.ts`

- **U** 17 fn anonymous_0, 25 fn isContainsExternalExtensions — J/components/ComponentsCompactor.java:593-612: neither iterator()
  nor isContainsExternalExtensions has a caller

### `components/ComponentsCompactorInternalExternalExtension.ts`

- **U** 51 fn getRepresentor, 55 fn getParent — J/components/ComponentsCompactor.java:431,752-758: InternalExternalExtension never
  reaches the compactor; accessors have no caller
- **X** 35 if[1] — J/components/ComponentsCompactor.java:725-743: IllegalArgumentException for a non-external edge; callers pass
  external edges (:143)

### `components/ComponentsCompactorInternalUnionExternalExtension.ts`

- **U** 33 fn getParent — J/components/ComponentsCompactor.java:686: throws UnsupportedOperationException; no caller of getParent
  in ELK

### `components/ComponentsCompactorPortSides.ts`

- **U** 18 if[1] — J/graph/LGraphUtil.java:844-907: port sides of external dummies are N/E/S/W

### `intermediate/SelfLoopPortRestorer.ts`

- **U** 50 if[1] — J/intermediate/SelfLoopPreProcessor.java:99-103; SelfLoopPortRestorer.java:65: ports are hidden only when the
  order is not fixed, so ORIGINAL_PORT_CONSTRAINTS is UNDEFINED/FREE/FIXED_SIDE

### `intermediate/SelfLoopPreProcessor.ts`

- **U** 77 binary-expr[1] — J/intermediate/SelfLoopPreProcessor.java:90,100: 7h: nestedGraph is non-null only for compound nodes

### `intermediate/compaction/EdgeAwareScanlineConstraintCalculation.ts`

- **S** 170 cond-expr[0] — Sc5: cGraph without CNodes: min().orElseGet(0.0) (EdgeAwareScanlineConstraintCalculation.java:177-196)
- **U** 40 switch[2] — J/intermediate/compaction/HorizontalGraphCompactor.java:83-100: LGraphToCGraphTransformer (built first)
  already throws for a style other than ORTHOGONAL/SPLINES
- **U** 184 if[1], 250 if[1] — J/intermediate/compaction/LGraphToCGraphTransformer.java: CNode origins are LNode or
  VerticalSegment only
- **U** 223 if[1] — J/intermediate/compaction/LGraphToCGraphTransformer.java:242-316,403-404: a grouped VerticalSegment always has
  ignoreSpacing.up or .down set

### `intermediate/compaction/HorizontalGraphCompactor.ts`

- **U** 63 if[0] — J/GraphConfigurator.java:273-275: the processor joins the plan only when the strategy is not NONE
- **U** 108 switch[5] — J/intermediate/compaction/HorizontalGraphCompactor.java:127-130: default arm after NONE is excluded

### `intermediate/compaction/LGraphToCGraphTransformer.ts`

- **S** 155 if[1] — Sc29: comment box without any edge (LGraphToCGraphTransformer.java:136-137)
- **S** 278 if[0] — Sc30: vertical segment of a hyperedge with more distinct sources than targets
  (LGraphToCGraphTransformer.java:419-425)
- **S** 393 fn anonymous_23 — Sc31: self loop with a label under post compaction (LGraphToCGraphTransformer.java:487-498)
- **S** 414 switch[2,3] — Sc32: external port dummies on NORTH and SOUTH (LGraphToCGraphTransformer.java:641-655)
- **U** 29 fn anonymous_0, 31 fn anonymous_1 — J/compaction/oned/CNode.java:108: toString delegates used by the debug SVG only
- **U** 414 switch[4] — J/graph/LGraphUtil.java:844-907: EXT_PORT_SIDE is N/E/S/W
- **X** 192 switch[2] — J/GraphConfigurator.java:273-274: edgeRouting UNDEFINED passes the plan test; the Java throws
  IllegalStateException (not recordable)

### `intermediate/compaction/LGraphToCGraphTransformerOrthogonal.ts`

- **X** 60 binary-expr[1] — J/intermediate/compaction/LGraphToCGraphTransformer.java:286-287: NullPointerException on a target
  without CNode

### `intermediate/compaction/LGraphToCGraphTransformerSplines.ts`

- **U** 57 if[0] — J/intermediate/compaction/LGraphToCGraphTransformer.java:482: the caller filters empty splines
- **U** 73 if[1], 76 if[1], 96 if[0] — J/intermediate/compaction/LGraphToCGraphTransformer.java:540-570: after the first iteration
  lastSeg is non-straight or the last segment, and i < size, so the else arms and the null needle cannot occur

### `intermediate/compaction/NetworkSimplexCompaction.ts`

- **S** 83 if[0] — Sc34: constraint between nodes of one group: precalculated spline constraints (alg.common
  OneDimensionalCompactor.java:439-450) under EDGE_LENGTH (probe)
- **S** 279 if[0] — Sc33: inverted-port edge whose vertical segment shares the node group (NetworkSimplexCompaction.java:250-290)
- **U** 88 if[1] — J/intermediate/compaction/HorizontalGraphCompactor.java:151-153: EDGE_LENGTH compacts LEFT only; the vertical
  arm needs another caller
- **U** 198 if[1] — J/intermediate/compaction/LGraphToCGraphTransformer.java: CNode origins are LNode or VerticalSegment only

### `intermediate/compaction/VerticalSegment.ts`

- **U** 71 if[1] — J/core Core.melk:675; MapPropertyHolder.java:50-73: JUNCTION_POINTS default is a cloned empty chain, never null
- **U** 148 fn toString — J/intermediate/compaction/VerticalSegment.java: debug toString

### `intermediate/loops/SelfHyperLoop.ts`

- **U** 167 fn hasSLPortsOnSide — J/intermediate/loops/SelfHyperLoop.java:192: no caller in ELK

### `intermediate/loops/SelfHyperLoopLabels.ts`

- **S** 96 fn applyLabelManagement — Sc13: LabelPlacer.manageLabels (SelfHyperLoopLabels.java applyLabelManagement)

### `intermediate/loops/SelfHyperLoopLabelsAlignment.ts`

- **U** 39 fn anonymous_3, 40 if[0,1], 48 fn ordinal, 56 fn toString, 60 fn compareTo —
  J/intermediate/loops/SelfHyperLoopLabels.java: Java Enum API of Alignment has no caller

### `intermediate/loops/SelfLoopEdge.ts`

- **S** 71 if[0], 79 fn getLabelSide — Sc12: inline edge labels (SelfLoopEdge.java)

### `intermediate/loops/SelfLoopHolder.ts`

- **U** 70 if[0] — J/intermediate/SelfLoopPreProcessor.java:55: 7h: layerless nodes are NORMAL before P1 except hierarchical port
  dummies of nested graphs

### `intermediate/loops/SelfLoopType.ts`

- **U** 45 fn anonymous_3, 46 if[0,1], 54 fn ordinal, 62 fn toString, 66 fn compareTo, 83 switch[4] —
  J/intermediate/loops/SelfLoopType.java:60-100: Java Enum API / default of a switch over a non-empty side set of at most four
- **X** 79 if[0] — J/intermediate/loops/SelfLoopType.java: IllegalArgumentException for UNDEFINED sides; sides are assigned before
  the call

### `intermediate/loops/ordering/PortRestorer.ts`

- **S** 19 fn reverseList, 149 if[0], 167 switch[1] — Sc19: node-level selfLoopOrdering REVERSE_STACKED on a node with one-sided
  loops (PortRestorer.java:120-160)
- **S** 210 if[0] — Sc18: one-sided STACKED loop with sorted net flows [<=0, >0, >0] (PortRestorer.java:174-178)
- **U** 167 switch[3], 224 if[0], 303 if[1] — J/intermediate/loops/ordering/PortRestorer.java:161-190,257-275: assert-false
  default; second split-index test repeats the first (see note below); three-sided loops lack one side

### `intermediate/loops/ordering/PortRestorerAddMode.ts`

- **U** 30 fn anonymous_3, 31 if[0,1], 39 fn ordinal, 43 fn name, 47 fn toString, 51 fn compareTo —
  J/intermediate/loops/ordering/PortRestorer.java: Java Enum API of AddMode has no caller

### `intermediate/loops/ordering/PortRestorerPortList.ts`

- **U** 171 if[1], 173 if[1] — J/intermediate/NorthSouthPortPreprocessor.java:566-593: a dummy of a port carries only ports
  created for it, each with an edge (the same-side loop dummy needs a plan without SELF_LOOP_PREPROCESSOR, which has no
  PortRestorer)

### `intermediate/loops/ordering/PortRestorerPortSideArea.ts`

- **U** 31 fn anonymous_3, 32 if[0,1], 40 fn ordinal, 44 fn name, 48 fn toString, 52 fn compareTo —
  J/intermediate/loops/ordering/PortRestorer.java: Java Enum API of PortSideArea has no caller

### `intermediate/loops/ordering/PortSideAssigner.ts`

- **S** 145 if[1], 152 if[1] — Sc20: loop with hidden and visible ports in both halves (PortSideAssigner.java:185,193)
- **U** 25 switch[3] — J/intermediate/loops/ordering/PortSideAssigner.java:39-60: assert false default over the three strategies
- **U** 81 if[1] — J/intermediate/loops/ordering/PortSideAssigner.java:99-110: else of "north <= south" is "south < north" for
  ints

### `intermediate/loops/ordering/PortSideAssignerTarget.ts`

- **U** 92 fn anonymous_19, 93 if[0,1], 116 fn ordinal, 120 fn name, 124 fn toString, 128 fn compareTo —
  J/intermediate/loops/ordering/PortSideAssigner.java: Java Enum API of Target has no caller

### `intermediate/loops/routing/LabelPlacer.ts`

- **S** 46 if[0], 341 fn manageLabels, 355 switch[0,1,2,3] — Sc13: label manager on loops of every alignment
  (LabelPlacer.java:46-48,341-370)
- **S** 82 if[1] — Sc14: SEQUENCED with labelled loops on SOUTH only (LabelPlacer.java:123-130)
- **S** 100 switch[4], 306 fn assignFourSidesSideAndAlignment, 318 binary-expr[0,1], 318 if[0,1] — Sc15: labelled FOUR_SIDES loop
  (LabelPlacer.java:118-120,246-262)
- **S** 157 if[0] — Sc16: labelled one-sided WEST loop: rightmost port above the leftmost (LabelPlacer.java:158-163)
- **S** 272 if[0], 280 if[0], 292 if[0] — Sc12: inline labels on opposing / three-sided loops (LabelPlacer.java:218-240)
- **U** 16 cond-expr[0] — J/intermediate/loops/routing/LabelPlacer.java:191-196: Integer.compare equal arm: loops of one holder
  own disjoint ports, so leftmost ids differ
- **U** 100 switch[5], 151 switch[4], 249 if[1], 277 if[1], 355 switch[4], 397 switch[4] —
  J/intermediate/loops/routing/LabelPlacer.java: assert-false defaults and else arms of exhaustive side tests
- **X** 95 if[0], 423 if[0] — J/intermediate/loops/routing/LabelPlacer.java: switch on a null type / alignment:
  NullPointerException

### `intermediate/loops/routing/OrthogonalSelfLoopRouter.ts`

- **S** 158 if[0], 164 if[0], 343 if[0], 362 binary-expr[1], 362 if[0], 366 binary-expr[1,2], 366 cond-expr[0], 375 fn
  reserveInlineLabelSpace, 376 if[0,1], 378 if[0,1], 408 fn adjustVectorForLabelSide, 409 switch[0,1,2,3] — Sc12: inline labels
  (OrthogonalSelfLoopRouter.java:104-107,156-158,360-377)
- **U** 25 if[0] — CoreOptions SPACING_EDGE_LABEL default: spacing options have non-null defaults
- **U** 178 switch[4], 271 switch[4], 386 switch[4] — J/intermediate/loops/routing/OrthogonalSelfLoopRouter.java: assert false
  over the four port sides

### `intermediate/loops/routing/OrthogonalSelfLoopRouterEdgeRoutingDirection.ts`

- **U** 22 fn name, 26 fn toString — J/intermediate/loops/routing/OrthogonalSelfLoopRouter.java: Java Enum API of
  EdgeRoutingDirection has no caller

### `intermediate/loops/routing/OrthogonalSelfLoopRouterSlotPositions.ts`

- **U** 109 switch[4] — J/intermediate/loops/routing/OrthogonalSelfLoopRouter.java: assert false over the four port sides

### `intermediate/loops/routing/PolylineSelfLoopRouter.ts`

- **X** 91 if[0] — J/intermediate/loops/routing/PolylineSelfLoopRouter.java: Iterator.next() past the end: NoSuchElementException

### `intermediate/loops/routing/RoutingDirector.ts`

- **U** 13 cond-expr[0] — J/intermediate/loops/routing/RoutingDirector.java:36-37: Integer.compare equal arm: ports of a loop are
  distinct
- **U** 70 switch[5], 179 switch[4] — J/intermediate/loops/routing/RoutingDirector.java: assert-false defaults over the loop types
  / missing side
- **X** 65 if[0], 280 if[0], 294 if[0] — J/intermediate/loops/routing/RoutingDirector.java:63,288,295: switch on null type;
  Stream.min/max().get() on an empty side

### `intermediate/loops/routing/RoutingSlotAssigner.ts`

- **S** 96 if[1] — Sc17: labelled loop followed by an unlabelled one (RoutingSlotAssigner.java:99-103)
- **U** 120 if[0] — J/intermediate/loops/routing/RoutingSlotAssigner.java:103-104,125: sole caller checks both labels first

### `intermediate/loops/routing/SplineSelfLoopRouter.ts`

- **U** 37 if[0] — CoreOptions SPACING_EDGE_LABEL default: spacing option has a non-null default

### `intermediate/wrapping/BreakingPointInserter.ts`

- **S** 266 if[1] — Sc6: improveCuts on a one-layer graph (BreakingPointInserter.java:305)

### `intermediate/wrapping/BreakingPointInserterBPInfo.ts`

- **U** 56 fn toString — J/intermediate/wrapping/BreakingPointInserter.java: debug toString

### `intermediate/wrapping/BreakingPointInserterCut.ts`

- **X** 57 if[0] — J/intermediate/wrapping/BreakingPointInserter.java: IllegalStateException: offset() runs only after assigned =
  true (improveCuts)

### `intermediate/wrapping/BreakingPointProcessor.ts`

- **S** 98 if[1] — Sc9: empty breaking-point layer: a cut crossed by no edge (BreakingPointProcessor.java:151; interactive
  layering probe)
- **S** 322 if[1], 349 if[0] — Sc8: in-layer dummies between long-edge dummies (BreakingPointProcessor.java:350-358,380-383)

### `intermediate/wrapping/BreakingPointRemover.ts`

- **S** 43 if[1] — Sc7: edge crossing two cuts: bpi.next != null (BreakingPointRemover.java:68-72;
  BreakingPointInserter.java:215-219)
- **S** 66 switch[0,1], 125 fn joinSplineRoutes, 137 fn anonymous_5 — Sc10: SPLINES / POLYLINE arms
  (BreakingPointRemover.java:105-146)
- **U** 115 binary-expr[1,2], 115 if[1], 159 if[0] — Core.melk:675; MapPropertyHolder.java:50-73: JUNCTION_POINTS is never null,
  so the merge always runs and addNullSafe never sees null

### `intermediate/wrapping/CuttingUtils.ts`

- **S** 127 if[0] — Sc11: wrapped edge with negative edge.thickness (CuttingUtils.java:105-110)
- **U** 22 fn constructor — J/intermediate/wrapping/CuttingUtils.java: private constructor of a static utility class
- **X** 105 if[0] — J/intermediate/wrapping/CuttingUtils.java: IndexOutOfBoundsException from layers.get(i)

### `intermediate/wrapping/GraphStats.ts`

- **S** 246 if[0] — Sc4: NORTH_SOUTH_PORT dummy feeding a layer node (GraphStats.java:249)
- **S** 298 if[1] — Sc3: forbidden index outside 1..size-1 (GraphStats.java:298-302)
- **U** 25 fn subList, 26 binary-expr[0,1,2], 26 if[0,1], 99 fn getApproximateLayerWidth, 104 fn getApproximateLayeringWidth, 109
  fn getApproximateChunkBasedLayeringWidth, 110 if[0,1], 124 fn getApproximateLayerHeight, 129 fn getApproximateLayeringHeight,
  134 fn getApproximateChunkBasedLayeringHeight, 135 if[0,1], 207 fn determineChunkWidth, 208 fn anonymous_20, 210
  cond-expr[0,1], 210 fn anonymous_21, 260 fn determineChunkHeight, 261 fn anonymous_29, 263 cond-expr[0,1], 263 fn
  anonymous_30, 319 fn getCutsAllowed, 320 if[0,1] — J/intermediate/wrapping/GraphStats.java:86-130,200-270,322:
  getApproximate*, determineChunk*, getCutsAllowed have no caller in ELK (grep over plugins and tests)
- **U** 161 if[1], 169 if[1], 227 if[0], 284 if[0], 306 if[1] — J/intermediate/wrapping/GraphStats.java:130-160,281-324: caches
  filled by the single call per GraphStats (MSD: getWidths before getHeights; initCutAllowed guarded by its callers;
  cutsAllowed[0] throws first on zero layers)
- **X** 16 if[0], 36 if[0] — J/intermediate/wrapping/GraphStats.java: AIOOBE / NoSuchElementException on a graph without layers
  (MSD/ARD at BreakingPointInserter; not recordable)

### `intermediate/wrapping/ICutIndexCalculator.ts`

- **S** 36 if[1] — Sc2: MANUAL strategy without wrapping.cutting.cuts (ICutIndexCalculator.java:52-58)

### `intermediate/wrapping/MSDCutIndexHeuristic.ts`

- **X** 83 if[0] — J/intermediate/wrapping/MSDCutIndexHeuristic.java:43-47: widthAtIndex[0] on a graph without layers: AIOOBE (not
  recordable)

### `intermediate/wrapping/SingleEdgeGraphWrapper.ts`

- **S** 23 fn listGet, 24 binary-expr[0,1], 24 if[1], 139 if[0], 143 if[1], 163 binary-expr[0,1], 173 if[0,1], 181
  binary-expr[0,1] — Sc1: validifyIndexesLookingBack past its early returns (SingleEdgeGraphWrapper.java:150-213)
- **S** 58 if[0] — Sc5: graph without layers (SingleEdgeGraphWrapper.java:71)
- **S** 69 if[0] — Sc2: desired aspect ratio above the layer count (SingleEdgeGraphWrapper.java:82-86)
- **U** 80 if[1] — J/intermediate/wrapping/{ARD,MSD}CutIndexHeuristic.java:63,35; ICutIndexCalculator.java:61: every calculator
  answers guaranteeValid() = false
- **X** 24 if[0] — J/intermediate/wrapping/SingleEdgeGraphWrapper.java: List.get out of range

## Counts

34 scenario ids (tier 1: 26, tier 2: 4, tier 3: 4), 67 rows. Branches: S 85 / J 36 / U 142 / X 21 = 284; functions: S 12 / J 7 /
U 69 = 88. Items: S 97, J 43, U 211, X 21; total 372.


## T20 outcome (2026-11-10, appended)

64 `sites` rows recorded for 31 of the 34 scenarios (`layered-loops.json` 16,358,809 bytes); all replay with no mismatch
(`src/alg/layered/LayeredLoopsSites.test.ts`). Coverage re-measured over `LayeredLoopsVectors.test.ts` plus the sites file.
Recipes that changed to reach their arm are in the journal (T20 rows); extra rows: `Sc21 loops4a/seed1`, `loops4b/seed1`,
`Sc33 invertedPorts/northToEast`.

| Scenario | Outcome |
| -------- | ------- |
| Sc1–Sc11, Sc13–Sc21, Sc23, Sc24, Sc27, Sc29–Sc33 | every listed TS site taken |
| Sc12 | 22 of 23; `OrthogonalSelfLoopRouter.ts:378 if[1]` is U: an inline label sits on the middle occupied side and every corner transition of a three-sided or opposing loop touches it (`LabelPlacer.java:262-285`, `OrthogonalSelfLoopRouter.java:410-415`) |
| Sc22 | 3 of 6; `SplineEdgeRouterSegments.ts:137 if[1]` stays S without a recipe (`SplineEdgeRouter.java:395-404`: no graph found; follow-up); `:246 if[1]`, `:257 if[1]` are X (the Java throws `IllegalArgumentException`) |
| Sc25 (W10: `DotDebugUtil.ts:211`, `JsonDebugUtilGraph.ts:191`) | no row; U: a same-side loop dummy with an `LEdge` origin exists only after `DummySelfLoopProcessor`, which no plan runs (no caller at the pin), and logging happens only inside a provider layout, whose plan hides loops in `SELF_LOOP_PREPROCESSOR` (`DotDebugUtil.java:191`, `JsonDebugUtil.java:643`) |
| Sc24 (W10: `EndLabelPreprocessor.ts:145`) | reached by `sites/EndLabelPreprocessor/sameSideLoopDummy` |
| Sc26 | 10 of 11; `ComponentsCompactor.ts:385 if[1]` is U: `EXT_PORT_SIDE` of an external dummy is always one of the four sides |
| Sc28 | no row; U for this mission: the two comparator arms need the sort to compare an earlier hull point first (hulls of 32+ points, out of the size budget), the two degenerate-hull arms were not produced by any probe (stacked components, ladders, trees of 15–63 nodes, diamonds of 36 and 81) |
| Sc34 | no row; U: `NetworkSimplexCompaction.ts:83` needs a predefined constraint inside one group, and spline vertical segments have no group parent (`VerticalSegment.java:99-101`) |
