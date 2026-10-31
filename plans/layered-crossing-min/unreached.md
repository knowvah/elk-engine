<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7c branches unreached by the oracle replay (T9, L4 under X5, C11)

Measured 2026-10-30 on `feature/layered-crossing-min` after T8 (`test(T8)`): one run of the generic order replay alone
with v8 coverage restricted to the 7c classes (test files excluded), 1-minute load 6.0 (T10's oracle sweep was
started in parallel; coverage is load-independent):

```bash
npx vitest run --coverage --coverage.include='src/alg/layered/p3order/**' \
  --coverage.include='src/alg/layered/intermediate/greedyswitch/**' \
  --coverage.include='src/alg/layered/intermediate/preserveorder/**' \
  --coverage.include='src/alg/layered/intermediate/<each of the eight C2 processors>*.ts' \
  --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text \
  --coverage.reportsDirectory=<scratch> src/alg/layered/LayeredOrderVectors.test.ts
```

751 tests pass (746 rows + 5 count checks). Totals over the 77 files the include list matches: statements 81.91 %,
branches 73.94 % (1,101/1,489), functions 85.08 % (502/590), lines 81.97 %; the threshold error the run prints reflects
the restricted include list. 388 branches and 88 functions stay untaken. The include list already leaves out the 7b
processors, the staged files and `IntermediateProcessorStrategy` (its throwing arms are X). Every untaken site appears
exactly once below (branch arms as v8 numbers them: `if[0]` the consequent, `if[1]` the alternative,
`binary-expr[k]` the k-th operand, `cond-expr[0]` the true arm):

| Category | Meaning | Branches | Functions |
| -------- | ------- | -------- | --------- |
| S1–S24 | Numeric or algorithmic behaviour: an oracle step scenario (T11 row, T12 anchored test) | 209 | 20 |
| J | Structural behaviour with Java-derived expectations: the three phase configurations, enum surfaces (`CrossMinType`, `HyperedgeCorner.Type`, `CrossingCountSide`), `toString`s, `Integer.compare` arms, `getGraphData()` before a run, exception branches (`ArrayIndexOutOfBoundsException`, `IndexOutOfBoundsException`, the NPE → `TypeError` unboxings: the recorder records no row for a throwing step), `alwaysImproves`, `clearTransitiveOrdering` | 27 | 28 |
| U | Unreachable through the 7c surface: 89 branches and 36 functions need nested graphs (`HierarchyHandling.INCLUDE_CHILDREN`, 7h: the rows are flat per C3); 3 branches need label dummies (`LabelDummyInserter`, 7f); 60 branches and 4 functions are dead by construction or unused in the Java (table after the scenarios) | 152 | 40 |

Fully covered by the replay: `CrossingMatrixFiller`, `GreedySwitchHeuristic`, `ForsterConstraintResolver` apart from
two sites, `ICrossingMinimizationHeuristic`, `ISweepPortDistributor`, `IInitializable`, `LayerSweepCrossingMinimizerState`.

## Scenarios

Each scenario is one inline ELK JSON graph (`input: { elk }`, B5) plus a step list in T1's op vocabulary
(`importGraph`, `normalise`, `setProperty`, `layers`, `reverseEdge`, `runProcessor`, `runPhase`, `dump`); several
rows may share a graph and differ in one option or step. Unless stated, the steps are `importGraph`, `normalise`,
`runPhase P1_CYCLE_BREAKING GREEDY`, `runPhase P2_LAYERING NETWORK_SIMPLEX`, the before-P3 processors a pipeline would
run for the graph (`LONG_EDGE_SPLITTER`, `PORT_SIDE_PROCESSOR`, `INVERTED_PORT_PROCESSOR`, `PORT_LIST_SORTER`,
`NORTH_SOUTH_PORT_PREPROCESSOR`, … as the `scenarios/*` rows do), then `runPhase P3_NODE_ORDERING <S>` (default
`LAYER_SWEEP`) and `dump`; a scenario that must *skip* a processor says so. `expected` is the B2 shape plus `ports`
and the full dump for graphs under 10 nodes; the column names the fields T12 asserts. Ids are `sites/<Group>/<name>`.
Step rows never run `SELF_LOOP_PREPROCESSOR` or `LABEL_DUMMY_INSERTER`, so self loops reach the 7c classes directly
(the Java pipeline hides them first; the classes handle them anyway, see `NorthSouthPortPreprocessor.java:110-120`).
T1 observed that a hand-placed in-layer edge between plain nodes crashes `BinaryIndexedTree.rank`
(`.agent-notes/layered-crossing-min.md`), so in-layer edges come from `INVERTED_PORT_PROCESSOR` or hand-placed
layerings with N/S ports only. Where a scenario's reachability is uncertain the row says "T11 verifies": a branch the
oracle cannot reach moves to U with its mechanism in the T11 corrections, as 7b did.

| # | Scenario id | TS sites (file:line arm) | Graph | Steps / options | Expected shape |
| - | ----------- | ------------------------ | ----- | --------------- | -------------- |
| S1 | `sites/LayerSweep/trivial` | `LayerSweepCrossingMinimizer.ts:112 binary-expr[1]`, `:116 if[0]`, `:116 binary-expr[2]` | one node, no edge (`singleNode`); zero nodes (`empty`, T11 verifies the recorder accepts an edgeless graph) | `layers [[n0]]` for the single node, then `runPhase P3 LAYER_SWEEP` (the driver returns before building holders, `LayerSweepCrossingMinimizer.java:118-125`) | `layers`, `ports`, `changed: []` |
| S2 | `sites/InLayerConstraints/*` | `ForsterConstraintResolver.ts:314 if[0]`, `ForsterConstraintResolverConstraintGroup.ts:91 if[0]`, `:113 if[0]`, `BarycenterHeuristic.ts:365 if[1]`, `InteractiveCrossingMinimizer.ts:157 if[0]` | 6–8 nodes in two layers, the free layer's nodes connected to fixed-layer nodes so merged groups have `degree > 0` (`connected`); two free nodes connected to one fixed node (equal barycenters) listed in violated order (`equalBarycenters`); in-layer successor constraints both ways between two nodes (`cycle`) and from a node to itself (`selfReference`); the same `connected` graph under `INTERACTIVE` with seeded positions (`interactive`) | constraints through `setProperty <node> inLayerSuccessorConstraints [{ref}]` (`InternalProperties`, a list of node refs) or `SEMI_INTERACTIVE_CROSSMIN_PROCESSOR` with `position`s; `runPhase P3 LAYER_SWEEP`, `INTERACTIVE` for the last row | `layers`, `ports`, `changed` (`IN_LAYER_SUCCESSOR_CONSTRAINTS`) |
| S3 | `sites/Interactive/bendpoints` | `InteractiveCrossingMinimizer.ts:206 if[1]`, `:208 if[0,1]`, `:250 binary-expr[1]` | 4 nodes with seeded positions and one long edge whose ELK JSON section carries two bend points (`ORIGINAL_BENDPOINTS` set at import, `ElkGraphImporterEdges.ts:147`); a second row with that edge reversed by P1 (a cycle through it); a third whose dummy's x lies beyond the last bend point | `runPhase P3 INTERACTIVE` | `layers`, `ports`, `changed` |
| S4 | `sites/ModelOrder/zeroCrossings` | `LayerSweepCrossingMinimizer.ts:223 if[0]`, `:295 if[0]`, `:295 binary-expr[1]`, `:308 if[0]` | 4 nodes, 2 layers, 2 crossing-free edges in model order (`initial`); the same with the two target nodes listed in crossing order so the first sweep removes the crossing (`afterSweep`) | root `considerModelOrder.strategy=NODES_AND_EDGES`, `runProcessor SORT_BY_INPUT_ORDER_OF_MODEL`, `runPhase P3 LAYER_SWEEP` | `layers`, `changed` (`FIRST_TRY_WITH_INITIAL_ORDER`) |
| S5 | `sites/ModelOrder/separate` | `ModelOrderBarycenterHeuristic.ts:72 if[0]` | 5 nodes with `layering.layerConstraint=FIRST_SEPARATE` on one and `LAST_SEPARATE` on another, model order with `forceNodeModelOrder` | the steps **omit** `LAYER_CONSTRAINT_PREPROCESSOR` so the separate nodes stay in their layers; `setProperty g0 considerModelOrder.strategy NODES_AND_EDGES`, `… crossingMinimization.forceNodeModelOrder true` on the root before import | `layers`, `changed` |
| S6 | `sites/ModelOrder/transitive` | `ModelOrderBarycenterHeuristic.ts:77 if[0]`, `:86 if[1]`, `:114 if[0]`, `:179 if[0]`, `:184 if[0]`, `:189 if[0]`, `:194 if[0]`, `:215 if[1]`; `ModelOrderNodeComparator.ts:90 if[0]`, `:100 if[0]`, `:105 if[0]`; `ModelOrderPortComparator.ts:104 if[0]`, `:114 if[0]`, `:119 if[0]` | 8–9 nodes in one free layer under `forceNodeModelOrder` (insertion sort compares a pair more than once, so a recorded association answers the second comparison); two nodes with equal barycenters (`equalBarycenters`); group ids `considerModelOrder.groupModelOrder.crossingMinimization.id` with `cmEnforcedGroupOrders` restricted so two nodes compare equal within a non-enforced group (`groupOrder`) | `forceNodeModelOrder=true`, `considerModelOrder.strategy=NODES_AND_EDGES`, thoroughness 7 so the sorts repeat | `layers`, `changed` |
| S7 | `sites/ModelOrder/externalPorts` | `CMGroupModelOrderCalculator.ts:31 if[0]`, `ModelOrderNodeComparator.ts:119 if[1]` | hierarchical target: 5 children, WEST and EAST ports on the target with edges (external port dummies carry no `MODEL_ORDER`), model order on the root | `importGraph <target>`, `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR` in the steps, `SORT_BY_INPUT_ORDER_OF_MODEL`, `runPhase P3 LAYER_SWEEP` with `forceNodeModelOrder` | `layers`, `ports`, `changed` |
| S8 | `sites/ModelOrder/feedback` | `ModelOrderNodeComparatorHelperDummies.ts` all 44 branches and 5 functions (`handleTwoLongEdges`, `feedbackNodeOf`, `orderBeforePorts`, `orderSourceFeedbackNodes`, `orderByReferencePorts`), `ModelOrderNodeComparator.ts:54` (the `state.compare` lambda), `ModelOrderNodeComparatorAssociations.ts:82 binary-expr[1]`, `:104 binary-expr[1]`, `ModelOrderNodeComparatorPreviousLayer.ts:69 if[0]`, `:164 if[0]`, `:165 if[0,1]`, `:183 if[0]`, `ModelOrderPortComparatorIncoming.ts:56 if[1]`, `:74 if[0]`, `:76 if[0,1]`, `:156 if[0,1]`, `:157 if[0,1]`, `:157 binary-expr[0,1]`, `compareLongEdgeSources` (`:144`), `ModelOrderPortComparatorOutgoing.ts:107 if[1]` | 6–8 nodes with `portConstraints=FIXED_SIDE`, two long edges whose source ports sit on the WEST side and target ports on the EAST side of their nodes (inverted ports: `INVERTED_PORT_PROCESSOR` creates in-layer edges and long-edge dummies whose source or target node is in the dummy's own layer, the comparators' "feedback" case); variants: two such dummies on one reference node (`sameNode`, both `beforePorts` values through `considerModelOrder.portModelOrder`), one source-feedback and one target-feedback dummy (`mixed`), dummies whose edges carry no `MODEL_ORDER` because the edge was created by a processor (`noEdgeOrder`) | model order `NODES_AND_EDGES` + `forceNodeModelOrder`, the before-P3 processors incl. `INVERTED_PORT_PROCESSOR`, `SORT_BY_INPUT_ORDER_OF_MODEL`, `runPhase P3 LAYER_SWEEP` | `layers`, `ports`, `changed` |
| S9 | `sites/ModelOrder/ports` | `ModelOrderPortComparator.ts:81 if[1]`, `:145 if[1]`, `:148 if[0,1]`, `:148 binary-expr[0,1]`, `:169 if[0,1]`, `:170 binary-expr[0..3]`, `compareUnconnectedPorts` (`:163`); `ModelOrderPortComparatorIncoming.ts:67 if[0]`, `:69 if[0,1]`, `:98 if[1]`, `:123 if[0,1]`, `:126 if[0,1]`, `compareOnSameSourceNode` (`:120`); `ModelOrderPortComparatorOutgoing.ts:135 if[0]`, `:142 if[1]` | a node with two input ports fed by two ports of one source node (`sameSource`), two output ports to one target node (`sameTarget`), ports with no edge at all on every side (`unconnected`: WEST and SOUTH reverse the order), input ports whose sources sit two layers back (`notPreviousLayer`) | model order `NODES_AND_EDGES`, `SORT_BY_INPUT_ORDER_OF_MODEL`, `runPhase P3 LAYER_SWEEP` | `ports`, `layers`, `changed` |
| S10 | `sites/ModelOrder/portModelOrder` | `ModelOrderPortComparatorAssociations.ts:96 if[0,1]`, `:96 binary-expr[0,1]`, `:155 if[0,1]`, `checkPortModelOrder` (`:94`), `orderByPortModelOrder` (`:153`); `ModelOrderPortComparatorIncoming.ts:104 if[0,1]`; `ModelOrderPortComparatorOutgoing.ts:67 if[0]`, `:69 if[0,1]` | the S9 `sameSource` graph with ports listed against their edge order | `considerModelOrder.portModelOrder=true` on the root, otherwise as S9 | `ports`, `changed` |
| S11 | `sites/ModelOrder/northSouth` | `ModelOrderPortComparator.ts:190 checkPortModelOrder` (the public method, called by `NorthSouthPortPreprocessor.modelOrderNorthSouthInputReversing`, `NorthSouthPortPreprocessor.java:377-392`), `ModelOrderPortComparatorOutgoing.ts:25 binary-expr[1]`, `:141 if[1]` | 4 nodes with NORTH and SOUTH ports (`portConstraints=FIXED_SIDE`), two input ports on the north side, two output ports on the south side, model order on the root | model order `NODES_AND_EDGES`, `NORTH_SOUTH_PORT_PREPROCESSOR` runs with model order active, then `runPhase P3 LAYER_SWEEP` | `ports`, `layers`, `changed` |
| S12 | `sites/NorthSouth/inputRanks` | `LayerTotalPortDistributor.ts:54 if[0]`, `:64 if[0]`; `NodeRelativePortDistributor.ts:61 if[0]`, `:72 if[0]`; `AbstractBarycenterPortDistributor.ts:272 if[1]`; `CrossingsCounterConvenience.ts:31 if[1]`; `HyperedgeCrossingsCounter.ts:122 if[0]`, `:147 if[0,1]` | 5 nodes, `portConstraints=FIXED_SIDE`, input ports on the NORTH side and a NORTH port with two incoming edges from the previous layer (a hyperedge), one in-layer edge through a SOUTH port of a hand-placed layering | the steps **omit** `NORTH_SOUTH_PORT_PREPROCESSOR` (the pipeline always adds it for N/S ports, a step row need not), rows with seed 1 (`LayerTotalPortDistributor`) and seed 2 (`NodeRelativePortDistributor`, `setProperty g0 randomSeed 2` before `normalise`), `runPhase P3 LAYER_SWEEP`; T11 verifies the in-layer SOUTH edge survives the counter | `ports`, `layers` |
| S13 | `sites/NorthSouth/selfLoops` | `NorthSouthPortPreprocessorDummies.ts:110 if[0]`, `:112 if[0,1]`, `:116 if[0,1]`, `:116 binary-expr[0,1]`, `createSameSideSelfLoopDummyNode` (`:287`), `createNorthDummy` (`:320`), `createSouthDummy` (`:336`), `createNorthSouthSelfLoopDummyNodes` (`:367`); `AbstractBarycenterPortDistributor.ts:303 if[1]`, `:318 if[1]`; `CrossingsCounter.ts:267 if[1]`, `:292 if[1]`; `CrossingsCounterNorthSouth.ts:86 if[1]`; `InvertedPortProcessor.ts:139 if[0]`, `:208 if[0]` | 4 nodes, `FIXED_SIDE`: one node with a north–north self loop (`sameSide`), one with a north→south self loop (`northSouth`), one with a west→east self loop on a node with inverted ports (`inverted`) | the steps **omit** `SELF_LOOP_PREPROCESSOR` (7g), run `INVERTED_PORT_PROCESSOR`, `NORTH_SOUTH_PORT_PREPROCESSOR`, then `runPhase P3 LAYER_SWEEP` | `ports`, `layers`, `edges`, `changed`, full dump (dummies `new/n<k>`) |
| S14 | `sites/NorthSouth/portOptions` | `SweepCopy.ts:155 if[0]`, `:164 if[0]`; `NorthSouthPortPreprocessor.ts:169 if[1]`, `:205 if[1]` | 4 nodes with NORTH/SOUTH ports whose ELK JSON sets `port.anchor` (explicit anchors, `portAnchors`); the same with `allowNonFlowPortsToSwitchSides=true` on the N/S ports (`allowNonFlow`) | `NORTH_SOUTH_PORT_PREPROCESSOR`, `runPhase P3 LAYER_SWEEP`, seed 1 and seed 2 so a dummy order switches a port's side | `ports`, `changed` (`PORT_CONSTRAINTS`, anchors), full dump |
| S15 | `sites/Hyperedges/*` | `HyperedgeCrossingsCounter.ts:202 if[1]`, `:206 if[0,1]`, `:284 if[1]`, `mergeHyperedges` (`:237`); `HyperedgeCrossingsCounterHyperedge.ts:30 if[0]`, `:32 if[1]`, `:34 if[0,1]`, `:36 if[0,1]`; `HyperedgeCrossingsCounterHyperedgeCorner.ts:38 if[0]`, `:40 if[0]`, `:42 if[0]`, `:44 if[0]`, `:44 binary-expr[1]`, `:46 if[1]`; `AllCrossingsCounter.ts:101 if[1]` | 8 nodes in three layers whose ports each connect to several ports of the next layer so three hyperedges arise and one edge joins two existing hyperedges (`merge`), two edges inside one hyperedge (`sameHyperedge`), hyperedges with equal `upperLeft` and distinct `upperRight` (`corners`), a first-layer node with a WEST port of two edges (in-layer through `INVERTED_PORT_PROCESSOR`, `westFirstLayer`); T11 verifies `:284` (a hyperedge port in neither layer) | `runPhase P3 LAYER_SWEEP` (the hyperedge counter is chosen by `AllCrossingsCounter` where a port has several edges) | `layers`, `ports` |
| S16 | `sites/GreedySwitch/*` | `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts:78 if[0]`, `:111 if[1]`; `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency.ts:36 cond-expr[0]`; `NorthSouthEdgeNeighbouringNodeCrossingsCounter.ts:116 if[1]`, `:140 cond-expr[1]` | two parallel edges between the same two ports plus a crossing (`parallelEdges`); a layer holding a long-edge dummy above a SOUTH-port dummy of a normal node, and a node with an unconnected SOUTH port (`northSouthLongEdges`) | the before-P3 processors, `runProcessor ONE_SIDED_GREEDY_SWITCH` and `TWO_SIDED_GREEDY_SWITCH` rows | `layers`, `ports` |
| S17 | `sites/HeadLabels/*` | `InvertedPortProcessor.ts:182 if[0,1]`, `:184 if[0,1]`, `:251 if[0,1]`; `LongEdgeSplitter.ts:205 if[0,1]`, `:209 if[0,1]` | a long edge with an edge label `edgeLabels.placement=HEAD` (`longEdge`); an inverted-port edge with such a label, and one whose label already carries `END_LABEL_EDGE` because both processors meet it (`invertedPort`) | `LONG_EDGE_SPLITTER`, `PORT_SIDE_PROCESSOR`, `INVERTED_PORT_PROCESSOR`, `dump` (no P3 needed) | `edges`, `changed` (label properties, `END_LABEL_EDGE`), full dump |
| S18 | `sites/LongEdgeSplitter/negativeThickness` | `LongEdgeSplitter.ts:107 if[0]` | 3 nodes, one long edge with `edge.thickness=-1` | `LONG_EDGE_SPLITTER`, `dump` | `changed` (`EDGE_THICKNESS` 0 on the edge) |
| S19 | `sites/PortListSorter/*` | `PortListSorter.ts:55 if[1]` (`freePorts`: a node with `portConstraints=FREE`), `:60 if[0]`, `:154 if[0,1]`, `:158 switch[0,1]`, `:178 if[0,1]`, `CMP_PORT_DEGREE_EAST_WEST` (`:152`), `#IN_EDGES`/`#OUT_EDGES` (`:128`, `:129`) (`portDegree`: `portSortingStrategy=PORT_DEGREE` on a `FIXED_SIDE` node with EAST and WEST ports of different degrees, one edge reversed), `:226 switch[1,3]` (`fixedPosAllSides`: `FIXED_POS` with ports on all four sides) | 4–5 nodes | `PORT_SIDE_PROCESSOR`, `PORT_LIST_SORTER`, `dump`; the `portDegree` row runs P1 `GREEDY` on a cycle so one edge is `REVERSED` | `ports`, full dump |
| S20 | `sites/PortSideProcessor/undefinedSide` | `PortSideProcessor.ts:54 if[0]` | a `FIXED_SIDE` node with one port whose ELK JSON gives no side (`UNDEFINED` after import) | `PORT_SIDE_PROCESSOR`, `dump` | `changed` (`PORT_SIDE`), full dump |
| S21 | `sites/InvertedPortProcessor/freePorts` | `InvertedPortProcessor.ts:76 if[0]` | a node with `portConstraints=FREE` among `FIXED_SIDE` nodes with inverted ports | `LONG_EDGE_SPLITTER`, `PORT_SIDE_PROCESSOR`? no: `PORT_SIDE_PROCESSOR` fixes free nodes to `FIXED_SIDE`, so the steps run `INVERTED_PORT_PROCESSOR` **before** it on this row | `edges`, `changed`, full dump |
| S22 | `sites/SemiInteractive/noConstraints` | `SemiInteractiveCrossMinProcessor.ts:60 if[1]` | 3 nodes in three layers (one node per layer: no in-layer pair needs a constraint) with positions | `SEMI_INTERACTIVE_CROSSMIN_PROCESSOR`, `dump` | `changed` (no `IN_LAYER_SUCCESSOR_CONSTRAINTS_BETWEEN_NON_DUMMIES`), full dump |
| S23 | `sites/ExternalPorts/*` | `HierarchicalPortConstraintProcessorNodeComparator.ts:22 if[0]`, `:27 if[0]` (`equalPositions`: two WEST external ports at the same y under `FIXED_POS`; `normalNodeInLayer`: a normal node in the dummies' layer under `FIXED_RATIO`), `HierarchicalPortConstraintProcessor.ts:304 if[0]`, `:308 if[0]` (`newFirstLastLayer`: dummies whose connected nodes all lie in the first/last layer so a new layer is needed, "shouldn't normally happen", T11 verifies), `CrossingsCounterNorthSouth.ts:126 switch[3]` (`northSouth`: external port dummies in a layer whose nodes also have N/S ports) | hierarchical target with 4–6 children and ports on the target | `importGraph <target>`, the before-P3 processors incl. `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR` and `NORTH_SOUTH_PORT_PREPROCESSOR`, `runPhase P3 LAYER_SWEEP` | `layers`, `ports`, `changed` |
| S24 | `sites/Median/forwardFirst` | `MedianHeuristic.ts:35 cond-expr[0]` | the `scenarios/MedianLayerSweep/crossing` graph | `setProperty g0 randomSeed <s>` before `normalise` with the first seed whose first `nextBoolean()` is `true` (seed 1 and 2 draw `false`; scan as 7b's tie row did), `runPhase P3 MEDIAN_LAYER_SWEEP` | `layers`, `ports` |

## J: structural, Java-derived, unit-tested (27 branches, 28 functions)

- `getLayoutProcessorConfiguration` of `InteractiveCrossingMinimizer` (`:61`, with `:66 if[0,1]`: `PORT_LIST_SORTER`
  added for `NON_FREE_PORTS`), `LayerSweepCrossingMinimizer` (`:407`), `NoCrossingMinimizer` (`:48`) (the replay
  runs phases through `create().process()`; the batch-4 tests assert each configuration's processors per phase).
- Enum surfaces: `LayerSweepCrossingMinimizerCrossMinType.ts:50 if[0,1]`, `:49` (the `find` lambda), `ordinal`,
  `name`; `HyperedgeCrossingsCounterHyperedgeCornerType.ts:36 if[0,1]`, `:35`, `ordinal`, `name`, `toString`;
  `SwitchDeciderCrossingCountSide.ts:38 if[0,1]`, `:37`, `ordinal`, `name`, `toString`.
- `toString`s with their arms: `BarycenterHeuristicBarycenterState.ts:33` (`:36 cond-expr[0,1]`),
  `ForsterConstraintResolverConstraintGroup.ts:233` (`:237 if[0,1]`, `:240 if[0,1]`), `GraphInfoHolder.ts:250` (and
  its two lambdas `:251`), `LayerSweepTypeDeciderNodeInfo.ts:23`,
  `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts:156` (and `:157`),
  `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency.ts:40`.
- `Integer.compare` arms: `ModelOrderBarycenterHeuristic.ts:19 cond-expr[0]`,
  `ModelOrderPortComparatorAssociations.ts:14 cond-expr[0,1]` ×2 and the lambda,
  `ModelOrderPortComparatorPortSideComparator.ts:5 cond-expr[0]`.
- `LayerSweepCrossingMinimizer.getGraphData` (`:420`, `:421 cond-expr[0,1]`): null before the first run
  (`LayerSweepCrossingMinimizer.java:653`, pinned by the T7 test).
- `BarycenterHeuristic.alwaysImproves` (`:481`, `BarycenterHeuristic.java:397`: the driver asks the holder's heuristic
  only on the greedy path, `LayerSweepCrossingMinimizer.java:137`), `ModelOrderPortComparator.clearTransitiveOrdering`
  (`:199`, `ModelOrderPortComparator.java:441`), `BinaryIndexedTree.isEmpty` (`:119`).
- Exception branches: `BinaryIndexedTree.ts:51 if[0]` (`ArrayIndexOutOfBoundsException`, the T1 crash),
  `SwitchDecider.ts:67 if[0]` (`IndexOutOfBoundsException("Greedy SwitchDecider: Free layer not in graph.")`),
  `SortByInputModelProcessor.ts:130 if[0]` and `ModelOrderNodeComparatorAssociations.ts:35 if[0]` (NPE on unboxing a
  missing `MODEL_ORDER` → `TypeError`, AD-16b), `SortByInputModelProcessor.ts:123 if[0]` (the cached map, a second
  call on one node).

## U: unreachable through the 7c surface (152 branches, 40 functions)

Nested graphs (89 branches, 36 functions; the rows import one flat level per C3, so no `GraphInfoHolder` has a parent
or children; re-measure in 7h):
`AbstractBarycenterPortDistributor.ts:81 if[1]`; `BarycenterHeuristic.ts:419 if[1]` (`minimizeCrossings` on a first
layer: only `sweepInHierarchicalNode` calls it there, `LayerSweepCrossingMinimizer.java:491-497`);
`ForsterConstraintResolver.ts:56 if[1]` (an empty node order: the driver returns on an empty root graph at
`LayerSweepCrossingMinimizer.java:118`, so only an empty child graph reaches the constructor);
`GraphInfoHolder.ts:72 cond-expr[0]`, `:298 if[0]`, `parent`, `hasExternalPorts`, `parentGraphData`, `portPositions`;
`GreedyPortDistributor.ts:58 if[0]`, `:62 cond-expr[0,1]`, `:120 if[0]`, `:123 if[0,1]`, `:123 binary-expr[0,1]`;
`LayerSweepCrossingMinimizer.ts:152 if[1]`, `:154 if[0]`, `:163 if[0,1]`, `:163 binary-expr[0,1]`, `:386 if[1]`,
`setPortOrderOnParentGraph` (`:162`); `LayerSweepCrossingMinimizerCounting.ts:133 if[0,1]`, `:161 if[0,1]`;
`LayerSweepCrossingMinimizerHierarchical.ts` (all 10 branches, `sortPortsByDummyPositionsInLastLayer`,
`sortPortDummiesByPortPositions`); `LayerSweepCrossingMinimizerSweep.ts:71 if[0]`, `:71 binary-expr[1]`,
`:72 binary-expr[0,1]`, `:91 if[0,1]`, `sweepInHierarchicalNode` (`:84`); `LayerSweepCrossingMinimizerSweepHelpers.ts`
(all 6 branches and 7 functions: used by the hierarchical sweep only); `LayerSweepTypeDecider.ts` (all 25 branches and
17 functions beyond the `rootNode()` short-circuit: `:61 if[1]`, `:61 binary-expr[2,3]`, …);
`LayerSweepTypeDeciderNodeInfo.transfer` (`:16`); `SweepCopy.ts:53 if[0]` (a child without a best order),
`:125 if[1]` (`transferNodeAndPortOrdersToGraph(…, false)`, the hierarchical caller), `nodes` (`:69`);
`AllCrossingsCounter.ts:46 if[0]` (an empty child order); `PortSideProcessor.ts:70 if[0]` (`PORT_DUMMY` on a port of
a compound node, set when its own ports are imported with `INCLUDE_CHILDREN`); `BetweenLayerEdgeTwoNodeCrossingsCounter.ts:88 if[0]`,
`:105 if[0]`, `:122 if[0]` (`upperNode == lowerNode`: the matrix filler compares distinct nodes, only the hierarchical
port-dummy caller can pass one node twice); `SwitchDecider.ts:78 binary-expr[2,3]`, `:82 if[0]`, `:94 cond-expr[0,1]`,
`:97 cond-expr[0,1]`, `:99 if[0,1]`, `:116 if[0]`, `:148 if[0]`, `initParentCrossingsCounters` (`:88`),
`countCrossingsBetweenOriginPorts` (`:176`).

Label dummies (3 branches; `LabelDummyInserter` is 7f and no 7c class creates a `NodeType.LABEL` node; re-measure in 7f):
`LongEdgeSplitter.ts:166 if[0]`, `:169 if[0]`; `SortByInputModelProcessor.ts:159 if[0]` (a non-NORMAL node without
`LONG_EDGE_TARGET` on the walk: every `LONG_EDGE` dummy carries it, `LongEdgeSplitter.java:150-156`).

Dead by construction or unused in the Java (60 branches, 4 functions):

| Site | Reason (Java line) |
| ---- | ------------------ |
| `BarycenterHeuristic.ts:112 if[0]`, `:27 binary-expr[0,1,2]`, `isModelOrderBarycenterHeuristic` (`:25`) | the force arm of the base heuristic: `GraphInfoHolder` creates `ModelOrderBarycenterHeuristic` whenever `forceNodeModelOrder` is set and the base class otherwise (`GraphInfoHolder.java`, `createCrossMinimizer`; TS `:113-122`), so the base never sees the flag and the Java cast `(ModelOrderBarycenterHeuristic) this` never runs |
| `ModelOrderBarycenterHeuristic.ts:155 if[1]`, `:162 if[0]` | the non-force arms of the subclass, dead for the same reason |
| `BarycenterHeuristic.ts:407 if[1]`, `:409 if[0,1]`, `:411 if[0,1]`; `ModelOrderBarycenterHeuristic.ts:211 if[1]`, `:219 if[0,1]`, `:222 if[0,1]`; `ForsterConstraintResolverConstraintGroup.ts:93 if[1]`, `:95 if[0,1]`, `:97 if[0,1]` | null barycenters in the comparators and group merges: `fillInUnknownBarycenters` assigns every node a barycenter before the sort (`BarycenterHeuristic.java:118-126`) and `processConstraints` runs after it |
| `BarycenterHeuristic.ts:316 if[1]` | an associate in another layer: the only associates are the N/S dummies the preprocessor adds to the node's own layer (`NorthSouthPortPreprocessor.java`, `createDummyNode`; `BarycenterHeuristic.java:277`) |
| `ForsterConstraintResolverConstraintGroup.ts:107 if[1]`, `:123 if[0,1]` | the first group of a merge is the violated constraint's predecessor, which has outgoing constraints by definition (`ForsterConstraintResolver.java:422-441`) |
| `AbstractBarycenterPortDistributor.ts:321 if[1]` | a dummy port with the origin port but no edge: the preprocessor reroutes every edge of the origin to that port (`NorthSouthPortPreprocessor.java`, `createDummyNode`) |
| `InteractiveCrossingMinimizer.ts:214 if[1]`, `:225 if[1]`, `:235 if[1]` | a `LONG_EDGE` dummy without `LONG_EDGE_SOURCE`/`LONG_EDGE_TARGET`, or with both and fewer than two points: `LongEdgeSplitter` sets both on every dummy (`LongEdgeSplitter.java:150-156`), so `bendpoints.size() >= 2` always holds |
| `LayerSweepCrossingMinimizer.ts:212 if[1]`; `LayerSweepCrossingMinimizerCounting.ts:188 if[1]` | `compareLayoutsWithNodePortOrderCounter` and `countCurrentNumberOfCrossingsNodePortOrder` run only when `considerModelOrder.strategy != NONE` (`LayerSweepCrossingMinimizer.java:195-211`) |
| `LayerSweepCrossingMinimizer.ts:346 if[0]` | `FIRST_TRY_WITH_INITIAL_ORDER` and `SECOND_TRY_WITH_INITIAL_ORDER` share one property id, so the first flag reads false once the second block ran (`LayerSweepCrossingMinimizer.java:257-259`; agent notes) |
| `LayerTotalPortDistributor.ts:31 switch[2]`, `NodeRelativePortDistributor.ts:33 switch[2]` | `default` of a switch over the complete `PortType` enum (`LayerTotalPortDistributor.java:41`, `NodeRelativePortDistributor.java:46`) |
| `MedianHeuristic.ts:125 if[0]`, `:138 if[0]` | the free node is never in the reference (fixed) layer, so its own end of an edge cannot match (`MedianHeuristic.java:125-148`) |
| `MedianHeuristic.ts:158 if[0]`, `:161 if[0]`, `:166 if[1]`, `:171 if[0,1]`, `:173 if[0,1]` | `calculateMedians` sets a `WEIGHT` on every node of the free layer before the sort (`MedianHeuristic.java:110-121`; TS `:103`, `:113`) |
| `NorthSouthPortPreprocessor.ts:173 if[0]`, `:209 if[0]`; `NorthSouthPortPreprocessorDummies.ts:137 if[1]`, `:165 binary-expr[0,1]`, `:171 if[0,1]`, `createOldApproachDummies` (`:158`) | behind the constant `USE_NEW_APPROACH = true` (`NorthSouthPortPreprocessor.java:244,292,487-521`) |
| `PortListSorter.ts:89 if[0]` | `reverseWestAndSouthSide` returns before `findPortSideRange` when the list has at most one port (`PortListSorter.java:111-113`) |
| `PortListSorter.ts:195 if[0]` | `CMP_PORT_SIDE` decides different sides first in `CMP_COMBINED`; reachable only by calling the public comparator directly (`PortListSorter.java:219-221`) |
| `PortListSorter.ts:226 switch[4]` | `default` for an `UNDEFINED` side after `PORT_SIDE_PROCESSOR` assigned every side (`PortListSorter.java:253`) |
| `SortByInputModelProcessor.ts:189 binary-expr[0,1]` | `insertionSortPort` is public and uncalled in `org.eclipse.elk.alg.layered` (`SortByInputModelProcessor.java:173-186`) |
| `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts:107 if[0]` | `removeFirst` on an empty list is guarded by its loop (`BetweenLayerEdgeTwoNodeCrossingsCounter.java:310-312`) |
| `ModelOrderNodeComparatorAssociations.ts:31 if[1]` | the port was found by `getIncomingEdges().length !== 0`, so its first edge exists (`ModelOrderNodeComparator.java:296-299`) |
| `ModelOrderNodeComparatorPreviousLayer.ts:52 if[1]`, `:146 if[0,1]` | the "cannot happen" tail of `compareBothConnected`: both nodes connect to the previous layer, so `checkReferenceLayer` decides and the edge-order fallback never runs (`ModelOrderNodeComparator.java:203-215`, its own comment) |
| `ModelOrderNodeComparatorState.ts:56` (the default `compare` lambda) | a TS initialiser the constructor overwrites with the comparator's `compare` (`ModelOrderNodeComparator.ts:54`) |
| `CrossMinUtil.ts:13` (private constructor) | a Java utility class, never instantiated (`CrossMinUtil.java`) |

## Counts

24 scenario ids (S1–S24; stop 9 is about 25) over 23 graphs; T11 records them, T12 anchors one test per row.
Branches: S 209 / J 27 / U 152 (89 nested, 3 labels, 60 dead) = 388; functions: S 20 / J 28 / U 40 (36 nested, 4 dead) = 88.

## T11 corrections (2026-10-30)

T11 recorded 62 `sites/*` rows (every S1–S24 id has rows; the agent added variants where one graph could not reach
every arm: `ModelOrder/transitive/{force,counting}`, `ModelOrder/ports/notPreviousLayer/noPortModelOrder`,
`Hyperedges/{mergeAcross,neitherLayer}`, `NorthSouth/selfLoops/{northEast,greedyInLayer,greedyPorts}`,
`HeadLabels/westOutput`). Re-measured with the T9 command after T11 (load 4.2): branches 85.09 % (1,267/1,489, T9
73.94 %), functions 88.47 % (522/590, T9 85.08 %); 222 arms and 68 functions remain untaken, every one in the J or U
lists above or in the table below. The table moves the S arms the recorder could not reach to U (dead by construction
with the Java line, High) or to "unreached" (scans found no graph; Medium unless stated; stop 8 does not apply where a
mechanism is named). Everything else listed under S1–S24 is taken by a site row.

| Was | Arm | New category and mechanism |
| --- | --- | --- |
| S2 | `ForsterConstraintResolverConstraintGroup.ts:91 if[0]` (`degree > 0`) | U dead: `summedWeight`/`degree` are assigned only by the merge constructor (`ForsterConstraintResolver.java:372-374`, `442-446`); single-node groups keep 0/0 |
| S2 | `ForsterConstraintResolver.ts:314 if[0]` (equal Float32 barycenters), `ForsterConstraintResolverConstraintGroup.ts:113 if[0]` (`candidate == nodeGroup1`) | unreached: `calculateBarycenter` adds a random float jitter per node, so equal barycenters only arise from the pre-ordered unknown-barycenter fill (steps of 0.5); constraints are enforced by every earlier sort so no violation remains there; a 2-cycle never activates in `findViolatedConstraint`; 720 seed-by-constraint variants found no hit |
| S6 | `ModelOrderBarycenterHeuristic.ts:77 if[0]`, `:179 if[0]`, `:184 if[0]`, `:189 if[0]`, `:194 if[0]` | unreached: the insertion sort compares a fresh pivot against the sorted prefix, so the closure never answers a pair twice (`:189`/`:194` duplicate the `:179`/`:184` conditions); 300 random force graphs gave no non-zero result. The "known association" arms the comparators do take are reached only through `countModelOrderNodeChanges`/`countModelOrderPortChanges` (influence options non-zero), never through sorting |
| S6 | `ModelOrderBarycenterHeuristic.ts:215 if[1]` | U dead: the same family as `:211`, `:219`, `:222` (`fillInUnknownBarycenters` gives every node a barycenter, T9 push-forward) |
| S6 | `ModelOrderNodeComparator.ts:100 if[0]`, `:105 if[0]`; `ModelOrderPortComparator.ts:114 if[0]`, `:119 if[0]` | U dead: `updateBiggerAndSmallerAssociations` keeps `biggerThan[x] ∋ y ⇔ smallerThan[y] ∋ x` (a fuzz of 180k updates found no asymmetric state), so the third check always follows the identical second one and the fourth re-tests `biggerThan(p2)` (`ModelOrderNodeComparator.java:168-202`, `ModelOrderPortComparator.java:215-226`) |
| S7 | `CMGroupModelOrderCalculator.ts:31 if[0]` | U dead: every caller guards that the element has `MODEL_ORDER` (`NodeComparator`, `BarycenterHeuristic`, the `PortComparator` unconnected path, `Outgoing.prefersTargetNodeModelOrder`/`firstOutgoingEdgeOrder`) |
| S8 | `ModelOrderNodeComparatorAssociations.ts:82 binary-expr[1]`, `:104 binary-expr[1]` (`?? null` on `find`) | J: the callers dereference the result at once, so a missing element is a `TypeError` the recorder cannot record |
| S8 | `ModelOrderPortComparatorIncoming.ts:69 if[1]`, `:76 if[1]`, `:156 if[1]` | U dead: `compareOnSameSourceNode` always finds its port; `checkReferenceLayer` returns 0 only for nodes missing from the layer, impossible when both are in it (`ModelOrderPortComparator.java:259-269`) |
| S8 | `ModelOrderPortComparatorIncoming.ts:157 if[1]` | unreached: same-layer long-edge dummies only feed EAST ports, as `INVERTED_PORT_PROCESSOR` creates them |
| S8 | `ModelOrderPortComparatorOutgoing.ts:107 if[1]` (an outgoing edge without `MODEL_ORDER`); S9 `ModelOrderPortComparator.ts:148 if[1]` (an unconnected port without it) | unreached (Medium-low): ports and edges get `MODEL_ORDER` at import and processor-created edges copy it; `SORT_BY_INPUT_ORDER_OF_MODEL` after `NORTH_SOUTH_PORT_PREPROCESSOR` did not reach it |
| S8 | `ModelOrderNodeComparatorHelperDummies.ts:57 if[0]`, `:62 if[0]` | U dead: an `INVERTED_PORT_PROCESSOR` dummy sits after its source or target node (the processor appends dummies), the insertion sort cannot move it past them (`compare(source, dummy)` is -1), and the count skips nodes without `MODEL_ORDER` |
| S8 | `ModelOrderNodeComparatorHelperDummies.ts:120 if[1]`, `:172 if[0]`, `:172 binary-expr[1]`, `:175 if[1]`, `:178 if[0,1]`, `:178 binary-expr[0,1]` | unreached: the helper path needs both dummies unconnected to the previous layer plus a same-reference pair; 120 random inverted-port graphs and about 15,000 class scans never produced it (the arms became visible once the function was reached; T9 counted the function) |
| S12 | `AbstractBarycenterPortDistributor.ts:272 if[1]` | unreached: only non-N/S ports enter `inLayerPorts`, and an `UNDEFINED`-side port with an in-layer edge makes the counting step throw in `BinaryIndexedTree` (the T1 crash) |
| S12 | `CrossingsCounterConvenience.ts:31 if[1]` (EAST with `topDown` false) | U dead: `initPositions` is called with (EAST, true) at `CrossingsCounter.java:482`, (WEST, false) at `:483` and (side, true) at `:288`; no caller pairs EAST with false |
| S13 | `CrossingsCounterNorthSouth.ts:86 if[1]` | U dead: every long-edge dummy has exactly a WEST and an EAST port (`LongEdgeSplitter.java:149-157`), so `findFirst()` is always present |
| S13 | `CrossingsCounter.ts:267 if[1]`, `:292 if[1]` | taken by the follow-up rows `NorthSouth/selfLoops/greedyInLayer` (a W→E self loop on a node sharing its layer, `ONE_SIDED_GREEDY_SWITCH`) and `greedyPorts` (a same-port self loop under `TWO_SIDED_GREEDY_SWITCH`, whose `CrossMinType` is the only one `ISweepPortDistributor.create` gives a `GreedyPortDistributor`; a `LAYER_SWEEP` phase always builds the BARYCENTER minimizer) |
| S15 | `HyperedgeCrossingsCounterHyperedge.ts:32 if[1]`, `:34 if[0,1]`, `:36 if[0,1]` | U dead: distinct hyperedges have disjoint port sets and the left-layer port positions are unique, so `upperLeft` never ties (`HyperedgeCrossingsCounter.java:380-392`) |
| S15 | `HyperedgeCrossingsCounterHyperedgeCorner.ts:38 if[0]`, `:40 if[0]`, `:42 if[0]`, `:44 if[0]`, `:44 binary-expr[1]`, `:46 if[1]` | U dead: position ties occur only between the UPPER and LOWER corner of one hyperedge with equal opposite positions, and the sort only ever calls `compare(LOWER, UPPER)` for that pair (`HyperedgeCrossingsCounter.java:420-444`) |
| S16 | `NorthSouthEdgeNeighbouringNodeCrossingsCounter.ts:116 if[1]` | unreached (Medium-low): the `ForsterConstraintResolver` layout-unit constraints keep a node and its dummies contiguous, so a long-edge dummy never sits directly above a SOUTH dummy; `allowNonFlowPortsToSwitchSides` rows did not reach it |
| S22 | (row design) | `SemiInteractiveCrossMinProcessor.ts:56-61` sets `addedConstraints` whenever any NORMAL node has a `POSITION`, so the no-constraints arm needs nodes without positions, not "with positions" as S22 said; the row uses plain nodes |

Other T11 findings for T12: `SORT_BY_INPUT_ORDER_OF_MODEL` sorts ports of `FIXED_SIDE`/`FREE` nodes only (S9/S10 rows
use `FIXED_SIDE`); the first sweep randomizes every barycenter and the sweep stream is re-seeded from the graph's
`Random` (`Median/forwardFirst` needed seed 4); `Interactive/bendpoints/*` rows carry 10 nodes so no full dump is
recorded (the TS dump has no `KVectorChain` encoder); a hand-placed layering with `SORT_BY_INPUT_ORDER_OF_MODEL`
under 10 nodes mismatches on the full dump (`targetNode.modelOrder` is `java.util.HashMap` on the oracle side and the
twin map is applied by `compareOrder` only), so the SBI rows use recorded layerings.

Residual S after T11: 47 arms (25 moved to U as dead by construction, 2 to J, 20 unreached with a named mechanism), 0
functions (every S function ran). Of the 222 arms untaken now, 47 are these and 175 are T9's J and U arms (T9 listed
179: four were taken incidentally by site rows); the 68 untaken functions are T9's J 28 and U 40.

## T12 corrections (2026-10-30)

- **S11 → J.** `ModelOrderPortComparator.ts:190 checkPortModelOrder` is a public facade with no Java caller outside the
  comparator (`ModelOrderPortComparator.java:216,260` call it internally; `NorthSouthPortPreprocessor.java:377-392` is
  private and never does), so no row reaches the facade: unit-tested in `ModelOrderPortComparator.test.ts`, not a site
  arm. The other S11 arms are taken by `sites/ModelOrder/northSouth`.
- **U dead → S13.** `AbstractBarycenterPortDistributor.ts:321 if[1]` (a dummy port with the origin port but no edge) is
  taken by `sites/NorthSouth/selfLoops/sameSide`, as are `:303 if[1]` and `:318 if[1]`: the same-side self loop is
  detached (`g0/e1`, null ends), so its dummy ports carry the origin but no edges. Anchored by the
  `AbstractBarycenterPortDistributor` site-row case.
- **Confirmed U dead by the directory runs:** `MedianHeuristic.ts:125`, `:138`, `:166`, `:171`, `:173` (the free node
  is never in the reference layer; `calculateMedians` weights every node), `BarycenterHeuristic.ts:407-411`,
  `LayerSweepCrossingMinimizer.ts:346 if[0]`, `NorthSouthPortPreprocessorDummies` old-approach arms
  (`USE_NEW_APPROACH = true`), `PortListSorter.ts:89`, `:195`.
- **Anchored cases (T12a–c):** 88 site-row cases over 32 test files (p3order + counting 29 over 13 files, greedyswitch
  + preserveorder 39 over 12, the processors 20 over 7) plus six structural cases; every S row of the map is cited by at
  least one case. Per-directory branch coverage with the generic replay: p3order 96.85 %, greedyswitch + preserveorder
  92.6 %, the eight processors 93.61 %; every class is at or above 90 % except `MedianHeuristic` 73.1,
  `SwitchDecider` 77.6, `NorthSouthPortPreprocessorDummies` 80.8, `ModelOrderNodeComparatorHelperDummies` 83.3,
  `PortSideProcessor` 87.5, `ModelOrderPortComparatorIncoming` 88.2, `LongEdgeSplitter` 88.9 and
  `SortByInputModelProcessor` 89.3, whose remainders are the U (nested, label-dummy, dead) and unreached arms above.
