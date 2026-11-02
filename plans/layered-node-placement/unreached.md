<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7d branches unreached by the oracle replay (T9, L4 under X5, N11)

Measured 2026-11-02 on `feature/layered-node-placement` after T8 (`test(T8)`): one run of the generic placement replay
alone with v8 coverage over `p4nodes/**` and `intermediate/**` (test files excluded), 1-minute load 14.5 (coverage is
load-independent), then filtered to the 7d classes: `src/alg/layered/p4nodes/**` and the five processors
`intermediate/{InnermostNodeMarginCalculator,LabelAndNodeSizeProcessor,InLayerConstraintProcessor,HierarchicalPortDummySizeProcessor,NodePlacementRepeater}.ts`
(the 7b/7c processors in the same directory, the staged `DebugUtil` and the enums' throwing arms are outside the measure):

```bash
npx vitest run --coverage --coverage.include='src/alg/layered/{p4nodes,intermediate}/**' \
  --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text \
  --coverage.reportsDirectory=<scratch>/T9/cov src/alg/layered/LayeredPlacementVectors.test.ts
```

607 tests pass (602 rows + 5 count checks). Totals over the 7d classes: 635 branches of which **127** untaken, 264
functions of which **39** uncovered, 1,783 statements of which 224 uncovered; the threshold error the run prints
reflects the unfiltered include list. Fully covered by the replay: `InnermostNodeMarginCalculator`,
`InLayerConstraintProcessor`, `HierarchicalPortDummySizeProcessor` (branches; its `delta`/`step` values are proven by
reading only, see `.agent-notes`), `NodePlacementRepeater`, `BKAligner`, `BKCompactor` and its nested types,
`ThresholdStrategyNullThresholdStrategy`, `ThresholdStrategyPostprocessable`, `NeighborhoodInformationNeighborComparator`,
`ICompactor`, `NetworkSimplexPlacerNodeRep`/`EdgeRep`/`Weights`/`Constants`/`State`, `LinearSegmentsNodePlacerPostProcess`,
`LinearSegmentsNodePlacerProperties`. Every untaken site appears exactly once below (branch arms as v8 numbers them:
`if[0]` the consequent, `if[1]` the alternative, `binary-expr[k]` the k-th operand, `cond-expr[0]` the true arm,
`switch[k]` the k-th case; a classification script in the T9 scratchpad checked the partition):

| Category | Meaning | Branches | Functions |
| -------- | ------- | -------- | --------- |
| S1–S14 | Numeric or algorithmic behaviour: an oracle step scenario (T11 row, T12 anchored test) | 77 | 14 |
| J | Structural behaviour with Java-derived expectations: the five `getLayoutProcessorConfiguration`s, enum surfaces, `toString`s, `equals`/`hashCode`/`compareTo`, the N6 loop entry check, the `monitor.isLoggingEnabled()` arms and the debug `toString` helpers (N8, pinned by T6's logging case), exception branches (the recorder records no row for a throwing step) | 38 | 25 |
| U | Dead by construction (table below); no nested-graph, label-dummy or before-P5 site exists among the untaken 7d sites | 11 | 0 |
| X | The staged `DebugUtil` call (N8) | 1 | 0 |

## Scenarios

Each scenario is one inline ELK JSON graph (`input: { elk }`) plus the step list in T1's op vocabulary; several rows may
share a graph and differ in one option or step. Unless stated, the steps are the plan the pipeline would run, as the 84
`scenarios/*` rows do: `importGraph`, `normalise`, `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER`, `runPhase P1 GREEDY`,
`LAYER_CONSTRAINT_PREPROCESSOR`, `runPhase P2 NETWORK_SIMPLEX`, `LAYER_CONSTRAINT_POSTPROCESSOR`
(`HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR` on a hierarchical target), the before-P3 processors the graph needs
(`LONG_EDGE_SPLITTER`, `PORT_SIDE_PROCESSOR`, `INVERTED_PORT_PROCESSOR`, `PORT_LIST_SORTER`, `NORTH_SOUTH_PORT_PREPROCESSOR`),
`runPhase P3 LAYER_SWEEP`, `TWO_SIDED_GREEDY_SWITCH`, `IN_LAYER_CONSTRAINT_PROCESSOR`, `LABEL_AND_NODE_SIZE_PROCESSOR`,
`INNERMOST_NODE_MARGIN_CALCULATOR` (`HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` with external ports), then
`runPhase P4_NODE_PLACEMENT <S>` and `dump`. Options live in the graph's `layoutOptions` (no `setProperty` step
needed). `expected` is the N3 shape; the last column names the fields T12 asserts. Rows under ten nodes carry the full
dump. Ids are `sites/<Class>/<name>`. Where reachability is uncertain the row says "T11 verifies": a branch the oracle
cannot reach moves to U with its mechanism in the T11 corrections, as 7b and 7c did. One graph family serves S4, S8
and S12 (an inverted-port graph placed by each of the three placers); S9, S10 and S7 share the flexible-node graphs.

| # | Scenario id | TS sites (file:line arm) | Graph | Steps / options | Expected shape |
| - | ----------- | ------------------------ | ----- | --------------- | -------------- |
| S1 | `sites/LabelAndNodeSize/externalPortLabels/*` | `LabelAndNodeSizeProcessor.ts:91 if[1]`, `:212 if[1]`, `:123 if[0]`, `:126 if[0,1]`, `#determineBoxPosition` (`:121`), `#placeLabels` (`:132`), `#placeInsideBox` (`:145`) with `:148 switch[0]`, `:153 switch[1]`, `:158 switch[2]`, `:163 switch[3]`, `#placeInsideBoxY` (`:175`) with `:177 if[0]`, `:178 cond-expr[0,1]`, `:180 if[1]`, `#placeOutsideBox` (`:186`) with `:189 switch[0]`, `:190 switch[1]`, `:194 switch[2]`, `:195 switch[3]`, `:196 if[0]`, `:197 cond-expr[0,1]`, `:199 if[1]`, `#labelNextToPort` (`:234`) with `:235 if[0,1]`, `:238 if[0,1]`, `:239 binary-expr[0,1]` | a hierarchical target with 3–4 children and one external port per side (N, S, E, W), each port carrying a label (two labels on one port for the group box, `treatAsGroup`), some ports connected and one unconnected (`LabelAndNodeSizeProcessor.java:95-175`: no replayed row has an external-port dummy with a label) | `importGraph <target>`; rows: `outside` (default `portLabels.placement`), `inside` (`portLabels.placement=[INSIDE]`), `fixed` (`[]`, the TODO arm at `:126 if[1]`), each with and without `portLabels.placement` `NEXT_TO_PORT_IF_POSSIBLE`; stop `runProcessor LABEL_AND_NODE_SIZE_PROCESSOR` | `geometry.labels` (the dummy port labels), `geometry.ports`, `geometry.nodes` |
| S2 | `sites/Interactive/originalDummyPosition` | `InteractiveNodePlacer.ts:125 if[1]` | 4 nodes with seeded positions and one long edge (a `LONG_EDGE` dummy) | `runPhase P3 INTERACTIVE` (sets `ORIGINAL_DUMMY_NODE_POSITION` on the dummy, `InteractiveCrossingMinimizer.java:119`), then `runPhase P4 INTERACTIVE` (`InteractiveNodePlacer.java:107-117`) | `geometry.nodes` (the dummy's `y`), `layers` |
| S3 | `sites/LinearSegments/dependencyCycle/*` | `LinearSegmentsNodePlacerCreation.ts:280 if[0]`, `:303 if[0]`, `splitCurrentSegment` (`:325`) with `:328 if[0,1]`, `:337 if[0]`, `:340 if[1]`, `removeEqual` (`:347`, its lambda `:348`, `:349 if[0]`); `LinearSegmentsNodePlacerLinearSegment.split` (`:51`), `equals` (`:75`, `:76 if[0,1]`) | two long edges whose dummies cross between two layers (X above Y in layer k, Y above X in layer k+1) so the segment X appears after Y in one layer and before it in the next (`LinearSegmentsNodePlacer.java:378-413`) | `firstInLayer`: the split node is the first of its layer (`previousNode == null`); `behindNode`: a NORMAL node precedes it in the layer (`previousNode != null`: the `remove` and the `incomingCount` arms); stop `runPhase P4 LINEAR_SEGMENTS` | `geometry.nodes`, `layers`, `changed` (`linearSegments.inputPrio`/`outputPrio`) |
| S4 | `sites/LinearSegments/invertedPorts` | `LinearSegmentsNodePlacerCreation.ts:406 if[1]` | 4 nodes, `portConstraints=FIXED_SIDE`, one edge entering an EAST input port and one leaving a WEST output port (`INVERTED_PORT_PROCESSOR` creates in-layer edges and `LONG_EDGE` dummies in the node's own layer; a dummy's successor in the same layer is the arm, `LinearSegmentsNodePlacer.java:496`) | the plan incl. `INVERTED_PORT_PROCESSOR`; stop `runPhase P4 LINEAR_SEGMENTS` (the same graph is S8's and S12's row with the other placers) | `geometry.nodes`, `layers` |
| S5 | `sites/LinearSegments/straightnessPriority` | `LinearSegmentsNodePlacerBalancing.ts:241 if[1]` | 5 nodes where a node has two incoming edges with `priority.straightness` 1 and 0 (the lower one is skipped by `prio >= minPrio && prio >= otherPrio`, `LinearSegmentsNodePlacer.java:691-709`) | stop `runPhase P4 LINEAR_SEGMENTS`; a second row with the priorities swapped | `geometry.nodes`, `changed` (the prio properties) |
| S6 | `sites/NetworkSimplex/fractionalAnchor` | `NetworkSimplexPlacer.ts:221 if[0]` | a flexible node (`nodeFlexibility=PORT_POSITION`) whose port has `port.anchor` with a fractional `y` (7.5) in the ELK JSON (`NetworkSimplexPlacer.java:327-335`: `anchorMustBeInteger`) | stop `runPhase P4 NETWORK_SIMPLEX` | `geometry.ports`, `geometry.nodes`, `changed` (the anchor) |
| S7 | `sites/NetworkSimplex/flexibleLabels/*` | `NetworkSimplexPlacerApply.ts:58 if[1]`, the SOUTH-port lambda (`:68`), `:74 if[0]`, `:76 if[0]` | a `NODE_SIZE_WHERE_SPACE_PERMITS` node with EAST/WEST ports, one NORTH and one SOUTH port, and a node label; neighbours taller than it so its size grows (`NetworkSimplexPlacer.java:748-783`) | `bottom`: `nodeLabels.placement=[V_BOTTOM, H_CENTER, INSIDE]`; `center`: `V_CENTER`; `top`: `V_TOP` (no adjustment; proves the else); stop `runPhase P4 NETWORK_SIMPLEX` | `geometry.labels`, `geometry.ports`, `geometry.nodes` (size) |
| S8 | `sites/NetworkSimplex/inLayerEdges` | `NetworkSimplexPlacerAuxiliaryEdges.ts` in-layer lambda (`:21`) with `:24 cond-expr[0,1]`, `:32 if[0]`, `:36 if[1]`; `NetworkSimplexPlacerPaths.ts:24 if[0]`, `:55 if[0]`, `:61 if[0]`, `:109 if[0]`, `:130 if[0]`, `:145 if[0]` (T11 verifies `:145`: `closeEdge` with no open edge needs an incoming WEST edge whose source has no EAST-side counterpart, `NetworkSimplexPlacer.java:1338`) | the S4 graph (inverted ports both ways: a dummy above and one below its port's node, `NetworkSimplexPlacer.java:600-640`), plus a junction node (degree ≠ 2) whose edges include an in-layer one | stop `runPhase P4 NETWORK_SIMPLEX` | `geometry.nodes`, `layers` |
| S9 | `sites/NetworkSimplex/flexiblePorts/*` | `NetworkSimplexPlacerAuxiliaryEdges.ts:54 if[1]`, `:67 if[1]`; `NetworkSimplexPlacerFlexibleNode.ts:33 if[0]`; `NetworkSimplexPlacerPath.ts:63 if[0]` | `unconnected`: a flexible node with an edgeless EAST port (no dummy for it, `NetworkSimplexPlacer.java:560-575`); `overflow`: a `NODE_SIZE_WHERE_SPACE_PERMITS` node whose WEST ports do not fit its height (`isFlexibleNode` `:894-925` returns false at the west check); `junctionPath`: a `NODE_SIZE_WHERE_SPACE_PERMITS` node of degree 3 that starts a long path (`containsFlexibleNode` on the first node, `:974-985`) | stop `runPhase P4 NETWORK_SIMPLEX` | `geometry.ports`, `geometry.nodes` |
| S10 | `sites/NetworkSimplex/twoPaths/*` | `NetworkSimplexPlacerPath.ts:49 if[0]`, `:79 if[0]`, `clear` (`:34`); `NetworkSimplexPlacerStraightEdges.ts:174 if[1]` | `crossingLeftEnd`: a two-path u–c–v whose left end is cut by a crossing edge so the walk starts at the right junction and the path is recorded backwards (`follow` `NetworkSimplexPlacer.java:1248-1265`, `orderTwoPath` `:990-998`; T11 verifies); `blocked`: a two-path whose centre node is blocked above and below (cases C/D of `improveTwoPath`, `:1150-1176`) | stop `runPhase P4 NETWORK_SIMPLEX` | `geometry.nodes` |
| S11 | `sites/BK/type1Conflict` | `BKNodePlacerConflicts.ts:61 if[0]` | three layers: an inner segment (dummy→dummy) crossing a non-inner segment (`BKNodePlacer.java:355-378`; every replayed row logs `Marked edges: []`) | stop `runPhase P4 BRANDES_KOEPF`; a second row with `fixedAlignment=LEFTUP` | `geometry.nodes`, `layers` |
| S12 | `sites/BK/inLayerEdges` | `NeighborhoodInformation.ts:107 if[0]`, `:139 if[0]`; `ThresholdStrategySimpleThresholdStrategy.ts:88 if[0]`, `:192 if[0]` | the S4 graph under BK (in-layer edges are skipped as neighbours, `NeighborhoodInformation.java:160,183`, and in the threshold search, `ThresholdStrategy.java:231,290`); a `selfLoop` variant with a self loop on a `FIXED_SIDE` node and the steps omitting `SELF_LOOP_PREPROCESSOR` (7g, the 7c S13 precedent) | stop `runPhase P4 BRANDES_KOEPF` | `geometry.nodes` |
| S13 | `sites/BK/straightnessPriority` | `NeighborhoodInformation.ts:111 if[0]`, `:115 if[1]`, `:143 if[0]`, `:147 if[1]` | a node with two incoming and two outgoing edges whose `priority.straightness` differ (the first edge seen has the lower priority so `maxPriority` rises and the earlier pair is dropped, `NeighborhoodInformation.java:158-170,181-193`) | stop `runPhase P4 BRANDES_KOEPF` | `geometry.nodes` |
| S14 | `sites/BK/infeasible` | `BKNodePlacer.ts:230 if[1]`, `:239 if[1]`, `:249 if[0]`; `BKNodePlacerFeasibility.ts:32 if[0]`, `:68 if[1]`; `BKAlignedLayout.ts:193 if[1]`, `:242 if[1]` | a layout that `checkOrderConstraint` rejects (nodes of one layer overlap after compaction, `BKNodePlacer.java:577-625`): north/south port dummies and in-layer constraints with `fixedAlignment=BALANCED` are the candidates; `:193`/`:242` are a block with no lower neighbour inside `getMinY`/`getLowerNeighbor` on the last node of a layer (T11 verifies all seven; the Java comment at `:248` says the balanced layout "is broken for any reason" cases exist) | stop `runPhase P4 BRANDES_KOEPF` with `fixedAlignment=BALANCED` and a logging-free run | `geometry.nodes`, `layers` |

## J: structural, Java-derived, unit-tested (38 branches, 25 functions)

- `getLayoutProcessorConfiguration` of `SimpleNodePlacer` (`:45`, `:46 if[0]`, `:48 if[1]`), `InteractiveNodePlacer`
  (`:52`, `:53 if[0]`, `:55 if[1]`), `LinearSegmentsNodePlacer` (`:63`, `:64 if[0]`, `:66 if[1]`),
  `NetworkSimplexPlacer` (`:74`, `:75 if[0]`, `:77 if[1]`), `BKNodePlacer` (`:79`, `:80 if[0]`, `:82 if[1]`): the replay
  runs phases through `create().process()`; T5–T7 pin each configuration (null without external ports,
  `HIERARCHICAL_PORT_POSITION_PROCESSOR` before P5 with them, one cached instance). Owner: the placer test files.
- Enum surfaces: `LinearSegmentsNodePlacerMode.ts` `name` (`:21`), `ordinal` (`:25`), `toString` (`:29`);
  `BKAlignedLayoutHDirection.ts` and `BKAlignedLayoutVDirection.ts` `valueOf` lambda (`:35`), `:36 if[0,1]`, `ordinal`
  (`:44`), `name` (`:48`), `toString` (`:52`). Owner: T5's and T6's tests.
- `toString`s: `LinearSegmentsNodePlacerLinearSegment.toString` (`:67`, its lambda `:68`); `BKAlignedLayout.toString`
  (`:262`, `:264 if[0]`, `:266 if[0,1]`, `:269 if[0]`, `:271 if[0,1]`, `:273 if[1]`: pinned by T6's logging case and the
  `toString` table). `LinearSegmentsNodePlacerLinearSegment.compareTo` (`:71`), `hashCode` (`:82`).
- The N6 loop entry check `LinearSegmentsNodePlacerCreation.ts:368 if[0]` (`fillSegment` on a node with an id):
  `sortLinearSegments` calls it only for `node.id < 0` (`LinearSegmentsNodePlacer.java:249-252`); the Java reaches the
  check only through the recursive call the loop replaced; the twin test owns it.
- N8 logging arms and helpers, pinned by T6's `withLogging(true)` case on recorded rows: `BKNodePlacer.ts:130 if[0]`,
  `:171 if[0]`, `:298 binary-expr[1]` (a null root in `getBlocks`, reached by `getClasses` on a balanced layout),
  `:327 if[0,1]`, `:334 if[0,1]` (`getClasses` is called by the log line only, `BKNodePlacer.java:277-281`);
  `BKNodePlacerFeasibility.ts:37 if[0]`, `:70 if[0]`; `BKNodePlacerDebug.ts` `elementToString` (`:5`, `:6 binary-expr[0,1]`),
  `collectionToString` (`:15`), `mapToString` (`:24`, its lambda `:25`).
- Exception branches (the recorder records no row for a throwing step; T12 pins the throw):
  `LinearSegmentsNodePlacerCreation.ts:204 if[0]` (an empty layer is skipped here, then `mergeRegions` calls `next()`
  unguarded, `LinearSegmentsNodePlacer.java:770`: the whole placer throws on an empty layer, the 7b `layers` op can
  build one); `NetworkSimplexPlacerPath.ts:74 if[0]` (`IllegalStateException("Order only allowed for two paths.")`,
  `NetworkSimplexPlacer.java:990`); `ThresholdStrategy.ts:87 if[1]` (`IllegalArgumentException` for a node on neither
  end of the edge, `ThresholdStrategy.java:120`).

## U: dead by construction (11 branches)

| Site | Reason (Java line) |
| ---- | ------------------ |
| `LabelAndNodeSizeProcessor.ts:168 switch[4]`, `:204 switch[4]` | TS exhaustiveness `default` arms; the Java switches over `EXT_PORT_SIDE` have no default (`LabelAndNodeSizeProcessor.java:119,154`) and the importer sets a concrete side on every external-port dummy (`LGraphUtil.java:964`) |
| `LinearSegmentsNodePlacer.ts:130 if[1]` | `nodeCount[layerIndex]` is incremented on the line before the `> 0` test (`LinearSegmentsNodePlacer.java:536-540`) |
| `LinearSegmentsNodePlacerCreation.ts:349 if[1]` | `List.remove(Object)` not finding the segment: the dependency `previousNode → currentSegment` was added unconditionally when `previousNode` was current (`LinearSegmentsNodePlacer.java:421`) |
| `NetworkSimplexPlacerFlexibleNode.ts:28 if[0]`, `NetworkSimplexPlacerGraphBuilding.ts:170 if[0]` | `spacing.portsSurrounding` defaults to `new ElkMargin(0)`, never null (`src/core/options/CoreOptions.ts:960`, generated from `Core.melk`); only an explicit `setProperty(…, null)` reaches the arm and no importer does that |
| `NetworkSimplexPlacerPath.ts:46 if[0]`, `:59 if[0]` | `containsLongEdgeDummy`/`containsFlexibleNode` run only on paths of three or more edges (`NetworkSimplexPlacer.java:1035-1050`) |
| `NetworkSimplexPlacerStraightEdges.ts:41 if[0]` | `identifyPaths` keeps paths of two or more edges only (`NetworkSimplexPlacer.java:1239-1241`) |
| `NetworkSimplexPlacerStraightEdges.ts:216 if[0]`, `:251 if[0]` | two-paths with a flexible centre are filtered at `:1039-1041` (`isTwoPathCenterNodeFlexible`), so the centre's rep origin is always an `LNode` and never flexible in `move` (`:1127`, `:1131` assert) |

## X (1 branch)

`LinearSegmentsNodePlacerCreation.ts:216 if[0]`: the `DebugUtil.logDebugGraphSegments` call behind
`monitor.isLoggingEnabled()`, staged for 7f (N8); T5 pins the staged throw.

## Counts

14 scenario ids (S1–S14; stop 9 is about 25) over 10 graph families; T11 records them, T12 anchors one test per row.
Branches: S 77 / J 38 / U 11 / X 1 = 127; functions: S 14 / J 25 / U 0 / X 0 = 39.

## T11 corrections (2026-11-02)

T11 recorded 26 `sites/*` rows (every S1–S14 id has rows; six planned variants were not recorded to stay under the
5 MiB cap: `externalPortLabels/inside`, the two `straightnessPriority/swapped`, `BK/type1Conflict/leftUp`,
`BK/inLayerEdges/selfLoop`, `NetworkSimplex/twoPaths/blocked`, whose arms the kept rows reach; the `models` group's
BK matrix was restricted to two variant models, see the journal). Per-row v8 coverage attributed every S arm to a row
except the following, which move to **U** or **J** with the agent's mechanism (the counts above become S 65 / 14,
J 39 / 25, U 22 / 0, X 1 / 0):

| Site | New category | Mechanism |
| ---- | ------------ | --------- |
| `LinearSegmentsNodePlacerLinearSegment.ts:76 if[1]` | J | `equals` with a non-segment: `removeEqual` passes segments only (`LinearSegmentsNodePlacer.java:400`); T5's `equals` unit case owns the arm |
| `NetworkSimplexPlacerStraightEdges.ts:174 if[1]` | U (Medium, by reading) | the "neither case A nor B" arm of `improveTwoPath` (`NetworkSimplexPlacer.java:1160-1176`): with the centre off the straight line the two `notStraightBy` values have opposite signs, which is case C or D, and with the centre on the line both edges are straight and the method returned at `:1121`; two designed rows reached case B only |
| `ThresholdStrategySimpleThresholdStrategy.ts:192 if[0]` | U | `pickEdge` (`ThresholdStrategy.java:231`, TS `:88`) already skips in-layer edges unless `onlyDummies`, so the edge reaching `:290` (TS `:192`) is in-layer only when `onlyDummies` is true: dead by construction |
| `BKNodePlacer.ts:230 if[1]`, `:239 if[1]`, `:249 if[0]`; `BKNodePlacerFeasibility.ts:32 if[0]`, `:68 if[1]` | U (High, by experiment) | an infeasible BK layout needs two nodes of one layer to overlap after compaction; every one of the four layouts keeps layer neighbours at least their spacing apart and the balanced layout takes order statistics of the same four values, so `checkOrderConstraint` never finds an overlap (`BKNodePlacer.java:577-625`; the Java comment at `:248`). Evidence: 52,000 random flat graphs (5–28 nodes, N/S/E/W ports, labels, heights 10–200, `BALANCED` and `NONE`) logged about 100,000 `is feasible` checks with no `breaks on`; 60 random rows replayed under coverage hit only the feasible arms |
| `LabelAndNodeSizeProcessor.ts:168 switch[4]`, `:204 switch[4]` | U (unchanged) | confirmed: with the processor in the plan, `HierarchicalPortConstraintProcessor` replaces N/S external dummies by label-less copies at `FIXED_SIDE` or higher (`HierarchicalPortConstraintProcessor.java:215-217,235-246`), and under `FREE` the importer derives E/W sides from the flow (`LGraphUtil.java:818-824`); the NORTH/SOUTH label-box arms (`:148 switch[0]`, `:153 switch[1]`, `:189 switch[0]`, `:190 switch[1]`) are therefore reachable only on the six S1 rows, whose chains omit `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR` and the greedy switch deliberately (chain flag `x`); `sites/NetworkSimplex/inLayerEdges/westOutput` likewise omits `INVERTED_PORT_PROCESSOR` to reach `NetworkSimplexPlacerPaths.ts:145 if[0]` |

Rows the T11 agent added beyond the table: `NetworkSimplex/inLayerEdges/westOutput`, `NetworkSimplex/twoPaths/crossingLeftEnd/longEdge`
(a path of three or more edges whose first edge leaves a `LONG_EDGE` dummy, `NetworkSimplexPlacerPath.ts:49 if[0]`),
`BK/infeasible/lastInLayer` (found by a seeded random search and encoded explicitly: a block shifted down by the
post-processing holding the last node of its layer reaches `BKAlignedLayout.ts:193 if[1]` and `:242 if[1]`). S3, S10
and S11 use `CROSSING_MINIMIZATION_STRATEGY=INTERACTIVE` with explicit positions and `layerConstraint=FIRST` on the
sources to force a crossing in a middle gap (the layer sweep breaks ties elsewhere); those chains omit `PORT_LIST_SORTER`
and the greedy switch as the interactive minimizer's configuration does.

## T12 corrections (2026-11-02)

T12a and T12b anchored every recorded site row: 27 cases over five files (`LabelAndNodeSizeProcessor.test.ts` 6,
`InteractiveNodePlacer.test.ts` 1, `LinearSegmentsNodePlacer.sites.test.ts` 4 + the empty-layer throw,
`NetworkSimplexPlacer.sites.test.ts` 11 over 13 rows, `BKNodePlacer.sites.test.ts` 4), each `// oracle: <row id>;
<Java file:line>`, node `y`s, port and label positions and sizes copied from the row (`decodeHex`, 1e-6); every J
item is covered by an existing T5/T6/T7 case or the new throw case. T12b mutation-checked its four rows in a scratch
copy (each listed branch flips a case except `ThresholdStrategySimpleThresholdStrategy.ts:88 if[0]`, which the
`inLayerEdges` row executes without a position depending on it). Corrections:

| Site | Change | Reason |
| ---- | ------ | ------ |
| `BKNodePlacerFeasibility.ts:70 if[0]` | J → U | the "breaks on" log arm sits inside the `:68 if[1]` overlap arm, which the T11 corrections proved unreachable: no replay or logging case can enter it |

Per-class branch coverage with the generic replay and the anchored cases (directory runs): bk/ 97.19 % (277/285), the
placers and processors at 100 % except `LabelAndNodeSizeProcessor` 94.1 (the two `default` arms), `LinearSegmentsNodePlacer`
83.3 (one branch pair, the dead `:130 if[1]`), `LinearSegmentsNodePlacerCreation` 97.4 (`:349 if[1]`),
`NetworkSimplexPlacerFlexibleNode` 92.9 (`:28 if[0]`), `NetworkSimplexPlacerGraphBuilding` 94.4 (`:170 if[0]`),
`NetworkSimplexPlacerStraightEdges` 91.7 (`:41`, `:174`, `:216`, `:251`), `BKNodePlacer` 92.5 (the three infeasible arms),
`BKNodePlacerFeasibility` 60 (`:32`, `:68`, `:70`: all U), `ThresholdStrategySimpleThresholdStrategy` 98.64 (`:192`).
Every shortfall below 90 % (`LinearSegmentsNodePlacer`, `BKNodePlacerFeasibility`) is U-explained (stop 10 not
triggered). Final partition: S 65 / 14, J 38 / 25, U 23 / 0, X 1 / 0 (= 127 / 39).
