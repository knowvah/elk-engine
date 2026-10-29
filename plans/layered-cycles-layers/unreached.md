<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7b branches unreached by the oracle replay (T9, L4 under X5, B7)

Measured 2026-10-29 on `feature/layered-cycles-layers` after T8 (`test(T8)`): one run of the generic replay alone with
v8 coverage restricted to the 7b packages (test files excluded), 1-minute load 76.8 (T10's oracle sweep was running;
coverage is load-independent):

```bash
npx vitest run --coverage --coverage.include='src/alg/layered/{p1cycles,p2layers,intermediate}/**' \
  --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text \
  --coverage.reportsDirectory=<scratch> src/alg/layered/LayeredPhaseVectors.test.ts
```

619 tests pass (614 rows + 5 count checks). Totals over the 44 files the include list matches: statements 88.75 %
(2,249/2,534), branches 76.59 % (707/923), functions 81.86 % (298/364), lines 88.59 %; the threshold error the run
prints reflects the restricted include list. 216 branches and 66 functions stay untaken. Excluded before
classification: the 31 functions of the staged files (`intermediate/LabelDummySwitcher.ts`, `loops/SelfLoop{Edge,
Holder,Port}.ts`, `wrapping/BreakingPointInserter{,BPInfo}.ts`; `test/architecture/staged-classes.json`) and the 51
branches and 5 functions of `IntermediateProcessorStrategy.ts` (the 49 throwing arms, the `default` arm and the chain's
fall-throughs, X). The remaining 165 branches and 30 functions each appear exactly once below:

| Category | Meaning | Branches | Functions |
| -------- | ------- | -------- | --------- |
| S1–S16 | Numeric or algorithmic behaviour: an oracle step scenario (T11 row, T12 anchored test) | 83 | 3 |
| J | Structural behaviour with Java-derived expectations: the phase configurations (every batch-2 test asserts them), `Integer.compare` arms, `Iterator.next()`/`List.get` exceptions, the `HiddenNodeConnections` enum surface, the exception branches (`UnsupportedConfigurationException`, `IllegalStateException`, `IllegalArgumentException`: the recorder records no row for a throwing step, so these stay unit-tested with the Java message) | 19 | 21 |
| U | Unreachable through the 7b surface: 43 branches need label dummies (`LabelDummyInserter`, 7f; re-measured there) and 2 functions with them; 20 branches and 4 functions are dead by construction or unused in the Java (list after the tables) | 63 | 6 |

Fully covered by the replay: `BiLinkedHashMultiMap`, `HighDegreeNodeLayeringProcessorHighDegreeNodeInformation`,
`NodePromotionHeuristic`, `NodePromotionState`, `PartitionPostprocessor`, `ReversedEdgeRestorer`,
`MinWidthLayeringComputation`.

## Scenarios

Each scenario is one inline ELK JSON graph (`input: { elk }`, B5) plus a step list in T1's op vocabulary
(`importGraph`, `normalise`, `setProperty`, `layers`, `reverseEdge`, `runProcessor`, `runPhase`, `dump`); several
rows may share a graph and differ in one step. `expected` is the B2 shape (`layers`, `layerless`, `hidden`, `edges`
with `reversed`, `changed`) plus the full dump for graphs under 10 nodes; the column names the fields T12 asserts.
Ids are `sites/<Class>/<name>`. Where a scenario needs nodes without `MODEL_ORDER` or of type `EXTERNAL_PORT`, the
graph is a hierarchical model imported at a `target` whose ports carry edges (the flat importer creates the external
port dummies; no 7b class can create a label dummy, see U). `STRETCH_WIDTH` runs only on graphs without zero-size nodes
and without self-loops (agent notes: both hang, faithfully).

| # | Class | Lines / branch | Scenario id | Graph | Steps | Expected shape |
| - | ----- | -------------- | ----------- | ----- | ----- | -------------- |
| S1 | `BFSNodeOrderCycleBreaker` | `:218 if[0]` (group model order) | `sites/GroupModelOrder/cycleBreakers` | 8 nodes: two cycles sharing a node plus an acyclic tail (singleton SCCs); root options `considerModelOrder.strategy=NODES_AND_EDGES`, `…groupModelOrder.cycleBreaking.groupOrderStrategy=ENFORCED`, node group ids `…cycleBreaking.id` in {0, 1, 2}, root `…cbPreferredSourceId=1` and `…cbPreferredTargetId=2` so one component's minimum node is a preferred source and another's maximum a preferred target; one component where the minimum node has more incoming edges than the maximum has outgoing; the target node has WEST/EAST ports with edges so two `EXTERNAL_PORT` dummies without `MODEL_ORDER` exist | `importGraph <target>`, `normalise`, `runPhase P1_CYCLE_BREAKING <S>`, `dump`, one row per `S` ∈ {`BFS_NODE_ORDER`, `DFS_NODE_ORDER`, `GREEDY_MODEL_ORDER`, `SCC_NODE_TYPE`, `SCC_CONNECTIVITY`} | `edges[].reversed`, `changed` (`REVERSED`, `MODEL_ORDER` scaling) |
| S1 | `DFSNodeOrderCycleBreaker` | `:218 if[0]` | `sites/GroupModelOrder/cycleBreakers` | as above | as above | as above |
| S1 | `GreedyModelOrderCycleBreaker` | `:34 if[1]` (node without `MODEL_ORDER`), `:44 if[0]` (fallback to `chooseNodeWithMaxOutflow`) | `sites/GroupModelOrder/cycleBreakers` | as above; the fallback needs a source-candidate set of dummies only, so one component consists of the two external port dummies and one node | as above | as above |
| S1 | `GroupModelOrderCalculator` | `:49 if[1]` | `sites/GroupModelOrder/cycleBreakers` | as above | as above | as above |
| S1 | `SCCNodeTypeCycleBreaker` | `:38 if[0]`, `:48 if[0]`, `:56 if[0..1]`, `:60 if[0]`, `:68 if[0..1]`, `:80 if[0]`, `:82 if[0..1]` | `sites/GroupModelOrder/cycleBreakers` | as above | as above | as above |
| S1 | `SCConnectivity` | `:37 if[0]`, `:44 if[0]`, `:46 if[0..1]` | `sites/GroupModelOrder/cycleBreakers` | as above | as above | as above |
| S2 | `GreedyCycleBreaker` | `:276 if[0]` (negative `PRIORITY_DIRECTION` clamped to 0) | `sites/GreedyCycleBreaker/negativePriority` | 3-node cycle, one edge `priority.direction=-1`, another `=2` | `importGraph`, `normalise`, `runPhase P1_CYCLE_BREAKING GREEDY`, `dump` | `edges[].reversed` |
| S3 | `InteractiveCycleBreaker` | `:128 if[0]` (node on the current path: cycle) | `sites/InteractiveCycleBreaker/pathCycle` | 4 nodes with x positions such that one edge points left and the induced graph still has a cycle (two nodes at equal x) | `importGraph`, `normalise`, `runPhase P1_CYCLE_BREAKING INTERACTIVE`, `dump` | `edges[].reversed` |
| S4 | `BreadthFirstModelOrderLayerer` | `:75 if[1]` (non-NORMAL node), `:81 if[1]` (node without `MODEL_ORDER`) | `sites/ModelOrderLayerers/externalPorts` | hierarchical target, 6 children in a DAG with one 3-long edge, WEST and EAST ports on the target connected to children (`EXTERNAL_PORT` dummies); root `considerModelOrder.strategy=NODES_AND_EDGES` | `importGraph <target>`, `normalise`, `runPhase P2_LAYERING <L>`, `dump`, one row per `L` ∈ {`BF_MODEL_ORDER`, `DF_MODEL_ORDER`, `MIN_WIDTH`, `STRETCH_WIDTH`} | `layers`, `layerless`, `changed` |
| S4 | `DepthFirstModelOrderLayerer` | `:149 if[1]`, `:155 if[1]` | `sites/ModelOrderLayerers/externalPorts` | as above | as above | as above |
| S4 | `MinWidthLayerer` | `:152 if[0]` (dummy skipped in the degree counts) | `sites/ModelOrderLayerers/externalPorts` | as above | as above | as above |
| S4 | `StretchWidthLayerer` | `:340 if[0]` (dummy skipped in the size average) | `sites/ModelOrderLayerers/externalPorts` | as above (no zero-size node, no self-loop) | as above | as above |
| S4 | `NodePromotionModelOrder` | `:88 if[0]` (candidate rejected), `:123 if[0]` (no `MODEL_ORDER`), `:145 if[1]`, `:191 if[1]` (node already in the next layer) | `sites/ModelOrderLayerers/externalPorts` | as above, layered by `LONGEST_PATH_SOURCE` (L2R) and `LONGEST_PATH` (R2L) as the Java test pairs them | `importGraph <target>`, `normalise`, `setProperty g0 …nodePromotion.strategy <P>`, `runPhase P2_LAYERING <L>`, `runProcessor NODE_PROMOTION`, `dump`; rows (`MODEL_ORDER_LEFT_TO_RIGHT`, `LONGEST_PATH_SOURCE`) and (`MODEL_ORDER_RIGHT_TO_LEFT`, `LONGEST_PATH`) | `layers`, `changed` |
| S4 | `NodePromotionPrecalculation` | `:19 if[1]`, `:32 if[1]` (comparators with a node lacking `MODEL_ORDER`) | `sites/ModelOrderLayerers/externalPorts` | as above | as above | as above |
| S5 | `CoffmanGrahamLayerer` | `:290 if[1]` (id tie-break `u.id > v.id`), `:295 if[0]` (`!hasNextU`) | `sites/CoffmanGrahamLayerer/topoTies` | 6 nodes: two sinks with identical predecessor sets (equal `inTopo` lists, exhausted together, ordered by id both ways) and one sink whose list is a strict prefix of another's | `importGraph`, `normalise`, `runPhase P2_LAYERING COFFMAN_GRAHAM`, `dump` | `layers` |
| S6 | `CoffmanGrahamLayerer` | `:71 if[0]` (no nodes) | `sites/Layerers/emptyGraph` | a target node with no children and no ports | `importGraph <target>`, `normalise`, `runPhase P2_LAYERING <L>`, `dump`, one row per `L` ∈ {`COFFMAN_GRAHAM`, `STRETCH_WIDTH`, `NETWORK_SIMPLEX`}, plus one row `runProcessor LAYER_CONSTRAINT_POSTPROCESSOR` | `layers: []`, `layerless: []` |
| S6 | `StretchWidthLayerer` | `:87 if[0]` | `sites/Layerers/emptyGraph` | as above | as above | as above |
| S6 | `NetworkSimplexLayerer` | `:263 if[0]` (`theNodes.length < 1`) | `sites/Layerers/emptyGraph` | as above | as above | as above |
| S6 | `LayerConstraintPostprocessor` | `:37 if[1]` (no layers) | `sites/Layerers/emptyGraph` | as above | as above | as above |
| S7 | `InteractiveLayerer` | `:127 if[1]` (merge of two overlapping layer spans), `:162 if[1]` (self-loop) | `sites/InteractiveLayerer/spansAndSelfLoop` | 5 nodes with x/width such that three spans overlap pairwise and are merged, one node with a self-loop | `importGraph`, `normalise`, `runPhase P2_LAYERING INTERACTIVE`, `dump` | `layers`, `edges[].reversed` |
| S8 | `LongestPathLayerer` | `:152 if[1]` (self-loop skipped) | `sites/Layerers/selfLoop` | 4-node path with a self-loop on the second node and one edge `priority.direction` unset | `importGraph`, `normalise`, `runPhase P2_LAYERING <L>`, `dump`, one row per `L` ∈ {`LONGEST_PATH`, `LONGEST_PATH_SOURCE`, `NETWORK_SIMPLEX`, `MIN_WIDTH`} | `layers` |
| S8 | `LongestPathSourceLayerer` | `:152 if[1]` | `sites/Layerers/selfLoop` | as above | as above | as above |
| S8 | `NetworkSimplexLayerer` | `:216 if[0]` (self-loop not an edge of the network) | `sites/Layerers/selfLoop` | as above | as above | as above |
| S8 | `MinWidthLayerer` | `:292 if[1]`, `:312 if[1]` (self-loop in the degree counts) | `sites/Layerers/selfLoop` | as above | as above | as above |
| S9 | `MinWidthLayerer` | `:229 binary-expr[1..2]`, `:229 if[1]` (a later candidate not narrower), `:266 if[0]`, `:270 if[0]` (negative option → recommended ranges) | `sites/MinWidthLayerer/ranges` | 7-node DAG with two widths reachable by different `upperBoundOnWidth`/`compensator` pairs | `importGraph`, `normalise`, `setProperty g0 …minWidth.upperBoundOnWidth {int:-1}`, `setProperty g0 …minWidth.compensator {int:-1}`, `runPhase P2_LAYERING MIN_WIDTH`, `dump`; a second row with `upperBoundOnWidth=1`, `compensator=1` | `layers` |
| S10 | `HighDegreeNodeLayeringProcessor` | `:70 if[0]` (tree height 0 = unlimited), `:193 if[0]`, `:223 if[0]` (self-loops on the high-degree node), `:306 cond-expr[1]` (`degree` with an edge selector), `:427 if[0]` (tree deeper than the threshold) | `sites/HighDegreeNodeLayeringProcessor/treeHeight` | a hub with `highDegreeNodes.threshold`-many neighbours, an incoming 3-deep tree, an outgoing 2-deep tree, a self-loop on the hub; layered by `LONGEST_PATH` first | `importGraph`, `normalise`, `setProperty g0 …highDegreeNodes.treatment true`, `setProperty g0 …highDegreeNodes.threshold {int:3}`, `setProperty g0 …highDegreeNodes.treeHeight {int:<h>}`, `runPhase P2_LAYERING LONGEST_PATH`, `runProcessor HIGH_DEGREE_NODE_LAYER_PROCESSOR`, `dump`; rows `h=0` and `h=1` | `layers`, `changed` |
| S11 | `InteractiveExternalPortPositioner` | `:82 if[1]`, `:92 if[1]` (no y found), `:105 if[1]` (`InLayerConstraint.BOTTOM`), `:114 if[1]` (x found), `:149 if[1]` (incoming edges on a N/S port) | `sites/InteractiveExternalPortPositioner/sides` | hierarchical target with one port per side: WEST with an outgoing edge, EAST with an incoming edge, NORTH with an outgoing edge, SOUTH with an incoming edge, and a second WEST port with no edge; children with positions | `importGraph <target>`, `normalise`, `runProcessor INTERACTIVE_EXTERNAL_PORT_POSITIONER`, `dump` | dummy positions (`changed`), full dump |
| S12 | `LayerConstraintPreprocessor` | `:60 cond-expr[0]`, `:63 switch[2]`, `:65 cond-expr[0]`, `:66 cond-expr[1]` (hidden-node connection kinds), `:195 switch[1]`, `:218 if[1]` | `sites/LayerConstraint/separateConnections` | 7 nodes: two `FIRST_SEPARATE` nodes, two `LAST_SEPARATE`, one `FIRST`, two free; edges FIRST_SEPARATE→free, FIRST_SEPARATE→LAST_SEPARATE (hidden to hidden), free→LAST_SEPARATE, and a free node connected to both kinds | `importGraph`, `normalise`, `runProcessor LAYER_CONSTRAINT_PREPROCESSOR`, `dump`; a second row continues `runPhase P2_LAYERING NETWORK_SIMPLEX`, `runProcessor LAYER_CONSTRAINT_POSTPROCESSOR`, `dump` | `hidden`, `layerless`, `changed` (`LAYERING_LAYER_CONSTRAINT` on opposite nodes), then `layers`, restored `edges` |
| S12 | `LayerConstraintPostprocessor` | `:73 if[1]` (no `LAST_SEPARATE` layer; a third row without LAST_SEPARATE nodes), `:171 if[0]` (hidden edge already restored by the other hidden node) | `sites/LayerConstraint/separateConnections` | as above; third row: the same graph after `setProperty <node> org.eclipse.elk.layered.layering.layerConstraint {enum LayerConstraint NONE}` on the two `LAST_SEPARATE` nodes (the op decodes C4 values only, so a constraint is cleared by setting `NONE`) | as above | as above |
| S13 | `LayerConstraintPreprocessor` | `:211 if[1]`, `:220 if[1]` (acceptable incident edge), `isAcceptableIncidentEdge` `:231` (function) and `:236 binary-expr[0..1]` | `sites/LayerConstraintPreprocessor/externalPortEdges` | hierarchical target whose WEST port is connected directly to its EAST port (edge between two `EXTERNAL_PORT` dummies, `FIRST_SEPARATE`/`LAST_SEPARATE` by the importer) plus one child | `importGraph <target>`, `normalise`, `runProcessor LAYER_CONSTRAINT_PREPROCESSOR`, `dump` | `hidden`, `changed` |
| S14 | `PartitionMidprocessor` | `:52 if[0]` (no partitioned node) | `sites/Partition/none` | 3 nodes, `partitioning.activate=true`, no partition ids | `importGraph`, `normalise`, `runProcessor PARTITION_PREPROCESSOR`, `runPhase P1_CYCLE_BREAKING GREEDY`, `runProcessor PARTITION_MIDPROCESSOR`, `dump` | `edges`, `changed: []` |
| S15 | `PartitionPreprocessor` | `:56 if[1]` (target without partition), `:72` (filter function), `:83` `reachesLowerPartition` (function), `:94 if[0..1]`, `:104 if[0..1]`, `:122 if[0]` (edge with `PRIORITY_DIRECTION`) | `sites/PartitionPreprocessor/transitive` | 5 nodes: partition 2 → unpartitioned → partition 1 (reversal through the unpartitioned node), partition 1 → unpartitioned → unpartitioned (no lower partition reached), one partition-crossing edge with `priority.direction=3` | `importGraph`, `normalise`, `runProcessor PARTITION_PREPROCESSOR`, `dump` | `edges[].reversed`, `changed` (`PRIORITY_DIRECTION`, `PARTITION_DUMMY`-free) |
| S16 | `EdgeAndLayerConstraintEdgeReverser` | `:165 if[0]` (a reversed-looking port has a `FIRST` source), `:196 if[0]`, `:263 if[0]` (edge already `REVERSED`) | `sites/EdgeAndLayerConstraintEdgeReverser/feedbackNode` | 5 nodes: one `portConstraints=FIXED_SIDE` node whose WEST ports only have outgoing edges and EAST ports only incoming (a feedback node), one of its incoming edges from a `FIRST` node; one `LAST` node with two incoming edges | `importGraph`, `normalise`, `reverseEdge <one incoming edge of the LAST node>`, `runProcessor EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER`, `dump`; a second row without the `reverseEdge` step | `edges[].reversed`, `changed` (`EDGE_CONSTRAINT`) |

## J: structural, Java-derived, unit-tested (19 branches, 21 functions)

- `getLayoutProcessorConfiguration` of all 16 phase classes (functions; the replay runs phases through `create().process()`, the batch-2 tests assert each configuration's processors per phase).
- `integerCompare` `cond-expr[0]` (`a < b`): `BreadthFirstModelOrderLayerer.ts:17` ×2, `CoffmanGrahamLayerer.ts:17`, `DepthFirstModelOrderLayerer.ts:19` ×2 (`Integer.compare`).
- `firstEdge` (`Iterator.next()` on an empty iterable throws `NoSuchElementException`): `BreadthFirstModelOrderLayerer.ts:20` (function), `:22 if[0..1]`; `DepthFirstModelOrderLayerer.ts:24 if[0]`; `NodePromotionModelOrder.ts:24` (function), `:26 if[0..1]`.
- `layerAt` `DepthFirstModelOrderLayerer.ts:37 if[0]` (`List.get` → `IndexOutOfBoundsException`).
- `HiddenNodeConnections.ordinal`/`toString` (`LayerConstraintPreprocessor.ts:43`, `:47`, functions).
- Exception branches: `InteractiveExternalPortPositioner.ts:66 if[1]` (`IllegalArgumentException`, node type), `:132 if[0]` (`IllegalStateException`, N/S port with incoming and outgoing edges); `LayerConstraintPostprocessor.ts:194 if[0..1]`, `:206 if[0..1]` (`UnsupportedConfigurationException`); `LayerConstraintPreprocessor.ts:211 if[0]`, `:220 if[0]` (`UnsupportedConfigurationException`).
- `NodePromotion.precalculateAndSetInformationModelOrder` (`NodePromotion.ts:197`, function): the public Java method (`NodePromotion.java:354`, called from `process` at `:180`); the port's `process` calls the section function directly (`:65`), leaving the method unused. T12 makes `process` call the method as the Java does.

## U: unreachable through the 7b surface (63 branches, 6 functions)

Label dummies (43 branches, 2 functions; `LabelDummyInserter` is 7f, no 7b class creates a `NodeType.LABEL` node and the
`setProperty` op cannot change a node's type; re-measure in 7f):
`BreadthFirstModelOrderLayerer.ts:146 if[0]`, `:148 binary-expr[1]`, `:168 binary-expr[3]`;
`DepthFirstModelOrderLayerer.ts:194 if[0]`, `:281 binary-expr[1]`, `:307 binary-expr[1]`, `:308 binary-expr[2]`,
`:340 if[0]`; `EdgeAndLayerConstraintEdgeReverser.ts:273 if[0]`, `:308 if[0]`; `LayerConstraintPostprocessor.ts:50
if[0]`, `:54 if[0]`, `:141 cond-expr[0..1]`, `:143 if[0..1]`; `NodePromotionModelOrder.ts:99 binary-expr[1]`, `:99
if[0]`, `:102 if[0..1]`, `:197 binary-expr[0..1]`, `:197 if[0..1]` (3), `:202 if[0..1]`, `:204 if[0..1]`,
`labelNodeBlocksPromotion` (`:224`, function) with `:228`, `:229`, `:230 if[0..1]`, `:237`, `:238`, `:240`, `:241`,
`labelLayerBlocksPromotion` (`:252`, function) with `:254`, `:255`, `:257`, `:258`, `:259 binary-expr[0..1]`.

Dead by construction or unused in the Java (20 branches, 4 functions):

| Site | Reason (Java line) |
| ---- | ------------------ |
| `DFSNodeOrderCycleBreaker.ts:154 if[0]`, `DepthFirstCycleBreaker.ts:137 if[0]` | the entry guard of `dfs` on an already visited start; the callers only pass unvisited nodes and the explicit-stack loop checks before pushing, so only the recursive twin (B8, tested) reaches it (`DFSNodeOrderCycleBreaker.java:146`, `DepthFirstCycleBreaker.java:133`) |
| `SCCModelOrderCycleBreaker.ts` `findNodes` `:127`, `findMaximum` `:141` (functions), `:133 if[0..1]`, `:151 if[0]`, `:155`, `:156`, `:157 if[1]`, `:160`, `:161`, `:162 if[0..1]` | the base implementation is overridden by both concrete strategies (`SCConnectivity.java:38`, `SCCNodeTypeCycleBreaker.java:36`); no other subclass exists |
| `GroupModelOrderCalculator.ts:86 resetInternalCounters` (function) | no caller in `org.eclipse.elk.alg.layered` (`GroupModelOrderCalculator.java`) |
| `StretchWidthLayerer.ts:355 avereageNodeSize` (function) | private and uncalled in the Java (`StretchWidthLayerer.java:373`) |
| `NetworkSimplexLayerer.ts:104 binary-expr[1]`, `:106 if[1]` | `nodeVisited` reuse on a second `process` of one instance; `create()` builds a new instance per layout (`NetworkSimplexLayerer.java`, `connectedComponents`) |
| `NetworkSimplexLayerer.ts:350 if[1]` | the opposite-port lookup is only called for edges incident to `port` (`NetworkSimplexLayerer.java`, `getOpposite`) |
| `EdgeAndLayerConstraintEdgeReverser.ts:109 if[1]` | `edgeConstraintOf` yields `INCOMING_ONLY`, `OUTGOING_ONLY` or `null` (`EdgeAndLayerConstraintEdgeReverser.java:98-108`) |
| `EdgeAndLayerConstraintEdgeReverser.ts:124 if[0]` | the inner loop re-runs the outer loop's switch on the nodes that switch left unconstrained (`EdgeAndLayerConstraintEdgeReverser.java:93-110`, `:137-154`) |
| `HighDegreeNodeLayeringProcessor.ts:287 if[0]` | `moveTree` places a tree whose height sized the layer list (`HighDegreeNodeLayeringProcessor.java:252-257`); the guard mirrors `List.get` |
| `LayerConstraintPostprocessor.ts:162 switch[2]` | Java `assert false`: only `*_SEPARATE` nodes are in the list (`LayerConstraintPostprocessor.java`, `restoreHiddenNodes`) |
| `LayerConstraintPreprocessor.ts:68 switch[3]` | `default` of a switch over the complete `HiddenNodeConnections` enum (`LayerConstraintPreprocessor.java`, `HiddenNodeConnections.combine`) |

## Counts

16 scenario ids (S1–S16; stop 9 is 25) over 13 graphs; T11 records them, T12 anchors one test per row.

## T11 corrections (2026-10-29)

T11 recorded 37 `sites/*` rows (ids below the listed prefixes, one per strategy or variant; `rowCounts.sites = 37`)
and measured the replay-alone coverage before and after. Ten branches the table assigned to scenarios cannot be reached
and move category; the branch totals become S 73 / J 21 / U 71 (functions unchanged: S 3, J 21, U 6).

| Site | New category | Mechanism (Java) |
| ---- | ------------ | ---------------- |
| `SCCNodeTypeCycleBreaker.ts:38 if[0]`, `SCConnectivity.ts:37 if[0]` | U | `Tarjan.java:93` stores a component only when its size exceeds 1, so no singleton reaches `findNodes` |
| `SCCNodeTypeCycleBreaker.ts:68 if[1]` | U | the loop runs over `max.getOutgoingEdges()`, whose source is always `max`, a member of the component |
| `CoffmanGrahamLayerer.ts:290 if[1]` | U | needs `u.id == v.id`; `compareNodesInTopo` never compares a node with itself |
| `CoffmanGrahamLayerer.ts:295 if[0]` | U | `ListIterator.hasNext()` is true after any `previous()`, so after the loop it is false only for an empty list, where the other iterator never moved either and the id arm is taken |
| `BreadthFirstModelOrderLayerer.ts:81 if[1]`, `DepthFirstModelOrderLayerer.ts:155 if[1]` | J | a NORMAL node without `MODEL_ORDER` makes the comparator throw `UnsupportedGraphException`; no row records a throw |
| `HighDegreeNodeLayeringProcessor.ts:306 cond-expr[1]` | U | TypeScript overload artefact: the Java two-argument `degree` is called only from the one-argument overload with its fixed selector |
| `NodePromotionModelOrder.ts:191 if[1]` | U | `nextLayerNode.id == node.id` needs a node listed in a layer after its own; ids are unique and `promoteNodeByModelOrder` moves a node with `biLayerMap.put`; no path found |
| `LayerConstraintPreprocessor.ts:218 if[1]` | U | `ensureNoInacceptableEdges` is called only for `FIRST_SEPARATE`/`LAST_SEPARATE` nodes |

Scenario adjustments T11 made to reach the remaining branches: S11 has two edgeless EAST/NORTH ports and a second row
(`noConstraint`) that clears a dummy's layer constraint; S12 has nine nodes ordered LAST_SEPARATE before
FIRST_SEPARATE so both `combine` orders occur; S13 uses two inside self-loops between the target's ports
(`INSIDE_SELF_LOOPS_ACTIVATE`), because a direct port-to-port edge is re-contained by the JSON importer.

## T12 corrections (2026-10-29)

- `DepthFirstModelOrderLayerer.ts:37 if[0]` (`layerAt` out of range) moves from J to U, dead by construction: layer 0
  is pushed before any lookup, `placeNodesToPlace`/`addNodeToLayer` grow the list first, and a node's shifted id is
  never negative (`DepthFirstModelOrderLayerer.java:180, 264-265, 319`).
- The J row "`integerCompare` `cond-expr[0]` (`a < b`)" names the wrong arm: the untaken arm is the nested `a === b ? 0`
  (equal values); covered for BF and DF by the stable-sort cases, left for `CoffmanGrahamLayerer.ts:17` (equal
  `inTopo` positions above 127 would need a hand-derived layering, L4).
- `firstEdge`'s non-empty arm (`BreadthFirstModelOrderLayerer.ts:22 if[1]`, `DepthFirstModelOrderLayerer.ts:24`,
  `NodePromotionModelOrder.ts:26 if[1]`) is reached only on label dummies: U (7f), not J. Its empty arm stays J
  (`NoSuchElementException`).
