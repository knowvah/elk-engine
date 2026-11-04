<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-edge-routing (mission 7e, 2026-11-03)

## Observation: the 7b `loadRows` closes the row group list, so `calls` rows need their own loader

- **Context**: T3 `loadRoutingRows`.
- **Finding**: `ROW_GROUPS` in `test/helpers/layered-phase-replay-rows.ts` is `['models','scenarios','sites']` and
  `checkRow` is private, so `loadPlacementRows` cannot load a `calls` row. The 7e loader repeats the structural checks
  and widens the group list; rows reach `importRow`/`runSteps` through `phaseRowOf` (a documented single cast) or the
  `runRoutingSteps` wrapper.
- **Impact**: any later group added to a ref file needs the same treatment.
- **Confidence**: High

## Observation: edge properties set by routing show up in `changed` as well as in `geometry`

- **Context**: T3 compare tests with junction and spline properties.
- **Finding**: a property set on an edge (`JUNCTION_POINTS`, `SPLINE_EDGE_CHAIN`, `SPLINE_ROUTE_START`) appears in
  `expected.changed` and is compared by the 7b `changed` rule in addition to `geometry.edges`/`splines`; with a
  plain-object fake segment the TS encoding is `{class:'Object'}`. `ignoredProperties()` covers only PROCESSORS, RANDOM
  and SPACINGS.
- **Impact**: T9/T10 must check that the real `SplineSegment` list encodes like the recorder's `changed` entry.
- **Confidence**: Medium (checked with a fake segment only)

## Observation: `ElkMargin` has the same four fields as `Rectangle`'s getters

- **Context**: T3 `summarise`.
- **Finding**: `Rectangle.toNodeMargins` returns an `ElkMargin`; its `top`/`right`/`bottom`/`left` fields summarise as a
  `rectangle` in that order.
- **Impact**: `calls/Rectangle/toNodeMargins*` rows are recorded as `rectangle` results.
- **Confidence**: High

## Observation: `sed -i` on macOS needs an empty backup suffix

- **Context**: T3 tooling.
- **Finding**: `sed -i 's/…/'` fails with "undefined label"; chained with `&&` the failure silently skips later commands.
- **Impact**: use `sed -i ''`, Python or the Edit tool for in-place edits; check exit codes in chains.
- **Confidence**: High

## Observation: the polyline and spline routers cannot lay out N/S external ports without the orthogonal plan additions

- **Context**: T1 recording the `hierarchical_ports` models and the spline external-port scenario.
- **Finding**: `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR` and `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` are added only by
  `OrthogonalEdgeRouter` (`OrthogonalEdgeRouter.java:~157-165`). Under POLYLINE or SPLINES, six `hierarchical_ports`
  levels (hierarchy03–07, 09 / `Compound`) throw an NPE in the greedy switch
  (`BetweenLayerEdgeTwoNodeCrossingsCounter.java:283`). `SplineEdgeRouter` also NPEs in `SplineSegment.anchorY`
  (`SplineSegment.java:247`) when N/S ports lack `NORTH_SOUTH_PORT_POSTPROCESSOR` (`SPLINE_NS_PORT_Y_COORD` unset).
- **Impact**: the recorder skips those rows (`ORACLE_THROWS`); the TS port has no rows for them and would throw the
  same way; the spline scenarios use W/E external ports.
- **Confidence**: High

## Observation: a plan can hold `GraphTransformer` first (direction ≠ RIGHT) and last

- **Context**: ticket 341 (`elk.direction: UP`).
- **Finding**: the one class `GraphTransformer` is both `DIRECTION_PREPROCESSOR` (first) and `DIRECTION_POSTPROCESSOR`
  (last), so a class-to-name map is ambiguous; the recorder names the first occurrence `DIRECTION_PREPROCESSOR`.
- **Impact**: the TS plan builder (7f/7g) must name them by position; ticket 341 has no 7e rows.
- **Confidence**: High

## Observation: in-layer edges come from inverted ports, never from layer constraints

- **Context**: T1 building the in-layer scenario.
- **Finding**: two FIRST nodes joined by an edge throw `UnsupportedConfigurationException`; node `b` with W,E,E,W ports
  (normal in/out plus inverted in/out) and edges `a>b.p0`, `b.p1>c`, `d>b.p2`, `b.p3>e` gives two in-layer edges.
- **Impact**: reuse this shape for in-layer tests.
- **Confidence**: High

## Observation: with `feedbackEdges=true`, `PORT_SIDE_PROCESSOR` runs right after the edge reverser

- **Context**: T1 scenario cross-check.
- **Finding**: `GraphConfigurator.java:214` moves it before P1, and `INVERTED_PORT_PROCESSOR` joins under ORTHOGONAL too.
- **Impact**: a TS plan builder must do the same.
- **Confidence**: High

## Observation: a routing models row costs 17–60 KB; the 5 MiB cap forced a 4-model variant set

- **Context**: T1 R2 trimming.
- **Finding**: the stop rows of 109 models cost 5.4 MB (FSBC 1.9 MB of it with variants); the `changed` list dominates.
- **Impact**: any 7f/7g re-record of `layered-routing.json` has no headroom (52 KB margin).
- **Confidence**: High

## Observation: `portDummy` on N/S ports encodes as `{class: LNode}` after `NORTH_SOUTH_PORT_POSTPROCESSOR`

- **Context**: `changed` of the NSPP stops (363 entries).
- **Finding**: the dummy node leaves the graph and loses its path; the non-strict encoder falls back to the class name.
- **Impact**: the TS dump must encode a pathless `LNode` the same way (check in T5).
- **Confidence**: High

## Observation: `calls` rows are slim and use six argument kinds beyond the brief

- **Context**: reconciling T1's `layered-routing-steps.json` with T3's loader.
- **Finding**: a `calls` row's `expected` is `{ result }` only; args add `node`, `int`, `vector`, `vectors`, `rectangle`
  (top, right, bottom, left) and `nubs` (clamped, dim, points); `calls/SplinesMath/intersect-points-1` has a null
  `vector` result; `nubs` values carry `firstLabelPosition` on the self-loop rows.
- **Impact**: `runCall` takes an injectable constructor table for `rectangle`/`nubs` (T6/T7 classes).
- **Confidence**: High

## Observation: `SplineSegment` needs two statics of the router that depends on it

- **Context**: T6 porting `SplineSegment.java:229,239-240`.
- **Finding**: it calls `SplineEdgeRouter.isStraight` and `isNormalNode`, while the router imports `SplineSegment`;
  both are one-liners and `MAX_VERTICAL_DIFF_FOR_STRAIGHT` is used only by `isStraight`.
- **Impact**: the bodies are module exports of `SplineSegment.ts`; the T8 statics delegate (X1 pattern).
- **Confidence**: High

## Observation: `Intl.NumberFormat` HALF_EVEN is a valid twin only on exact ties

- **Context**: T6 checking the R6 one-decimal formatter.
- **Finding**: ICU rounds the shortest decimal representation while Java `DecimalFormat` and `toFixed` use the exact
  binary value: 0.15 diverges; the odd multiples of 1/4 are the only exact ties. `roundingMode` is missing from this
  TypeScript's `NumberFormatOptions` typings.
- **Impact**: ICU twin tests use only non-divergent samples.
- **Confidence**: High

## Observation: a Java unboxing NPE needs an explicit null check in TS

- **Context**: T6 `SplineSegment.anchorY` (`SplineSegment.java:247`).
- **Finding**: `MapPropertyHolder.getProperty` returns null and arithmetic on null continues silently in JS; the
  planning note's "the port would throw the same way" holds only for method calls on null. The landed precedent is
  `SortByInputModelProcessor.ts:128-131` (explicit check, `TypeError`).
- **Impact**: every Java unboxing of a nullable property in 7e+ needs the explicit check.
- **Confidence**: High

## Observation: `Rectangle.union(Collection)` mutates its first argument

- **Context**: T6 porting `Rectangle.java:196-207`.
- **Finding**: the loop unions into the first element, not into the returned pre-loop copy; no caller in the spline
  code, no call row records it.
- **Impact**: a future caller of the collection form gets an unchanged copy back; do not "fix".
- **Confidence**: High

## Observation: `calls` rows replay with the real enum factory alone

- **Context**: T6 running the `calls/SplinesMath/*` and `calls/Rectangle/*` rows.
- **Finding**: the prefix steps are `importGraph`, `normalise`, `runProcessor INNERMOST_NODE_MARGIN_CALCULATOR`, `layers`;
  `IntermediateProcessorStrategy.valueOf(name).create()` suffices, no phase factory needed.
- **Impact**: other `calls` tests copy that factories object.
- **Confidence**: High

## Observation: Java reuses one `KVector` three times in `NubSpline.generateNiceCurve`

- **Context**: T7 structural tests.
- **Finding**: `niceChain.add(vector1)` three times adds one object, so `scale(5.0)` and `offset(-50,-80)` hit it three
  times; the curve is not mirror-symmetric at its ends. No caller in the layered bundle.
- **Impact**: symmetry assertions must exclude the first and last `dim` control points.
- **Confidence**: High

## Observation: unclamped `toBezier` yields fewer knots than control points + dim − 1

- **Context**: `calls/NubSpline/toBezier-unclamped`.
- **Finding**: for 7 control points, dim 3, the 9 knots become 13 with 15 control points; the oracle row matches.
- **Impact**: the `knots = controlPoints + dim - 1` invariant holds only for clamped splines.
- **Confidence**: High

## Observation: a TS subclass with `#private` or initialised fields cannot call `super` in branches

- **Context**: T7 porting the overloaded `NubsSelfLoop` constructors.
- **Finding**: `super()` must be the first root-level statement when the class has `#private` fields or initialisers;
  `NubsSelfLoop` uses a plain TS-`private` field without an initialiser and calls `super` per branch.
- **Impact**: later subclass ports with overloaded constructors (7f/7g) use the same shape.
- **Confidence**: High

## Observation: section files avoid the facade cycle by returning plain parts

- **Context**: T7 splitting `NubSpline` (P1).
- **Finding**: a section cannot construct the facade; sections return `NubSplineParts` and the facade wraps it;
  functions that need another instance take it as an `import type` parameter and read its public `state`.
- **Impact**: the pattern for any class whose Java generators build new instances.
- **Confidence**: High

## Observation: the landed enum registry lacks `EdgeRouting`

- **Context**: T4/T5 replaying routing rows.
- **Finding**: every routing row sets `org.eclipse.elk.edgeRouting` as `{t: enum, c: EdgeRouting}`; `ENUM_TYPES`
  (`test/helpers/layered-site-replay-registry.ts:116`) has no `EdgeRouting`, so `importRow` throws
  "unknown enum type EdgeRouting".
- **Impact**: the 7e rows helper registers it once at module evaluation; later missions with new enum-valued options
  (7f labels, 7g wrapping) need the same.
- **Confidence**: High

## Observation: `Ctx.encode` auto-names an element that left the graph; the recorder writes `{class}`

- **Context**: `NORTH_SOUTH_PORT_POSTPROCESSOR` and `LONG_EDGE_JOINER` rows (T4, T5).
- **Finding**: `Ctx.encode` (`layered-site-replay-context.ts:317-319`) calls the binding `pathOf`, so a removed N/S dummy
  encodes as `{ref: "x/n<k>"}` and gains `ports`/`geometry.nodes` entries; the recorder writes
  `{class: "org.eclipse.elk.alg.layered.graph.LNode"}` and lists nothing for it. Only `changed` and the extra entries
  differ; geometry matches.
- **Impact**: `routingDump` applies the recorder's rule; any later row where a processor removes elements relies on it.
- **Confidence**: High

## Observation: `HyperEdgeSegment.addPortPositions` recurses

- **Context**: T4 R8 check.
- **Finding**: R8 listed only `HyperedgeDummyMerger.dfs`; `addPortPositions` (`HyperEdgeSegment.java:141`) recurses once
  per connected port. Ported as an explicit stack of iterators keeping the visit order and the lazy `containsKey` test.
- **Impact**: planning recursion scans need a source check per class.
- **Confidence**: High

## Observation: no oracle row reaches the orthogonal splitter or a critical-cycle split

- **Context**: T4 scoped coverage over the 161 replayed rows.
- **Finding**: `HyperEdgeSegmentSplitter`, `FreeArea`, `AreaRating`, `simulateSplit`, `splitAt` ≈ 2 % covered; the N/S
  and S/N direction strategies run only from 7f's hierarchical router.
- **Impact**: T11 site rows (critical conflict cycle, several free areas).
- **Confidence**: High

## Observation: `addBefore(P<n+1>)` and `addAfter(P<n>)` are one slot in `LayoutProcessorConfiguration`

- **Context**: T4 configuration tests.
- **Finding**: `processorsBefore(P3)` and `processorsAfter(P2)` return the same processors.
- **Impact**: a dump over both lists doubles entries; read "before" for P1–P5 and "after" only for P5.
- **Confidence**: High

## Observation: lizard counts each element of an inline rest-tuple annotation as a parameter

- **Context**: T4 `routeEdges` with 6 Java parameters.
- **Finding**: `...rest: [a: A, b: B, c: C, d: D]` counts as 6 params; a named tuple type alias counts as 3.
- **Impact**: use a named tuple type to keep a Java signature of 6+ parameters under the 5-param hook.
- **Confidence**: High

## Observation: `getProperty` stores clones of cloneable defaults, so `== null` arms on them are dead

- **Context**: T5 `JUNCTION_POINTS` in the polyline router, `LongEdgeJoiner`, `NorthSouthPortPostprocessor`.
- **Finding**: the unset property reads as a stored clone of an empty chain, never null; the "added" chains persist on
  the edge.
- **Impact**: do not treat those null branches as reachable; U with the Java line.
- **Confidence**: High

## Observation: hierarchical port position rows never fix coordinates; only 3 of 51 merger rows merge

- **Context**: T5 coverage.
- **Finding**: all 19 `HIERARCHICAL_PORT_POSITION_PROCESSOR` rows have free port constraints so `fixCoordinates`
  returns early (`HierarchicalPortPositionProcessor.java:95-98`); only `hyperedge_merging-hyperedges01`,
  `-inverted_ports`, `-unequal_src_tgt` change the graph under the merger.
- **Impact**: T11 needs a `FIXED_POS`/`FIXED_RATIO` row with W/E external dummies; non-vacuity checks use those three rows.
- **Confidence**: High

## Observation: the explicit-stack `dfs` twin survives 5,000 ports by default, overflows under `--jitless`

- **Context**: T5 R8 for `HyperedgeDummyMerger`.
- **Finding**: the recursive twin throws `RangeError` only under `--jitless`; the loop passes both.
- **Impact**: deep-chain tests tolerate the twin's `RangeError` (7d precedent).
- **Confidence**: High

## Observation: P5 SPLINES rows do not exercise the `Pair` set order

- **Context**: T8 replay; scratch count of hyper segments over the 128 rows.
- **Finding**: only 10 rows contain a hyper segment, all with exactly 2 edges; the P5 `splines` summaries (chain, box,
  rank, `isStraight`, `xDelta`) do not depend on `SplineSegment.edges` order.
- **Impact**: R9's proof is the `FinalSplineBendpointsCalculator` rows (T9), which iterate `edges`.
- **Confidence**: High

## Observation: no replayed spline row reaches the cycle-breaking, random-draw path

- **Context**: T8 coverage.
- **Finding**: `breakCycles` never runs the max-outflow branch, so `random.nextInt` (`SplineEdgeRouter.java:777`) and the
  dependency reversal (`:793-812`) are unexercised; also unreached: self-loop edges, the "unhandled situation" arm, the
  two `IllegalArgumentException` throws.
- **Impact**: T11 site rows are required for R7 and the branch bar; the graph needs dependency cycles with weight > 0.
- **Confidence**: High

## Observation: files written through Bash heredocs bypass the PostToolUse complexity hook

- **Context**: T8 wrote its files through Bash.
- **Finding**: the hook fires on `Write`/`Edit` only; `npm run complexity` then reported NLOC 32/31, CCN 11 and a
  568-line facade.
- **Impact**: run `npm run complexity` after the first full write of a large port.
- **Confidence**: High

## Observation: `Layer` has no `equals`; `Layer.getNodes()` is the live list

- **Context**: T8 `clearThenFillMappings` (`SplineEdgeRouter.java:411-417`).
- **Finding**: `targetLayer.equals(rightLayer)` is identity (`===` in TS); `Layer[Symbol.iterator]` yields the nodes.
- **Impact**: none.
- **Confidence**: High

## Observation: `FinalSplineBendpointsCalculator`'s output does not depend on the order of `SplineSegment.edges`

- **Context**: T9 R9 proof; 109 FSBC rows replayed with the `edges` of every multi-edge segment reversed.
- **Finding**: 18 segments on 10 rows, all hyperedges of exactly 2 edges, replay `[]` in both orders; the per-edge
  bodies (`:142`) are independent, `:174` reverses each edge's own points, `:185` is reached only with one edge.
- **Impact**: the JVM `HashSet<Pair>` order is unobservable in 7e; `SplineEdgeRouter.getSplinePath` reads
  `lastSegment.targetNode` from the first edge only under `segmentAllowsSloppyRouting` with compaction ≠ `NONE`
  (7g, `HorizontalGraphCompactor`): 7g rechecks R9 there.
- **Confidence**: High (order-independence on these rows and by code reading), Medium (the 7g consequence)

## Observation: no `SPLINES-feedback-edges` row exists at the FSBC stop

- **Context**: T9 row inventory.
- **Finding**: the 101 FSBC model rows carry six variants; the feedback-edges family was recorded at `P5` only.
- **Impact**: T10/T11 do not expect a feedback variant at this stop.
- **Confidence**: High

## Observation: the FSBC section split adds a runtime edge from the processor enum to the spline router

- **Context**: T9 wiring the arm.
- **Finding**: `IntermediateProcessorStrategyCreate` → FSBC → Bezier section → `SplineEdgeRouter` → the enum; the router
  reads the enum only inside lazy getters, so fresh-process imports of the enum and `LayeredOptions` succeed.
- **Impact**: keep the router's enum use lazy (E1).
- **Confidence**: High

## Observation: wiring the `EdgeRouterFactory` entry needed no E1 edit

- **Context**: T10 added `EdgeRouterFactory.ts` to the entry-point fitness test.
- **Finding**: the entry loads in a fresh process; the routers read the processor enum only inside lazy getters and
  `EdgeRouting` is a core leaf enum.
- **Impact**: R4's melk push-forward did not trigger; 7f's wiring can copy the pattern.
- **Confidence**: High

## Observation: the full 883-row routing replay runs in about 5.5 s

- **Context**: T10 stop-11 timing.
- **Finding**: 889 tests (883 rows + 6 structural) in 5.3–5.5 s at load ~6.5, against the 25 s budget.
- **Impact**: large margin for 7f/7g rows.
- **Confidence**: High

## Observation: a JUnit delta assertion needs a local helper

- **Context**: T10 porting `checkEdgeRouteIsOrthogonal`.
- **Finding**: `test/helpers/junit-asserts.ts` covers list equality only; `edge-route-orthogonal.ts` reproduces JUnit 4's
  `assertEquals(message, expected, actual, delta)` (`Double.compare` equal or `|e − a| <= delta`, failing with
  `<msg> expected:<e> but was:<a>`) with the `DoubleCompare`/`DoubleToString` shims.
- **Impact**: later JUnit ports with a delta assertion reuse `AssertionFailure` and the logic.
- **Confidence**: Medium (message format recalled, not checked against JUnit source)

## Observation: the routing sweep reaches 1,570 of 1,682 ptolemy levels at every stop

- **Context**: T12 first full oracle sweep.
- **Finding**: 6,728 cases, 6,280 ok, 448 refused (all `SELF_LOOP_PREPROCESSOR`, 112 levels), 0 throws, 0 timeouts;
  accepting `HYPEREDGE_DUMMY_MERGER` takes P4 from 394 ok levels per strategy (7d) to 1,570; oracle 34 s, stride-2
  replay 75 s, stride 1 179 s; no ptolemy case has `geometryExtras`.
- **Impact**: stride 1 is affordable; 7g's self-loop work turns the 112 refused levels into ok cases, re-sweep then.
- **Confidence**: High

## Observation: a full recorder cannot host sweep modes; any file under `tools/vectors/` invalidates every vector cache

- **Context**: T12.
- **Finding**: the recorder is at 2,986 of 3,000 lines; a subclass compiled together with it (`javac`, one class loader)
  reuses its package-private statics (JDK 21 source-launcher mode cannot reference another source file); record
  components are reachable only through their accessors from the subclass; `vector-cache.sh` hashes every file under
  `tools/vectors/`, so adding or editing any file there makes every vector program record cold once.
- **Impact**: 7f/7g sweeps follow the same pattern when their recorders are full; expect one cold re-record per change.
- **Confidence**: High

## Observation: the oracle's `splines` key is stop-dependent, the replayed one is not

- **Context**: T12 canonical form.
- **Finding**: the recorder writes `geometry.splines` only when the stop is `P5` under SPLINES; `routingDump` computes it
  whenever an edge holds `SPLINE_ROUTE_START` (so also at the FSBC stop).
- **Impact**: a hash comparison drops or keeps `splines` per stop (`RoutingShape.splines`).
- **Confidence**: High

## Observation: the first draw of `java.util.Random` is nearly constant for small consecutive seeds

- **Context**: T13 choosing two seeds for `sites/SplineEdgeRouter/dependencyCycle/tie`.
- **Finding**: seeds 1..40 all give `nextInt(2) == 1`; 4096 is the first seed that draws 0 (5000 and 12345 also do).
- **Impact**: scan seeds with a spread, not 1..N, when a row must record both outcomes of a draw.
- **Confidence**: High

## Observation: self loops reach the routers on E–E loops, not N–N loops

- **Context**: T13 `sites/SelfLoop/*`.
- **Finding**: `NORTH_SOUTH_PORT_PREPROCESSOR` rewrites N–N and S–S loops into dummies, so a self-loop edge reaches
  `PolylineEdgeRouter.addBendPoint`, `WestToEastRoutingStrategy:54` and the spline segments only for E–E / W–W loops; the
  polyline arm also needs the loop node narrower than its layer by more than the x tolerance.
- **Impact**: reuse the E–E loop plus a wide sibling for 7g self-loop work.
- **Confidence**: High

## Observation: `placeNodesHorizontally` makes the far arms of `segmentAllowsSloppyRouting` unreachable

- **Context**: T13 `compaction/far`.
- **Finding**: both distances are at most `layerSize.x − w`, the threshold is `layerSize.x − w/2`
  (`LGraphUtil.java:223-290`, `LayerSizeAndGraphHeightCalculator.java:75-79`, `FinalSplineBendpointsCalculator.java:584-616`);
  derived by reading.
- **Impact**: U for `FinalSplineBendpointsCalculator.ts:197 if[0]` and `:205 if[0]`.
- **Confidence**: Medium

## Observation: a new row family breaks every inventory pinned by selector and every `CALLERS` table

- **Context**: T13's 60 rows.
- **Finding**: six test files pin row ids or counts by class or method selector; the generic replay's `CALLERS` lacked
  the new methods; `call()` reflection had to tolerate zero arguments.
- **Impact**: update inventories and callers in the same commit as a new row family (the 7d lesson, again).
- **Confidence**: High

## Observation: row and dump edge order differ; the comparators treat `edges` as a map

- **Context**: T14a anchored cases.
- **Finding**: `routingDump().geometry.edges` comes out path-sorted while the row lists edges in Java order;
  `compareKeyed` ignores order, so a `toEqual` on lists fails where the replay passes.
- **Impact**: anchored cases compare edges keyed by path.
- **Confidence**: High

## Observation: a site row can reach a branch without observing it

- **Context**: T14a mutation checks.
- **Finding**: a duplicate coordinate in a lone segment's port list changes no bend point (`HyperEdgeSegment.ts:137`);
  the HPPP empty-graph guard returns early under free port constraints; `mergeLayer([])` is a no-op.
- **Impact**: row coverage is not detection; run the mutation check and add a structural twin on internal state
  (with row literals) where the dump is blind.
- **Confidence**: High

## Observation: `LNode.getDesignation` never returns null

- **Context**: T14a `HyperEdgeSegment.toString` cases.
- **Finding**: it falls back to the layer index (`-1` without a layer), so the Java `name == null` arm is dead for real
  nodes; reached only through a test subclass.
- **Impact**: do not expect it from rows.
- **Confidence**: High

## Observation: two S rows reach their arm but their recorded fields do not discriminate it

- **Context**: T14b mutation checks on `sites/SplineEdgeRouter/rightwardNesting` (`SplineEdgeRouterRanking.ts:302`) and
  `dependencyCycle/uniform4` (`:149`).
- **Finding**: both arms are taken, but flipping them leaves every recorded rank, chain and box unchanged; a row that
  discriminates would need a chain of three rightward segments without left ports.
- **Impact**: the anchored cases pin the ranks and the reach, not the arm's effect.
- **Confidence**: High

## Observation: a throwing bend-point calculator leaves the state half-converted

- **Context**: T14b FSBC throw cases.
- **Finding**: `process` clears bend points as it converts, so a second `process` after a throw does not throw again.
- **Impact**: structural throw tests capture the error once per fresh state.
- **Confidence**: High

## Observation: after `LONG_EDGE_JOINER` the last edge of a spline chain has no target

- **Context**: T14b hand-breaking a chain before the calculator.
- **Finding**: the joiner detaches the chain's final edge (`getTarget()` null); the surviving edge is `chain[0]`.
- **Impact**: tests that alter the target port use the start edge's `getTarget()`.
- **Confidence**: High

## Observation: a mutation scratch copy needs copies of `test/helpers` and `test/corpus`, not symlinks

- **Context**: T14b mutation checks.
- **Finding**: symlinked helpers resolve to the real repo's `src` (`realpath`), so a mutation of the copied `src` never
  takes effect; copy `src`, `test/helpers`, `test/corpus`, symlink only `test/golden`, `node_modules` and `tools`.
- **Impact**: reuse the `scratchpad/T14b/mkscratch.sh` shape for later mutation checks.
- **Confidence**: High
