<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7f branches unreached by the oracle replay (T13, F12, L4 under X5)

Measured 2026-11-05 on `feature/layered-pipeline` after batch 6, alone (1-minute load 33 to 41 from foreign jobs; coverage is
load-independent): the row replay and the SC4 re-replay, without the ported suites (X4), with v8 coverage over `src/alg/layered/**`,
test files excluded, then filtered to the 7f classes: `src/alg/layered/{ElkLayered,GraphConfigurator}*.ts`,
`src/alg/layered/components/**`, `src/alg/layered/intermediate/{GraphTransformer,HierarchicalPortOrthogonalEdgeRouter,EndLabelSorter,HypernodesProcessor,ConstraintsPostprocessor}*.ts`:

```bash
npx vitest run --coverage --coverage.include='src/alg/layered/**' --coverage.exclude='**/*.test.ts' --coverage.reporter=json \
  --coverage.reporter=text --coverage.reportsDirectory=<scratch>/T13 src/alg/layered/LayeredPipelineVectors.test.ts \
  src/alg/layered/LayeredPipelineReplay.test.ts
```

Totals over the 7f classes (34 files): 563 branches of which **169** untaken, 230 functions of which **46** uncovered. The non-zero exit is the
filtered run against the global thresholds. A script checks the partition: each of the 215 items falls in exactly one row below (branch arms
as v8 numbers them: `if[0]` the consequent, `if[1]` the alternative, `binary-expr[k]` the k-th operand, `cond-expr[0]` the true arm, `switch[k]` the k-th case).

| Category | Meaning | Branches + functions |
| -------- | ------- | -------------------- |
| S | Numeric or algorithmic behaviour: an oracle step scenario (`sites/*`, T15 row, T16 anchored case) | 73 |
| J | Structural behaviour with Java-derived expectations (T16; several already have a case in T4 to T12) | 44 |
| U | Unreachable in 7f, with the owner or the mechanism: 7f2 labels and logging, 7g compaction, 7h the hierarchical driver, or dead by construction with the Java line | 92 |
| X | A throwing arm or a stage | 6 |

**Landed hand-offs, re-measured.** `HyperedgeDummyMerger` still has 13 of 48 branches untaken, its label arms U → 7f2. Across the landed `p2layers` and `intermediate` classes, 417 of 1689 branches are untaken by these two replays alone; those classes have their own earlier rows and tests, and are outside this partition.

**Flags from the task reports, resolved here.** T5's ROTATION arms are Sc4. T6's `PORT_LABELS` block is Sc13, and its explicit `PORT_ANCHOR` note is the reverse: the row family always has an anchor, so the null arm is dead. T7's left branch is Sc14 to Sc17. T4's vertical branch and model-order rejection are Sc10 and Sc11; its non-null `JUNCTION_POINTS` note is the reverse as well: the null arm is dead (cloned default). FX5 requires Sc1 and Sc2.

## Scenarios (17 ids; stop 9 at about 30)

Every node sized, seed 1 unless stated. Step rows use T1's op vocabulary; T15 may add an op for a whole `layout` or a monitor cancelled in advance (push-forward). A scenario that cannot reach its arm is reported as a U candidate with its mechanism (T15's acceptance).

| # | Scenario id | TS sites | Graph | Steps / options | Expected field |
| - | ----------- | -------- | ----- | --------------- | -------------- |
| Sc1 | `sites/LayeredLayoutProvider/flat` | none directly (FX5): the label-free twin of `site/provider/flat` | 3 nodes, 1 port, 2 edges, no label | `layout` through the provider, recorded export | `layout` of the whole graph |
| Sc2 | `sites/LayeredLayoutProvider/cancelled` | `ElkLayered.ts:90 if[0]`; the provider's `isCanceled` arm (`LayeredLayoutProvider.java:64`) | as Sc1 | a monitor cancelled before `layout`, recorded export | the graph keeps its input coordinates |
| Sc3 | `sites/ElkLayered/resize/noDefaultMinimum` | `ElkLayeredResize.ts:34 if[1]` | 2 connected nodes, `nodeSize.constraints=MINIMUM_SIZE`, `nodeSize.options` without `DEFAULT_MINIMUM_SIZE`, `nodeSize.minimum` 0 | whole layout (new step op or export) | `graph.size` with no default minimum |
| Sc4 | `sites/GraphTransformer/rotation/{LEFT,DOWN,UP}/{pre,post}` | `GraphTransformer.ts:62`, `:67`, `:99-108`, `:115-124`, `:134`, `:140` | 5 nodes with a long edge and N/S ports, `direction.congruency=ROTATION` | `DIRECTION_PREPROCESSOR` first, the plan, `DIRECTION_POSTPROCESSOR`, `dump`; variant stops after the first and the last | `geometry.nodes`, port sides. Replaces the twin comparisons of `GraphTransformerLaws.test.ts` as the proof (T5's flag) |
| Sc5 | `sites/GraphTransformer/alignment/{LEFT,UP,DOWN}/{LEFT,RIGHT,TOP,BOTTOM}` | `GraphTransformerMirrorX.ts:69,72`, `MirrorY.ts:56,59`, `Transpose.ts:296-305` | 3 nodes, the node `alignment` option set per variant | `DIRECTION_PREPROCESSOR`, `dump` | `changed` `alignment` on the node |
| Sc6 | `sites/GraphTransformer/layerConstraint/{FIRST,LAST}` | `GraphTransformerMirrorX.ts:223,231` | 3 nodes, one with `layering.layerConstraint`, `direction=LEFT` | `DIRECTION_PREPROCESSOR`, `dump` | `changed` layer constraint |
| Sc7 | `sites/GraphTransformer/nodeLabelPlacement` | `GraphTransformerTranspose.ts:178 if[1]`, `:187 if[1]` | a node with a sized label, placement holding only `V_*` and only `H_*` flags, `direction=DOWN` | `DIRECTION_PREPROCESSOR`, `dump` | `changed` `nodeLabels.placement` |
| Sc8 | `sites/ComponentGroupGraphPlacer/newGroup` | `ComponentGroup.ts:67 if[1]`, `:83 if[0]`, `ComponentGroupGraphPlacer.ts:157 if[1]` | components on sides the constraint table refuses in one group, for example NORTH_SOUTH with EAST_WEST (read `ComponentGroup.java:96` for the pair) | `componentsSplit`, the plan per component, `componentsCombine` | `geometry.nodes` of the target, `offset` per group |
| Sc9 | `sites/ComponentGroupGraphPlacer/rowWrap` | `ComponentGroupGraphPlacer.ts:374 if[0]` | more than 3 unconnected components of one side, sized so the row exceeds `maxRowWidth` | as Sc8 | `geometry.nodes`: a component on the next row |
| Sc10 | `sites/ComponentGroupModelOrderGraphPlacer/vertical/{DOWN,UP}/{WEST,EAST}` | `ComponentGroupModelOrderGraphPlacer.ts:112`, `:114`, `:125`, `:152`, `:156` | external-port components with `considerModelOrder.components=MODEL_ORDER`-type group ordering, vertical direction | as Sc8 with `DIRECTION_*` | `geometry.nodes`; the advance arms |
| Sc11 | `sites/ComponentGroupModelOrderGraphPlacer/newGroup` | `ModelOrderComponentGroup.ts:64 if[0]` | as Sc8 under the model-order group strategy (read `ModelOrderComponentGroup.java:56`) | as Sc8 | `geometry.nodes` |
| Sc12 | `sites/SimpleRowGraphPlacer/priority` | `SimpleRowGraphPlacer.ts:126 if[1]` | 3 components with different `priority` values on their nodes, no external ports | as Sc8 | the order in `geometry.nodes` |
| Sc13 | `sites/HierarchicalPortOrthogonalEdgeRouter/portLabels/{inside,outside,neither}` | `HierarchicalPortOrthogonalEdgeRouterRestore.ts:99`, `:114`, `:121`, `:131` | N and S external ports with sized labels, `FIXED_SIDE`, `nodeSize.constraints=PORT_LABELS`, `portLabels.placement` per variant | plan to `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER`, `dump` | `geometry.nodes` margins, `geometry.labels` |
| Sc14 | `sites/HypernodesProcessor/moreLeftEdges/{north,south}` | `HypernodesProcessor.ts:111`, `:148-161`, `:210-215` | a hypernode with more WEST than EAST edges, each with bend points, joins above and below | plan to `HYPERNODE_PROCESSOR`, `dump` | node `pos`, `geometry.edges` bend points |
| Sc15 | `sites/HypernodesProcessor/verticalEdges/{north,south}` | `HypernodesProcessor.ts:55 if[1]`, `:73`, `:79` | a hypernode with an edge on a N, then a S port | as Sc14 | node `pos` unchanged |
| Sc16 | `sites/HypernodesProcessor/notShifted` | `HypernodesProcessor.ts:115 if[1]` | a hypernode whose first bend is closer than half its size | as Sc14 | node `pos` unchanged |
| Sc17 | `sites/HypernodesProcessor/bendChoice` | `HypernodesProcessor.ts:30 if[1]`, `:136 if[1]`, `:138 if[1]`, `:204 cond-expr[0]` | edges with equal and larger first bends, one bend only, a straight edge and a junction chain holding another point first | as Sc14 | `geometry.edges` bend and junction points |

## Per class

| TS site | Java | Cat | Scenario, case or mechanism |
| ------- | ---- | --- | --------------------------- |
| `ElkLayered.ts` :72 if[0] | `ElkLayered.java:137` | J | `doLayout(graph, null)` takes a new monitor |
| `ElkLayered.ts` :90 if[0] | `ElkLayered.java:154` | S | `sites/LayeredLayoutProvider/cancelled` |
| `ElkLayered.ts` :114 fn, :116 if[0], if[1], :146 fn, :192 fn, :200 binary-expr[0], binary-expr[1], if[0], :210 if[0], if[1], :214 if[1], :224 fn | `ElkLayered.java:179-298` | U | 7h: `doCompoundLayout` and `hierarchicalLayout`; `doCompoundLayout` throws at the staged `CompoundGraphPreprocessor.process`. Reached only with the three stages mocked (`ElkLayeredHierarchy.test.ts`) |
| `ElkLayered.ts` :229 fn, :351 fn, :360 if[0], :361 if[0], :374 if[0], :375 if[0] | `ElkLayered.java:361, notifyProcessor*` | J | test controller notification: the T11 runner installs one on every whitebox suite |
| `ElkLayered.ts` :280 fn, :281 cond-expr[0], cond-expr[1], :282 cond-expr[0], cond-expr[1], :291 binary-expr[0], binary-expr[1], :292 if[0], :295 if[0], if[1], :298 if[1], :303 if[0], if[1], :326 if[0] | `ElkLayered.java:446` | J | the test API: `runLayoutTestUntil` both overloads, `runLayoutTestStep` when finished |
| `ElkLayered.ts` :363 if[1], :377 if[1] | `ElkLayered.java notifyProcessor*` | U | 7h: a non-root level exists only under `INCLUDE_CHILDREN` |
| `ElkLayered.ts` :402 if[0], :436 if[0], :461 fn, :465 cond-expr[0], cond-expr[1] | `ElkLayered.java:606,620` | U | 7f2: behind `isLoggingEnabled`, whose `DebugUtil` is staged |
| `ElkLayered.ts` :409 if[0] | `ElkLayered.java `layout`` | J | cancellation mid-plan returns early (structural, a monitor cancelled by a processor) |
| `ElkLayeredHierarchy.ts` :17 fn, :27 if[0], if[1], :43 fn, :47 fn, :49 if[0], if[1], :59 fn, :63 fn, :71 fn, :73 fn, :77 fn | `ElkLayered.java:300-360` | U | 7h: `collectAllGraphsBottomUp`, `reviewAndCorrectHierarchicalProcessors` and the iterator stand-in run only under `hierarchicalLayout` |
| `ElkLayeredResize.ts` :34 if[1] | `ElkLayered.java resizeGraph` | S | `sites/ElkLayered/resize/noDefaultMinimum` |
| `ElkLayeredTestExecutionState.ts` :30 fn | `ElkLayered.java TestExecutionState` | J | `getStep` read by T8 and T16 |
| `GraphConfigurator.ts` :110 if[0] | `GraphConfigurator.java:108` | J | `SPACING_EDGE_EDGE` clamp |
| `GraphConfigurator.ts` :116 if[0] | `GraphConfigurator.java:112` | J | `UNDEFINED` direction: an imported graph is already resolved (`ElkGraphImporterGraphs.ts:31`), so only a hand-built `LGraph` reaches it |
| `GraphConfigurator.ts` :122 if[0] | `GraphConfigurator.java:118` | J | seed 0 draws from `new Random()`: structural only (stop 6) |
| `GraphConfigurator.ts` :150 fn, :151 fn | `GraphConfigurator.java:141` | J | `copyPortContraints` over layers: a hand-built layered `LGraph` |
| `GraphConfigurator.ts` :160 if[0], :263 if[0], :350 if[0], :400 if[0], :406 binary-expr[0], :407 binary-expr[1] | `GraphConfigurator.java:151,209,295` | U | 7h: nested graphs and `INCLUDE_CHILDREN` |
| `GraphConfigurator.ts` :275 if[0], :365 if[0] | `GraphConfigurator.java:221,308` | U | 7f2: label management, alternating unzipper |
| `GraphConfigurator.ts` :319 if[0], :321 binary-expr[1], :374 if[0], :376 if[0] | `GraphConfigurator.java:275,317` | U | 7g: post compaction, wrapping |
| `AbstractGraphPlacer.ts` :50 if[1], :88 if[1] | `AbstractGraphPlacer.java:85,133` | U | dead: `getProperty` stores a clone of the cloneable default `new KVectorChain()`, so the read is never null (`.agent-notes/layered-edge-routing.md`) |
| `ComponentGroup.ts` :67 if[1], :83 if[0] | `ComponentGroup.java:218,235-244` | S | `sites/ComponentGroupGraphPlacer/newGroup` |
| `ComponentGroupGraphPlacer.ts` :64 if[0] | `ComponentGroupGraphPlacer.java:77` | J | `combine` with no components |
| `ComponentGroupGraphPlacer.ts` :89 if[0], :92 binary-expr[1], :129 fn | `ComponentGroupGraphPlacer.java:112` | U | 7g: `COMPACTION_CONNECTED_COMPONENTS` reaches the staged `ComponentsCompactor` |
| `ComponentGroupGraphPlacer.ts` :157 if[1] | `ComponentGroupGraphPlacer.java:153` | S | `sites/ComponentGroupGraphPlacer/newGroup` |
| `ComponentGroupGraphPlacer.ts` :374 if[0] | `ComponentGroupGraphPlacer.java:384` | S | `sites/ComponentGroupGraphPlacer/rowWrap` |
| `ComponentGroupModelOrderGraphPlacer.ts` :36 if[0] | `ComponentGroupModelOrderGraphPlacer.java:44` | J | `combine` with no components |
| `ComponentGroupModelOrderGraphPlacer.ts` :61 if[0], :64 binary-expr[1] | `ComponentGroupModelOrderGraphPlacer.java:124` | U | 7g: `COMPACTION_CONNECTED_COMPONENTS` |
| `ComponentGroupModelOrderGraphPlacer.ts` :112 if[0], if[1], if[1], :114 if[0], if[1], :125 if[0], if[1], if[1], :152 fn, :156 if[0], if[1] | `ComponentGroupModelOrderGraphPlacer.java:79,103` | S | `sites/ComponentGroupModelOrderGraphPlacer/vertical` |
| `ComponentGroupModelOrderGraphPlacer.ts` :187 if[0] | `ComponentGroupModelOrderGraphPlacer.java:166` | X | the Java cast `(ModelOrderComponentGroup)` as an `instanceof` guard throwing `ClassCastException` |
| `ComponentGroupSides.ts` :82 binary-expr[1] | `ComponentGroup.java:244` | J | a key set missing from the table reads as empty, as `HashMultimap.get` |
| `ComponentOrderingStrategy.ts` :39 if[0] | `ComponentOrderingStrategy` | X | `valueOf` throwing arm of a landed enum |
| `ComponentOrderingStrategy.ts` :47 fn, :59 fn | `ComponentOrderingStrategy` | J | enum surface of a landed enum |
| `ComponentsCompactor.ts` :18 fn, :22 fn, :26 fn | `ComponentsCompactor.java` | X | stage naming 7g |
| `ComponentsProcessor.ts` :25 cond-expr[0] | `ComponentsProcessor.java:165` | J | `Integer.compare`: the discovery order is already ascending, so the sort never sees `a < b`; a hand-built reverse order reaches it |
| `ComponentsProcessor.ts` :225 if[0] | `ComponentsProcessor.java:82` | J | `combine` before `split` (Java NPE as `TypeError`) |
| `ModelOrderComponentGroup.ts` :39 if[1] | `ModelOrderComponentGroup.java` | J | the constructor without a component |
| `ModelOrderComponentGroup.ts` :64 if[0] | `ModelOrderComponentGroup.java:244-245` | S | `sites/ComponentGroupModelOrderGraphPlacer/newGroup` |
| `SimpleRowGraphPlacer.ts` :23 if[0] | `SimpleRowGraphPlacer.java:55` | J | `combine` with no components |
| `SimpleRowGraphPlacer.ts` :43 if[0], :93 fn | `SimpleRowGraphPlacer.java:84` | U | 7g: `COMPACTION_CONNECTED_COMPONENTS` |
| `SimpleRowGraphPlacer.ts` :126 if[1] | `SimpleRowGraphPlacer.java:122-123` | S | `sites/SimpleRowGraphPlacer/priority` |
| `ConstraintsPostprocessor.ts` :20 if[0], :46 if[0] | `ConstraintsPostprocessor.java:45,71` | U | 7f2: behind `isLoggingEnabled`, whose `DebugUtil` is staged (a structural test pins the throw) |
| `EndLabelSorter.ts` :16 cond-expr[0], cond-expr[0], cond-expr[1], cond-expr[1], fn, :37 fn, :40 if[0], if[1], :49 if[0], if[1], :81 if[0], :86 if[0], if[1], :88 if[0], if[1], :104 fn, :110 fn, :111 if[0], if[1], :119 fn, :120 if[0], if[1], :134 fn, :156 fn, :176 fn, :185 if[0], if[1] | `EndLabelSorter.java:54-236` | U | 7f2: the sort body needs `END_LABELS`, written only by `EndLabelPreprocessor`; FX2 requires a parallel-edge scenario there |
| `EndLabelSorterLabelGroup.ts` :18 fn | `EndLabelSorter.java:200-210` | U | 7f2: as `EndLabelSorter` |
| `GraphTransformer.ts` :62 if[0], if[1], :67 if[1], :99 fn, :101 switch[0], :105 switch[1], :108 switch[2], :115 fn, :117 switch[0], :121 switch[1], :124 switch[2], :134 fn, :140 fn | `GraphTransformer.java:96-135` | S | `sites/GraphTransformer/rotation` |
| `GraphTransformerMirrorX.ts` :69 switch[0], :72 switch[1] | `GraphTransformer.java mirrorX alignment` | S | `sites/GraphTransformer/alignment` |
| `GraphTransformerMirrorX.ts` :110 if[1] | `GraphTransformer.java:250` | U | dead: `getProperty` stores a clone of the cloneable default `new KVectorChain()`, so the read is never null (`.agent-notes/layered-edge-routing.md`) |
| `GraphTransformerMirrorX.ts` :223 switch[0], :231 switch[2] | `GraphTransformer.java mirrorX layer constraint` | S | `sites/GraphTransformer/layerConstraint` |
| `GraphTransformerMirrorY.ts` :56 switch[0], :59 switch[1] | `GraphTransformer.java mirrorY alignment` | S | `sites/GraphTransformer/alignment` |
| `GraphTransformerMirrorY.ts` :97 if[1] | `GraphTransformer.java:449` | U | dead: `getProperty` stores a clone of the cloneable default `new KVectorChain()`, so the read is never null (`.agent-notes/layered-edge-routing.md`) |
| `GraphTransformerMode.ts` :32 fn, :33 if[1], :41 fn, :45 fn, :53 fn | `GraphTransformer.java Mode` | J | enum surface; `GraphTransformer.test.ts` |
| `GraphTransformerMode.ts` :33 if[0] | `GraphTransformer.java Mode` | X | `valueOf` with an unknown name |
| `GraphTransformerTranspose.ts` :78 if[1] | `GraphTransformer.java:615` | U | dead: `getProperty` stores a clone of the cloneable default `new KVectorChain()`, so the read is never null (`.agent-notes/layered-edge-routing.md`) |
| `GraphTransformerTranspose.ts` :178 if[1], :187 if[1] | `GraphTransformer.java transposeNodeLabelPlacement` | S | `sites/GraphTransformer/nodeLabelPlacement` |
| `GraphTransformerTranspose.ts` :237 if[1] | `GraphTransformer.java:771` | U | dead: `EDGE_LABELS_SIDE_SELECTION` has a cloned default, so `oldSide` is never null |
| `GraphTransformerTranspose.ts` :276 if[1] | `GraphTransformer.java transposeLayerConstraint` | J | an external dummy with neither constraint: a hand-built node, since the importer always sets one |
| `GraphTransformerTranspose.ts` :296 switch[0], :299 switch[1], :302 switch[2], :305 switch[3] | `GraphTransformer.java transpose alignment` | S | `sites/GraphTransformer/alignment` |
| `HierarchicalPortOrthogonalEdgeRouterCoordinates.ts` :25 cond-expr[0] | `HierarchicalPortOrthogonalEdgeRouter.java:377` | U | dead on a dummy from `LGraphUtil.createExternalPortDummy`, which always writes `PORT_ANCHOR` |
| `HierarchicalPortOrthogonalEdgeRouterCoordinates.ts` :104 switch[0] | `HierarchicalPortOrthogonalEdgeRouter.java:298` | U | dead: under `FREE` the importer derives E/W sides (`LGraphUtil.java:818-824`), so no N/S dummy reaches this switch |
| `HierarchicalPortOrthogonalEdgeRouterRestore.ts` :22 if[0] | `HierarchicalPortOrthogonalEdgeRouter.java:708-716` | J | `layers.get` out of range throws as Java `List.get` |
| `HierarchicalPortOrthogonalEdgeRouterRestore.ts` :93 if[1] | `HierarchicalPortOrthogonalEdgeRouter.java:213` | U | dead: a restored dummy is on NORTH or SOUTH by construction |
| `HierarchicalPortOrthogonalEdgeRouterRestore.ts` :99 if[0], :114 fn, :121 if[0], :131 if[0], if[1], if[1] | `HierarchicalPortOrthogonalEdgeRouter.java:219-237` | S | `sites/HierarchicalPortOrthogonalEdgeRouter/portLabels` |
| `HierarchicalPortOrthogonalEdgeRouterRouting.ts` :52 if[1] | `HierarchicalPortOrthogonalEdgeRouter.java:535` | U | dead: as `Restore`, N/S only |
| `HypernodesProcessor.ts` :30 if[1], :136 if[1], :138 if[1], :204 cond-expr[0] | `HypernodesProcessor.java:95-178` | S | `sites/HypernodesProcessor/bendChoice` |
| `HypernodesProcessor.ts` :55 if[1], :73 switch[0], :79 switch[2] | `HypernodesProcessor.java:58-74` | S | `sites/HypernodesProcessor/verticalEdges` |
| `HypernodesProcessor.ts` :85 switch[4] | `HypernodesProcessor.java:58-70` | U | dead: every port has a side after `PORT_SIDE_PROCESSOR`; the TS `default` keeps the Java switch |
| `HypernodesProcessor.ts` :111 if[1], :148 fn, :151 if[0], if[1], :153 if[0], if[1], :159 if[0], if[1], :161 if[0], if[1], :210 if[1], :212 cond-expr[0], cond-expr[1], :213 if[0], :215 if[1] | `HypernodesProcessor.java:103-118,166-172` | S | `sites/HypernodesProcessor/moreLeftEdges` |
| `HypernodesProcessor.ts` :115 if[1] | `HypernodesProcessor.java:125` | S | `sites/HypernodesProcessor/notShifted` |
| `HypernodesProcessor.ts` :221 if[1] | `HypernodesProcessor.java:177` | U | dead: `getProperty` stores a clone of the cloneable default `new KVectorChain()`, so the read is never null (`.agent-notes/layered-edge-routing.md`) |

## T15 corrections

T15 recorded 42 `sites/*` rows; 68 of the items above are reached by them (replay plus SC4: 218 untaken items before, 150 after, the count
including the provider), none lost. Per-row attribution with `-t '<row id>$'`. The following S items proved unreachable and move to U:

| TS site | Was | Now | Mechanism |
| ------- | --- | --- | --------- |
| `ComponentGroupModelOrderGraphPlacer.ts:112 if[1]`, `:125 if[1]` | Sc10 | U | dead: the fall-through for a direction neither horizontal nor vertical; the importer always resolves `UNDEFINED` (`ElkGraphImporterGraphs.ts:31`), as `GraphConfigurator.ts:116` |
| `HypernodesProcessor.ts:55 if[1]`, `:73 switch[0]`, `:79 switch[2]` | Sc15 | U | dead: `ElkGraphImporter.java:961` forces `PORT_CONSTRAINTS=FREE` on every hypernode and `PortSideProcessor.java:100-106` re-sides its ports WEST or EAST, so no edge reaches it on a NORTH or SOUTH port; Sc15 has no row |
| `HypernodesProcessor.ts:138 if[1]`, `:204 cond-expr[0]` | Sc17 | U | the orthogonal router leaves a hypernode's edges with 0 or 2 bends; a single bend arises only from an earlier hypernode's trim, which reaches the left branch of a later hypernode, never a right-branch one's outgoing edges |

Graphs differ from the table above where the Java required it: Sc2 needs two components (`ElkLayered.java:154` is inside the
multi-component branch) and gains `cancelledOneComponent` for `:409`; Sc3 gains the contrast row `defaultMinimum`; Sc6 gets its FIRST/LAST
dummy from a `*_SEPARATE` child hiding its only neighbour (`LayerConstraintPreprocessor`); Sc11 is the plain-table refusal under
`GROUP_MODEL_ORDER`; Sc14 needs sources beyond 2^31 wide because the left search starts at `bendx = Integer.MAX_VALUE`
(`HypernodesProcessor.java:104`), and `north` became `aboveAndBelow`.

Rows reaching an arm their fields do not tell apart, for T16: `sites/LayeredLayoutProvider/cancelled` and `cancelledOneComponent` (both keep
the input coordinates; `:90` and `:409` exits look alike), `sites/GraphTransformer/alignment/LEFT/{TOP,BOTTOM}` (no new arm),
`sites/GraphTransformer/alignment/*` (only through the `changed` alignment), `sites/ElkLayered/resize/defaultMinimum` and
`sites/LayeredLayoutProvider/flat` (contrast rows).

