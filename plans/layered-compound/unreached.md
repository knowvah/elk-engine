<!-- SPDX-License-Identifier: EPL-2.0 -->

# 7h branches the oracle evidence does not reach (T12, H8, H12, F12 shape)

Measured 2026-11-10 on `chore/issue-queue`, tree at `679df4b` plus the working-tree files of the other mission agents (the ported suites
below). **Completeness: the J measurement is complete.** The nine issue suites `src/alg/layered/issues/Issue{316,455,552,596,628,665,700,701,734}Test.test.ts`
and `src/graph/json/EdgeCoordsTest.test.ts` existed and passed when measured (40 passed, 1 skipped: `Issue665Test`, the H13 stress case);
the other 83 `*Test.test.ts` JUnit ports under `src/alg/layered` (92 files in all, 91 pass, 1 skipped) are the J measurement of earlier missions.
The nine 7h suites and `EdgeCoordsTest` reach **none** of the arms the replay leaves untaken in the files below (0 newly taken arms, per file).

## Measurement

Four runs, all targeted (`npx vitest run --coverage ...`, v8, `--coverage.reporter=json`, zero thresholds, test files excluded from the include list), over
the include list of the task: `src/alg/layered/compound/*.ts`, `intermediate/HierarchicalNodeResizingProcessor.ts`, `ElkLayered*.ts`, `GraphConfigurator.ts`,
`p3order/**`, `intermediate/greedyswitch/**`, `intermediate/{SelfLoopPreProcessor,CommentPreprocessor,CommentPostprocessor,EdgeAndLayerConstraintEdgeReverser,LabelManagementProcessor,NorthSouthPortPre*,PortListSorter,PortSideProcessor,SortByInputModelProcessor}.ts`,
`intermediate/loops/SelfLoopHolder.ts`, `intermediate/preserveorder/**`, `JsonDebugUtil*.ts`, `p5edges/orthogonal/direction/*.ts`.

| run | tests | what it measures |
| --- | ----- | ---------------- |
| A | `LayeredCompoundVectors.test.ts`, `LayeredCompoundTwins.test.ts`, `test/golden/layered-hierarchy-goldens.test.ts`, `test/golden/layered-goldens.test.ts`: 557 tests pass in 28.8 s | **the oracle evidence alone** (the untaken set classified below) |
| B1 | the eight earlier `Layered{Labels,Loops,Order,Phase,Pipeline,Placement,Routing,Site}Vectors.test.ts` (7,577 tests) | which untaken arms an earlier mission's oracle rows already reach: class **E** |
| B2 | all 92 `src/alg/layered/**/*Test.test.ts` ported JUnit suites (2,275 pass, 13 skipped) | class **J**; a per-suite run of each file names the suite |
| J2 | the nine 7h issue suites and `EdgeCoordsTest` | 0 new arms |

The scratch tools (`$TMPDIR/7h/T12/`): `run-cov.sh` (the include list), `list.mjs` (untaken arms and functions per file from `coverage-final.json`),
`classify.mjs` (A minus B1 minus B2), `probe.sh` (a scratch vitest config outside the repo that loads inline scenario graphs through `runRow` and
reports the arms newly taken against run A), `rowcov.sh` (one recorded row, coverage of the arms named), `each.sh` (one run per scenario).
Arms are keyed as in the earlier maps: the line of the branch, `if[0]` the consequent, `if[1]` the alternative (including the implicit else),
`binary-expr[k]` the k-th operand, `cond-expr[k]`, `switch[k]`; the TS arm lines are those of the tree measured.

## Classes

| Class | Meaning |
| ----- | ------- |
| S | a new site scenario (`Sc1..Sc16` below) reaches it; every S arm was **tried in TypeScript** and taken (a probe with per-scenario coverage), none is "untried" |
| J | a ported Java suite (B2) reaches it; the suite is named |
| U | not reachable from oracle input: *dead* (the Java text proves it) or *engine-unreachable* (the Java is reachable only by a direct call of a public method on a hand-built graph; the TS keeps a Java-structure unit test, as the earlier maps said); the proof is given |
| open | cannot be proven dead and no scenario found: a stop-8 case for the orchestrator, with what was tried |
| E | taken by an earlier mission's landed oracle rows (run B1), so it needs no 7h scenario; counted, not listed |

## Counts

Per file, untaken items of run A (arms and functions), by class. Files with only E items and files outside the scope list are left out; E is counted for the in-scope files.

| file (`src/alg/layered/`) | S | J | U | open | E |
| ---- | - | - | - | ---- | - |
| **7h classes** | | | | | |
| `compound/CompoundGraphPostprocessorSections.ts` | 2 | 0 | 3 | 0 | 0 |
| `compound/CompoundGraphPreprocessorDummies.ts` | 15 | 0 | 0 | 0 | 0 |
| `compound/CompoundGraphPreprocessorSections.ts` | 1 | 0 | 0 | 0 | 0 |
| `compound/CompoundGraphPreprocessorSegments.ts` | 6 | 0 | 2 | 0 | 0 |
| `compound/CrossHierarchyEdge.ts` | 0 | 0 | 0 | 1 | 0 |
| `compound/CrossHierarchyEdgeComparator.ts` | 0 | 0 | 1 | 0 | 0 |
| `intermediate/HierarchicalNodeResizingProcessor.ts` | 3 | 0 | 0 | 0 | 0 |
| *subtotal* | 27 | 0 | 6 | 1 | 0 |
| **driver files (H8 1)** | | | | | |
| `ElkLayered.ts` | 0 | 0 | 16 | 0 | 15 |
| `ElkLayeredHierarchy.ts` | 1 | 0 | 0 | 0 | 0 |
| `ElkLayeredTestExecutionState.ts` | 0 | 0 | 1 | 0 | 1 |
| `GraphConfigurator.ts` | 5 | 1 | 4 | 0 | 11 |
| *subtotal* | 6 | 1 | 21 | 0 | 27 |
| **labels items (H8 2)** | | | | | |
| `JsonDebugUtilEdges.ts` | 0 | 0 | 1 | 0 | 9 |
| `JsonDebugUtilGraph.ts` | 1 | 0 | 4 | 0 | 22 |
| `intermediate/CommentPreprocessor.ts` | 5 | 0 | 4 | 0 | 38 |
| *subtotal* | 6 | 0 | 9 | 0 | 69 |
| **loops items (H8 3)** | | | | | |
| `p5edges/orthogonal/direction/NorthToSouthRoutingStrategy.ts` | 1 | 0 | 0 | 3 | 0 |
| `p5edges/orthogonal/direction/SouthToNorthRoutingStrategy.ts` | 1 | 0 | 0 | 3 | 0 |
| `p5edges/orthogonal/direction/WestToEastRoutingStrategy.ts` | 0 | 0 | 0 | 0 | 3 |
| `p5edges/orthogonal/direction/BaseRoutingDirectionStrategy.ts` | 0 | 0 | 2 | 0 | 0 |
| `p5edges/orthogonal/direction/BaseRoutingDirectionStrategyForRoutingDirection.ts` | 0 | 0 | 1 | 0 | 0 |
| `p5edges/orthogonal/direction/RoutingDirection.ts` | 0 | 0 | 7 | 0 | 0 |
| `intermediate/SelfLoopPreProcessor.ts` | 0 | 0 | 0 | 0 | 1 |
| `intermediate/loops/SelfLoopHolder.ts` | 0 | 0 | 0 | 0 | 3 |
| *subtotal* | 2 | 0 | 10 | 6 | 7 |
| **crossing minimisation (H8 4)** | | | | | |
| `intermediate/NorthSouthPortPreprocessor.ts` | 0 | 0 | 2 | 0 | 4 |
| `intermediate/NorthSouthPortPreprocessorDummies.ts` | 0 | 0 | 6 | 0 | 11 |
| `intermediate/NorthSouthPortPreprocessorPortSorting.ts` | 0 | 0 | 0 | 0 | 7 |
| `intermediate/PortListSorter.ts` | 0 | 0 | 3 | 0 | 14 |
| `intermediate/PortSideProcessor.ts` | 0 | 0 | 1 | 0 | 1 |
| `intermediate/SortByInputModelProcessor.ts` | 0 | 0 | 3 | 0 | 30 |
| `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.ts` | 0 | 3 | 0 | 0 | 1 |
| `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts` | 0 | 0 | 3 | 0 | 0 |
| `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyListAdjacency.ts` | 0 | 0 | 1 | 0 | 1 |
| `intermediate/greedyswitch/NorthSouthEdgeNeighbouringNodeCrossingsCounter.ts` | 0 | 0 | 0 | 0 | 5 |
| `intermediate/greedyswitch/SwitchDecider.ts` | 0 | 13 | 1 | 0 | 0 |
| `intermediate/greedyswitch/SwitchDeciderCrossingCountSide.ts` | 0 | 0 | 6 | 0 | 0 |
| `intermediate/preserveorder/CMGroupModelOrderCalculator.ts` | 0 | 0 | 1 | 0 | 7 |
| `intermediate/preserveorder/ModelOrderNodeComparator.ts` | 0 | 0 | 2 | 0 | 37 |
| `intermediate/preserveorder/ModelOrderNodeComparatorAssociations.ts` | 0 | 0 | 4 | 0 | 18 |
| `intermediate/preserveorder/ModelOrderNodeComparatorHelperDummies.ts` | 0 | 0 | 2 | 8 | 58 |
| `intermediate/preserveorder/ModelOrderNodeComparatorPreviousLayer.ts` | 0 | 0 | 3 | 0 | 54 |
| `intermediate/preserveorder/ModelOrderNodeComparatorState.ts` | 0 | 0 | 1 | 0 | 1 |
| `intermediate/preserveorder/ModelOrderPortComparator.ts` | 0 | 0 | 4 | 1 | 55 |
| `intermediate/preserveorder/ModelOrderPortComparatorAssociations.ts` | 0 | 0 | 1 | 0 | 25 |
| `intermediate/preserveorder/ModelOrderPortComparatorIncoming.ts` | 0 | 0 | 3 | 1 | 36 |
| `intermediate/preserveorder/ModelOrderPortComparatorOutgoing.ts` | 0 | 0 | 0 | 1 | 38 |
| `intermediate/preserveorder/ModelOrderPortComparatorPortSideComparator.ts` | 0 | 0 | 1 | 0 | 3 |
| `intermediate/preserveorder/ModelOrderPortComparatorState.ts` | 0 | 0 | 0 | 0 | 1 |
| `p3order/AbstractBarycenterPortDistributor.ts` | 0 | 0 | 0 | 1 | 11 |
| `p3order/BarycenterHeuristic.ts` | 0 | 0 | 13 | 0 | 1 |
| `p3order/BarycenterHeuristicBarycenterState.ts` | 0 | 0 | 3 | 0 | 0 |
| `p3order/ForsterConstraintResolver.ts` | 0 | 1 | 0 | 1 | 7 |
| `p3order/ForsterConstraintResolverConstraintGroup.ts` | 0 | 0 | 14 | 1 | 0 |
| `p3order/GraphInfoHolder.ts` | 0 | 2 | 3 | 0 | 2 |
| `p3order/GreedyPortDistributor.ts` | 0 | 6 | 2 | 0 | 24 |
| `p3order/InteractiveCrossingMinimizer.ts` | 0 | 0 | 3 | 0 | 43 |
| `p3order/LayerSweepCrossingMinimizer.ts` | 0 | 2 | 3 | 0 | 19 |
| `p3order/LayerSweepCrossingMinimizerCounting.ts` | 2 | 0 | 1 | 0 | 17 |
| `p3order/LayerSweepCrossingMinimizerCrossMinType.ts` | 0 | 0 | 5 | 0 | 0 |
| `p3order/LayerSweepCrossingMinimizerHierarchical.ts` | 0 | 1 | 1 | 0 | 0 |
| `p3order/LayerSweepTypeDecider.ts` | 0 | 1 | 0 | 0 | 0 |
| `p3order/LayerSweepTypeDeciderNodeInfo.ts` | 0 | 0 | 1 | 0 | 0 |
| `p3order/LayerTotalPortDistributor.ts` | 0 | 0 | 1 | 0 | 0 |
| `p3order/MedianHeuristic.ts` | 0 | 0 | 9 | 0 | 3 |
| `p3order/ModelOrderBarycenterHeuristic.ts` | 0 | 0 | 9 | 5 | 57 |
| `p3order/ModelOrderBarycenterHeuristicInsertionSort.ts` | 0 | 0 | 0 | 0 | 3 |
| `p3order/NoCrossingMinimizer.ts` | 0 | 0 | 0 | 0 | 2 |
| `p3order/NodeRelativePortDistributor.ts` | 0 | 0 | 1 | 0 | 0 |
| `p3order/SweepCopy.ts` | 0 | 0 | 2 | 0 | 6 |
| `p3order/counting/AllCrossingsCounter.ts` | 0 | 1 | 0 | 0 | 0 |
| `p3order/counting/BinaryIndexedTree.ts` | 0 | 0 | 2 | 0 | 0 |
| `p3order/counting/CrossMinUtil.ts` | 0 | 0 | 1 | 0 | 0 |
| `p3order/counting/CrossingsCounter.ts` | 0 | 0 | 0 | 0 | 8 |
| `p3order/counting/CrossingsCounterConvenience.ts` | 0 | 0 | 1 | 0 | 1 |
| `p3order/counting/CrossingsCounterNorthSouth.ts` | 0 | 0 | 1 | 0 | 1 |
| `p3order/counting/HyperedgeCrossingsCounter.ts` | 0 | 0 | 0 | 0 | 5 |
| `p3order/counting/HyperedgeCrossingsCounterHyperedge.ts` | 0 | 0 | 5 | 0 | 1 |
| `p3order/counting/HyperedgeCrossingsCounterHyperedgeCorner.ts` | 0 | 0 | 6 | 0 | 0 |
| `p3order/counting/HyperedgeCrossingsCounterHyperedgeCornerType.ts` | 0 | 0 | 6 | 0 | 0 |
| *subtotal* | 2 | 30 | 141 | 19 | 618 |

Totals of the table: S 43, J 31, U 187, open 26, E 721 (E counted over the in-scope files only). Functions among the items: the 7h classes 1 (open: `CrossHierarchyEdge.toString`),
the drivers 5 (all U: `runLayoutTestUntil`, `getStep`, two `copyPortContraints` lambdas, and `ElkLayered`'s test API), the C3 lists 7 (4 J, 3 U). "U" splits into dead (the Java proves it) and engine-unreachable (a direct call on a hand-built graph reaches it);
each row says which. About 120 of the 187 U items are carried from the earlier maps (last table of "Crossing minimisation").

## Findings that shape the scenarios

- **The nine 7h suites and `EdgeCoordsTest` add nothing** to what the replay misses (run J2), so every S arm needs a new scenario.
- **Per-level options reach each graph's own `GraphConfigurator` pass** (`prepareGraphForLayout` per graph), so options set on the compound node `c` (not the root) decide the nested graph; a root-only option never reaches the arms of Sc13.
- **Ports without an explicit port object never merge**: the importer gives every portless edge its own port, so the "equal external port" arms (Sc4) need a node with an explicit port that two edges share.
- **`INSIDE_SELF_LOOPS_YO` on `p->p`** makes source and target of the inside self loop one external-port dummy; the dummy then carries an edge to itself, the only way a self loop reaches the hierarchical port router (Sc14; `SELF_LOOP_PREPROCESSOR` hides every self loop of a `NORMAL` node, `SelfLoopHolder.java`).
- **Every node a greedy switch run meets is already order-fixed or `FIXED_POS`** (probe: `SweepCopy.java:120-122` and `LayerSweepCrossingMinimizer.java:168` fix the orders in the barycentre run, `HierarchicalNodeResizingProcessor.java:110` sets `FIXED_POS` before the root's greedy run when the first sweep was not hierarchy aware; instrumented: 777 of 777 calls of `GreedyPortDistributor.distributePortsInLayer` in run A take the order-fixed `continue`), which is why `GreedyPortDistributor`'s hierarchical counter arms are U through the engine.
- **`FIXED_RATIO` compound port constraints throw in TS** (`TypeError: Cannot read properties of null (reading 'x')`, the `JAVA_NULL_VECTOR` of T6's journal row): the Java reads `portNodeSize.x` on a `null` argument. Not run on the oracle; listed under "Oracle throws".

## Site scenarios (T14 records these from the oracle)

16 scenarios, `Sc1..Sc16` (stop 9 is about 40). Each was run in TypeScript through `RecursiveGraphLayoutEngine` (`runRow`) with per-scenario coverage against run A: every arm named below is taken
by that scenario alone (`each.sh`), except where a row says otherwise. The graphs keep the landed row shape (`input: { elk }`, `x`/`y` zero, sizes 30 by 30 unless given).

| id | scenario id | arms decided (TS site) | Java lines | tried |
| -- | ----------- | ---------------------- | ---------- | ----- |
| Sc1 | `sites/CompoundGraphPreprocessor/portLabelNorth` | `CompoundGraphPreprocessorSections.ts:214 if[1]` | `CompoundGraphPreprocessor.java:217-218` (`portConstraints != FREE` and the port side is NORTH: `getSize().y = insidePart`) | tried: reaches (probe `pre-portlabel-north`) |
| Sc2 | `sites/CompoundGraphPreprocessor/insideSelfLoopFlow` | `CompoundGraphPreprocessorDummies.ts:58 if[1]`, `:97 if[1]`, `:308 binary-expr[1,2]`, `:311 if[0]`, `:311 binary-expr[1]`, `:313 if[0]`, `:313 binary-expr[1]`, `:329 binary-expr[1,2]`, `:332 if[0]`, `:332 binary-expr[1]`, `:334 if[0]`, `:334 binary-expr[1]` | `CompoundGraphPreprocessor.java:632` (false: a non-inside self loop of an activated node), `:636` and `:654` (non-null: both ports already own dummies), `:838-845` and `:856-863` (`calculateNetFlow` of `p1`/`p3`: outgoing and incoming self loops, inside and plain) | tried: reaches (probe `pre-isl-flow`) |
| Sc3 | `sites/CompoundGraphPreprocessor/fixedSideOut` | `CompoundGraphPreprocessorDummies.ts:196 cond-expr[1]` | `CompoundGraphPreprocessor.java:760` (`portType == OUTPUT` gives EAST) | tried: reaches (probe `pre-fixedside-out`) |
| Sc4 | `sites/CompoundGraphPreprocessor/deepOutMerged` | `CompoundGraphPreprocessorSegments.ts:254 if[1]`, `:438 if[1]` | `CompoundGraphPreprocessor.java:396` (inner output, equal), `:564` (outer outgoing, equal) | tried: reaches (probe `pre-deep-out-merged`) |
| Sc5 | `sites/CompoundGraphPreprocessor/deepToParentPort` | `CompoundGraphPreprocessorSegments.ts:214 if[1]`, `:218 if[1]`, `:259 if[1]`, `:302 if[1]` | `CompoundGraphPreprocessor.java:401`, `:438` (non-exported), `:448` (dummy already in the graph), `:452` (non-exported in the add loop) | tried: reaches (probe `pre-deep-parent-port`) |
| Sc6 | `sites/CompoundGraphPostprocessor/unnecessaryBendpoints/{RIGHT,DOWN}` | `CompoundGraphPostprocessorSections.ts:223 binary-expr[4]` (RIGHT and DOWN), `:223 binary-expr[5]` (DOWN) | `CompoundGraphPostprocessor.java:148-149` (`addUnnecessaryBendpoints && (xDiffEnough || yDiffEnough)`) | tried: reaches (probe `post-unnec-RIGHT`) |
| Sc7 | `sites/HierarchicalNodeResizingProcessor/defaultMinimum` | `HierarchicalNodeResizingProcessor.ts:112 if[0]`, `:116 if[0]` | `HierarchicalNodeResizingProcessor.java:149`, `:153` (`minSize.x <= 0`, `minSize.y <= 0`) | tried: reaches (probe `hnrp-default-min`) |
| Sc8 | `sites/HierarchicalNodeResizingProcessor/minimumWithoutDefault` | `HierarchicalNodeResizingProcessor.ts:111 if[1]` | `HierarchicalNodeResizingProcessor.java:148` (false) | tried: reaches (probe `hnrp-min-no-default`) |
| Sc9 | `sites/ElkLayered/childStrategyThrow` | `ElkLayeredHierarchy.ts:49 if[0]` | `ElkLayered.java:344` (`reviewAndCorrectHierarchicalProcessors`) | tried: reaches (probe `throw-child-strategy`) |
| Sc10 | `sites/LayerSweepCrossingMinimizer/modelOrderCounterTopDown` | `LayerSweepCrossingMinimizerCounting.ts:161 if[0]` | `LayerSweepCrossingMinimizer.java:441` (`!child.dontSweepInto()`) | tried: reaches (probe `nest-ports-mo-inf`) |
| Sc11 | `sites/LayerSweepCrossingMinimizer/modelOrderCounterBottomUp` | `LayerSweepCrossingMinimizerCounting.ts:161 if[1]` | `LayerSweepCrossingMinimizer.java:441` (else arm) | tried: reaches (probe `deep3-mo-sw0.1`) |
| Sc12 | `sites/CommentPreprocessor/hierarchicalPortDummy/{lone,shared}` | `CommentPreprocessor.ts:225 if[0]`, `:229 if[0]`, `:232 if[0]` (lone), `:232 if[1]` (shared), `:235 if[0]` | `CommentPreprocessor.java:226-231` (`removeHierarchicalPortDummyNode`) | tried: reaches (probe `cmt-port-lone-layer`) |
| Sc13 | `sites/GraphConfigurator/levelOptions` | `GraphConfigurator.ts:110 if[0]`, `:130 if[1]`, `:130 binary-expr[1]`, `:244 if[0]`, `:327 if[0]` | `GraphConfigurator.java:107-108` (edge spacing clamp), `:125` (favour-straightness already set), `:279` (high degree nodes), `:336-337` (node flexibility recompute) | tried: reaches (probe `cfg-level-options`) |
| Sc14 | `sites/OrthogonalEdgeRouter/extPortSelfLoop/{north,south}` | `SouthToNorthRoutingStrategy.ts:54 if[1]` (NORTH), `NorthToSouthRoutingStrategy.ts:54 if[1]` (SOUTH) | `SouthToNorthRoutingStrategy.java:58` / `NorthToSouthRoutingStrategy.java:58` (`!edge.isSelfLoop()` false); also takes `CompoundGraphPreprocessor.java:654` (the shared port) | tried: reaches (probe `ns-selfloop-NORTH`) |
| Sc15 | `sites/JsonDebugUtil/loggedCompound` | `JsonDebugUtilGraph.ts:135 if[0]`; `CrossHierarchyEdge.ts:37 fn toString` (open, see below) | `JsonDebugUtil.java:436` (`setNestedGraph` / nested graph written); `CrossHierarchyEdge.java:56` | tried: reaches (probe `pre-deep-parent-port`) |
| Sc16 | `sites/HierarchicalNodeResizingProcessor/fixedGraphSize` | (none: TS twin test `HierarchicalNodeResizingProcessor.test.ts` records it, T5 journal row) | `HierarchicalNodeResizingProcessor.java:163`, `ElkLayered.java:702` | tried: runs, no arm (probe `hnrp-fixed-graph-size`) |

### Sc1 `sites/CompoundGraphPreprocessor/portLabelNorth`

- **Graph:** compound `c` (`portConstraints=FIXED_SIDE`) with a labelled NORTH port `pn` whose edges run to `a` outside and to child `x` inside; port labels stay at the default OUTSIDE placement.
- **Options:** root `elk.direction=RIGHT`, `hierarchyHandling=INCLUDE_CHILDREN`; on `c` `portConstraints=FIXED_SIDE` (the node that owns the behaviour).
- **Run:** full layout through the engine (or the stop after `CompoundGraphPreprocessor`).
- **ELK JSON** (probe `pre-portlabel-north`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"pn","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"NORTH"},"labels":[{"text":"lp","width":20.0,"height":10.0}]}],"edges":[{"id":"ei","sources":["pn"],"targets":["x"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["pn"]}]}
```

### Sc2 `sites/CompoundGraphPreprocessor/insideSelfLoopFlow`

- **Graph:** compound `c` with `insideSelfLoops.activate`, ports `p1` WEST, `p2`/`p3` EAST; edges `a->p1`, `p2->b` (plain), `p1->x`, `x->p3` inside (so `p1` and `p3` already own dummies), `p1->p3` with `insideSelfLoops.yo` (inside self loop), `p1->p2` and `p2->p3` without it (plain self loops of `c`).
- **Options:** on `c`: `insideSelfLoops.activate=true`, `portConstraints=FIXED_SIDE`; on edge `e3`: `insideSelfLoops.yo=true`.
- **Run:** full layout through the engine (or the stop after `CompoundGraphPreprocessor`).
- **ELK JSON** (probe `pre-isl-flow`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"b","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"insideSelfLoops.activate":"true","portConstraints":"FIXED_SIDE"},"ports":[{"id":"p1","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}},{"id":"p2","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}},{"id":"p3","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"ei1","sources":["p1"],"targets":["x"]},{"id":"ei2","sources":["x"],"targets":["p3"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["p1"]},{"id":"e2","sources":["p2"],"targets":["b"]},{"id":"e3","sources":["p1"],"targets":["p3"],"layoutOptions":{"insideSelfLoops.yo":"true"}},{"id":"e4","sources":["p1"],"targets":["p2"]},{"id":"e5","sources":["p2"],"targets":["p3"]}]}
```

### Sc3 `sites/CompoundGraphPreprocessor/fixedSideOut`

- **Graph:** compound `c` with `portConstraints=FIXED_SIDE`, no ports; child `x` has an edge to `b` outside.
- **Options:** on `c`: `portConstraints=FIXED_SIDE`.
- **Run:** full layout through the engine (or the stop after `CompoundGraphPreprocessor`).
- **ELK JSON** (probe `pre-fixedside-out`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"b","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"portConstraints":"FIXED_SIDE"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["x"],"targets":["b"]}]}
```

### Sc4 `sites/CompoundGraphPreprocessor/deepOutMerged`

- **Graph:** three levels `c{d{x}}`; `x` owns one port `xp` with two outgoing edges to `b1` and `b2` outside `c` (the merged external port is reused for the second edge on both levels). `x` needs an explicit port: the importer gives each portless edge its own port, so a merge never happens without one.
- **Options:** root options as Sc1.
- **Run:** full layout through the engine (or the stop after `CompoundGraphPreprocessor`).
- **ELK JSON** (probe `pre-deep-out-merged`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"b1","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"b2","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"d","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0,"ports":[{"id":"xp","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}}]}]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["xp"],"targets":["b1"]},{"id":"e2","sources":["xp"],"targets":["b2"]}]}
```

### Sc5 `sites/CompoundGraphPreprocessor/deepToParentPort`

- **Graph:** three levels `c{d{x,y}}`; `c` has ports `cp` EAST and `cq` WEST; `x->cp`, `y->cp`, `cq->x`, `cq->y` end at the parent node of the intermediate level (non-exported external ports), `a->cq` outside.
- **Options:** root options as Sc1.
- **Run:** full layout through the engine (or the stop after `CompoundGraphPreprocessor`).
- **ELK JSON** (probe `pre-deep-parent-port`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"d","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"y","x":0.0,"y":0.0,"width":30.0,"height":30.0}]}],"ports":[{"id":"cp","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}},{"id":"cq","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["x"],"targets":["cp"]},{"id":"e2","sources":["y"],"targets":["cp"]},{"id":"e3","sources":["cq"],"targets":["x"]},{"id":"e4","sources":["cq"],"targets":["y"]},{"id":"e5","sources":["a"],"targets":["cq"]}]}
```

### Sc6 `sites/CompoundGraphPostprocessor/unnecessaryBendpoints/{RIGHT,DOWN}`

- **Graph:** compound `c{x,y}` with `x->y` inside and edges `a->x`, `y->b` crossing the boundary; run once with `elk.direction=RIGHT` (reaches `binary-expr[4]`) and once with `DOWN` (`post-unnec-DOWN`: the graph is the same, only `elk.direction` changes; also reaches `binary-expr[5]`, an x difference within the tolerance).
- **Options:** root `unnecessaryBendpoints=true` (the graph option read at `CompoundGraphPostprocessor.java:79`), direction as stated.
- **Run:** full layout through the engine (or the stop after `CompoundGraphPostprocessor`).
- **ELK JSON** (probe `post-unnec-RIGHT`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"b","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"y","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"edges":[{"id":"ei","sources":["x"],"targets":["y"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","unnecessaryBendpoints":"true"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]},{"id":"e2","sources":["y"],"targets":["b"]}]}
```

### Sc7 `sites/HierarchicalNodeResizingProcessor/defaultMinimum`

- **Graph:** compound `c{x}`; `nodeSize.constraints=[PORTS]` makes the importer compute a minimum size (which is 0 without `MINIMUM_SIZE`), then adds `MINIMUM_SIZE` to the graph; `DEFAULT_MINIMUM_SIZE` is the default option, so the minimum is still `<= 0` when the resizer runs. Probe observation, mechanism not isolated: with `[MINIMUM_SIZE]` set directly the arm is not taken, even for a 0 by 0 node and an explicit `(0, 0)` minimum (the importer's `calculateMinimumGraphSize` raises the minimum when `MINIMUM_SIZE` is already set).
- **Options:** on `c`: `nodeSize.constraints=[PORTS]`, `nodeSize.options=[DEFAULT_MINIMUM_SIZE]`.
- **Run:** full layout through the engine (or the stop after `HIERARCHICAL_NODE_RESIZER` on the nested graph).
- **ELK JSON** (probe `hnrp-default-min`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"nodeSize.constraints":"[PORTS]","nodeSize.options":"[DEFAULT_MINIMUM_SIZE]"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]}]}
```

### Sc8 `sites/HierarchicalNodeResizingProcessor/minimumWithoutDefault`

- **Graph:** compound `c{x}` with a configured minimum size and `DEFAULT_MINIMUM_SIZE` removed.
- **Options:** on `c`: `nodeSize.constraints=[MINIMUM_SIZE]`, `nodeSize.options=[]`, `nodeSize.minimum=(200, 150)`.
- **Run:** as Sc7.
- **ELK JSON** (probe `hnrp-min-no-default`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"nodeSize.constraints":"[MINIMUM_SIZE]","nodeSize.options":"[]","nodeSize.minimum":"(200, 150)"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]}]}
```

### Sc9 `sites/ElkLayered/childStrategyThrow`

- **Graph:** the `deep3`-free minimal form: root `crossingMinimization.strategy=NONE` (a processor that is not hierarchy aware) while the compound `c` keeps `LAYER_SWEEP`; T1's missing row `full/hierarchy-aware/deep3/child-strategy-median` is the same defect with `c2` on `MEDIAN_LAYER_SWEEP` under a `LAYER_SWEEP` root (TS also throws the same exception on that input, probe `ot-deep3-child-median`).
- **Options:** root: `crossingMinimization.strategy=NONE`, `greedySwitchHierarchical.type=TWO_SIDED`; `c` default.
- **Run:** full layout through the engine; the oracle throws `UnsupportedGraphException` (`ElkLayered.java:344`), so the expected value is a recorded exception (class and message), which the landed row shape cannot hold: the orchestrator decides the carrier (see "Oracle throws").
- **ELK JSON** (probe `throw-child-strategy`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"b","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"d","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"f","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"y","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"z","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"w1","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}},{"id":"w2","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}},{"id":"e1","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}},{"id":"e2","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"i1","sources":["w1"],"targets":["y"]},{"id":"i2","sources":["w2"],"targets":["x"]},{"id":"i3","sources":["x"],"targets":["e1"]},{"id":"i4","sources":["y"],"targets":["e2"]},{"id":"i5","sources":["x"],"targets":["z"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","crossingMinimization.strategy":"NONE","greedySwitchHierarchical.type":"TWO_SIDED"},"edges":[{"id":"o1","sources":["a"],"targets":["w1"]},{"id":"o2","sources":["b"],"targets":["w2"]},{"id":"o3","sources":["e1"],"targets":["d"]},{"id":"o4","sources":["e2"],"targets":["f"]}]}
```

### Sc10 `sites/LayerSweepCrossingMinimizer/modelOrderCounterTopDown`

- **Graph:** compound `c` (`FIXED_SIDE`) with two WEST and two EAST ports crossed on both sides and three children; the counter sees a child graph that is swept top-down.
- **Options:** root: `considerModelOrder.strategy=NODES_AND_EDGES`, `considerModelOrder.crossingCounterNodeInfluence=0.5` (the Java tests the node influence twice, `LayerSweepCrossingMinimizer.java:194-195`, so the port influence alone does not select the model-order counter).
- **Run:** full layout through the engine.
- **ELK JSON** (probe `nest-ports-mo-inf`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"b","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"d","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"f","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"y","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"z","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"w1","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}},{"id":"w2","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}},{"id":"e1","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}},{"id":"e2","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"i1","sources":["w1"],"targets":["y"]},{"id":"i2","sources":["w2"],"targets":["x"]},{"id":"i3","sources":["x"],"targets":["e1"]},{"id":"i4","sources":["y"],"targets":["e2"]},{"id":"i5","sources":["x"],"targets":["z"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","considerModelOrder.strategy":"NODES_AND_EDGES","considerModelOrder.crossingCounterNodeInfluence":"0.5"},"edges":[{"id":"o1","sources":["a"],"targets":["w1"]},{"id":"o2","sources":["b"],"targets":["w2"]},{"id":"o3","sources":["e1"],"targets":["d"]},{"id":"o4","sources":["e2"],"targets":["f"]}]}
```

### Sc11 `sites/LayerSweepCrossingMinimizer/modelOrderCounterBottomUp`

- **Graph:** the `hierarchy-aware/deep3` graph (landed row `full/hierarchy-aware/deep3/sweepiness-0.1`) with the model-order options of Sc10; its child graphs are swept bottom-up (`dontSweepInto`).
- **Options:** root: `crossingMinimization.hierarchicalSweepiness=0.1`, `considerModelOrder.strategy=NODES_AND_EDGES`, `considerModelOrder.crossingCounterNodeInfluence=0.5`.
- **Run:** full layout through the engine.
- **ELK JSON** (probe `deep3-mo-sw0.1`; the landed `input: { elk }` shape):

```json
{"id":"root","children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c1","children":[{"id":"p","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c2","children":[{"id":"q","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c3","children":[{"id":"z","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"w","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"x":0.0,"y":0.0,"width":30.0,"height":30.0,"edges":[{"id":"ec3","sources":["z"],"targets":["w"]}]}],"x":0.0,"y":0.0,"width":30.0,"height":30.0,"edges":[{"id":"m3","sources":["q"],"targets":["z"]}]}],"x":0.0,"y":0.0,"width":30.0,"height":30.0,"edges":[{"id":"m1","sources":["p"],"targets":["w"]},{"id":"m2","sources":["q"],"targets":["p"]}]}],"layoutOptions":{"elk.direction":"RIGHT","crossingMinimization.hierarchicalSweepiness":"0.1","hierarchyHandling":"INCLUDE_CHILDREN","considerModelOrder.strategy":"NODES_AND_EDGES","considerModelOrder.crossingCounterNodeInfluence":"0.5"},"x":0.0,"y":0.0,"width":0.0,"height":0.0,"edges":[{"id":"r1","sources":["a"],"targets":["z"]},{"id":"r2","sources":["w"],"targets":["a"]}]}
```

### Sc12 `sites/CommentPreprocessor/hierarchicalPortDummy/{lone,shared}`

- **Graph:** a comment box `cm` attached by its only edge to a port `pc` (EAST, degree 1) of a compound `c` whose other port has hierarchical edges, so `pc` owns an external-port dummy that the nested graph has already layered (the nested graph runs ahead of the root, `ElkLayered.java:239-283`). `lone`: the dummy is alone in the last layer (the layer is removed); `shared` (`cmt-port-shared-layer`, adds a second EAST port `p2` with an edge out): the layer keeps another dummy.
- **Options:** on `cm`: `commentBox=true`; on `c`: `portConstraints=FIXED_SIDE`.
- **Run:** full layout through the engine.
- **ELK JSON** (probe `cmt-port-lone-layer`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"b","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"cm","x":0.0,"y":0.0,"width":30.0,"height":20.0,"layoutOptions":{"commentBox":"true"}},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"y","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"p1","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}},{"id":"pc","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"ei1","sources":["p1"],"targets":["x"]},{"id":"ei2","sources":["x"],"targets":["y"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["p1"]},{"id":"ec","sources":["cm"],"targets":["pc"]}]}
```

### Sc13 `sites/GraphConfigurator/levelOptions`

- **Graph:** compound `c{x,y}` with per-level options; each level (root, `c`) gets its own configuration (`prepareGraphForLayout`).
- **Options:** on root and `c`: `spacing.edgeEdge=1`; on `c`: `nodePlacement.favorStraightEdges=false`, `highDegreeNodes.treatment=true`, `nodePlacement.networkSimplex.nodeFlexibility.default=NODE_SIZE`, `nodePlacement.networkSimplex.nodeFlexibility.recomputeNodePlacement=BRANDES_KOEPF` (the property type is `NodePlacementStrategy`, not boolean).
- **Run:** full layout through the engine.
- **ELK JSON** (probe `cfg-level-options`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"b","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"y","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"nodePlacement.favorStraightEdges":"false","highDegreeNodes.treatment":"true","spacing.edgeEdge":"1","nodePlacement.networkSimplex.nodeFlexibility.default":"NODE_SIZE","nodePlacement.networkSimplex.nodeFlexibility.recomputeNodePlacement":"BRANDES_KOEPF"},"edges":[{"id":"ei","sources":["x"],"targets":["y"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","spacing.edgeEdge":"1"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]},{"id":"e2","sources":["y"],"targets":["b"]}]}
```

### Sc14 `sites/OrthogonalEdgeRouter/extPortSelfLoop/{north,south}`

- **Graph:** compound `c` with `insideSelfLoops.activate`, one NORTH (or SOUTH, `ns-selfloop-SOUTH`) port `pn` with `a->pn`, `pn->x` inside and an inside self loop `pn->pn` (`insideSelfLoops.yo`): source and target port share one external-port dummy, so the dummy gets an edge to itself that the hierarchical port router sees as a self loop.
- **Options:** on `c`: `insideSelfLoops.activate=true`, `portConstraints=FIXED_SIDE`; on the loop `insideSelfLoops.yo=true`.
- **Run:** full layout through the engine.
- **ELK JSON** (probe `ns-selfloop-NORTH`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"insideSelfLoops.activate":"true","portConstraints":"FIXED_SIDE"},"ports":[{"id":"pn","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"NORTH"}}],"edges":[{"id":"i1","sources":["pn"],"targets":["x"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["pn"]},{"id":"loop","sources":["pn"],"targets":["pn"],"layoutOptions":{"insideSelfLoops.yo":"true"}}]}
```

### Sc15 `sites/JsonDebugUtil/loggedCompound`

- **Graph:** the Sc5 graph laid out with a monitor that has logging enabled (the labels recorder's `logged` mechanism, `new BasicProgressMonitor().withLogging(true)`); the expected value is the logged DOT/JSON list. Check at record time that the Java text of the root graph's `crossHierarchyMap` property (`HashMultimap.toString` calling `CrossHierarchyEdge.toString` and the edges' `toString`) is what the TS prints: the TS probe did not call `CrossHierarchyEdge.toString` at all.
- **Options:** as Sc5, plus logging.
- **Run:** full layout through the engine under a logging monitor, the log compared with `compareLogged`.
- **ELK JSON** (probe `pre-deep-parent-port`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"d","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"y","x":0.0,"y":0.0,"width":30.0,"height":30.0}]}],"ports":[{"id":"cp","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"EAST"}},{"id":"cq","x":0.0,"y":0.0,"width":4.0,"height":4.0,"layoutOptions":{"port.side":"WEST"}}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["x"],"targets":["cp"]},{"id":"e2","sources":["y"],"targets":["cp"]},{"id":"e3","sources":["cq"],"targets":["x"]},{"id":"e4","sources":["cq"],"targets":["y"]},{"id":"e5","sources":["a"],"targets":["cq"]}]}
```

### Sc16 `sites/HierarchicalNodeResizingProcessor/fixedGraphSize`

- **Graph:** compound `c{x}` with `nodeSize.fixedGraphSize=true` and a minimum larger than the content; no coverage arm, a behaviour row: T5 found `HierarchicalNodeResizingProcessor.java:163` has no `NODE_SIZE_FIXED_GRAPH_SIZE` guard while `ElkLayered.java:702` has, so only an oracle row says which size the nested graph gets.
- **Options:** on `c`: `nodeSize.fixedGraphSize=true`, `nodeSize.constraints=[MINIMUM_SIZE]`, `nodeSize.minimum=(200, 150)`.
- **Run:** full layout through the engine.
- **ELK JSON** (probe `hnrp-fixed-graph-size`; the landed `input: { elk }` shape):

```json
{"id":"root","x":0.0,"y":0.0,"width":0.0,"height":0.0,"children":[{"id":"a","x":0.0,"y":0.0,"width":30.0,"height":30.0},{"id":"c","x":0.0,"y":0.0,"width":30.0,"height":30.0,"children":[{"id":"x","x":0.0,"y":0.0,"width":30.0,"height":30.0}],"layoutOptions":{"nodeSize.fixedGraphSize":"true","nodeSize.constraints":"[MINIMUM_SIZE]","nodeSize.minimum":"(200, 150)"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]}]}
```

**Not scenarios:** the `Issue*Test` and `EdgeCoordsTest` ports need none (J2 above); Sc16 decides a behaviour, not an arm.
**Untried design, listed so T14 can try it:** none of the S arms is untried. The open items (below) have attempts but no design that reaches them.

## Per class

### 7h classes (`src/alg/layered/compound/*`, `HierarchicalNodeResizingProcessor.ts`): 34 items (33 arms, 1 function)

| TS site | Java | Cat | Scenario or proof |
| ------- | ---- | --- | ----------------- |
| `CompoundGraphPreprocessorSections.ts` :214 if[1] | `CompoundGraphPreprocessor.java:217-218` | S | Sc1 |
| `CompoundGraphPreprocessorDummies.ts` :58 if[1] | `:632` | S | Sc2 |
| `CompoundGraphPreprocessorDummies.ts` :97 if[1] | `:636`, `:654` | S | Sc2 (Sc14 also) |
| `CompoundGraphPreprocessorDummies.ts` :196 cond-expr[1] | `:760` | S | Sc3 |
| `CompoundGraphPreprocessorDummies.ts` :308 binary-expr[1,2], :311 if[0], binary-expr[1], :313 if[0], binary-expr[1] | `:838-845` | S | Sc2 |
| `CompoundGraphPreprocessorDummies.ts` :329 binary-expr[1,2], :332 if[0], binary-expr[1], :334 if[0], binary-expr[1] | `:856-863` | S | Sc2 |
| `CompoundGraphPreprocessorSegments.ts` :254 if[1], :438 if[1] | `:396`, `:564` | S | Sc4 |
| `CompoundGraphPreprocessorSegments.ts` :214 if[1], :218 if[1], :259 if[1], :302 if[1] | `:448`, `:452`, `:401`, `:438` | S | Sc5 |
| `CompoundGraphPreprocessorSegments.ts` :122 switch[3] | `:281` | U | dead: `EdgeLabelPlacement` has only `CENTER`, `HEAD`, `TAIL` (`core/options/EdgeLabelPlacement.java:23-27`) and the property has the default `CENTER`, so the switch never takes `default` |
| `CompoundGraphPreprocessorSegments.ts` :95 if[1] | `:286` | U | dead: `targetDummyEdgeIndex` stays `-1` only through the `default` arm above; `getShallowestEdgeSegment` (`:315-336`) starts at `-1` and every non-empty segment list sets `result` (an `INPUT` segment sets `0` or `index - 1`, the last non-`INPUT` segment sets `index`), and the list of a key edge is never empty |
| `CompoundGraphPostprocessorSections.ts` :223 binary-expr[4,5] | `CompoundGraphPostprocessor.java:148-149` | S | Sc6 |
| `CompoundGraphPostprocessorSections.ts` :239 if[0], :245 if[1], :259 if[1] | `:210-212`, `:216`, `:230` | U | dead: `LayeredOptions.JUNCTION_POINTS` has the default `new KVectorChain()` (`core/options/CoreOptions` / `Core.melk:675`) and `MapPropertyHolder.getProperty` stores and returns a clone of a cloneable default, so the read is never `null`. T7 counts four dead arms: v8 reports three untaken arms in this file, the fourth (the `jps != null` operand of `hasJunctionPoints`, `:67`) shows up as a taken operand |
| `CrossHierarchyEdgeComparator.ts` :55 if[0] | `CrossHierarchyEdgeComparator.java:76-79` (`IllegalArgumentException`) | U | dead: the comparator is built with the root graph (`CompoundGraphPostprocessor.java:93`, `CompoundGraphPreprocessor.java:259`) and every segment's graph is created by the recursion from that root (`transformHierarchyEdges`, `:158`), so the parent chain of every segment graph ends at the root before `getParentNode()` is `null`. The tie (`return level1 - level2 == 0`) is not a v8 arm |
| `CrossHierarchyEdge.ts` :37 fn `toString` | `CrossHierarchyEdge.java:56` | **open** | the only ELK reader is the implicit `HashMultimap.toString` of the root graph's `CROSS_HIERARCHY_MAP` property in the debug JSON (`JsonDebugUtil.java:611`), which prints `OUTPUT:` + the edge. The logged TS probe (Sc15) did not call it: the TS value printer evidently prints the map another way. Tried: a logged run of Sc5 (`probelog`: 0 calls of the function); not diagnosed (see Open problems) |
| `HierarchicalNodeResizingProcessor.ts` :112 if[0], :116 if[0] | `HierarchicalNodeResizingProcessor.java:149`, `:153` | S | Sc7 |
| `HierarchicalNodeResizingProcessor.ts` :111 if[1] | `:148` | S | Sc8 |

### Driver files (H8 1): `ElkLayered.ts`, `ElkLayeredHierarchy.ts`, `ElkLayeredTestExecutionState.ts`, `GraphConfigurator.ts`

| TS site | Java | Cat | Scenario, suite or mechanism |
| ------- | ---- | --- | ---------------------------- |
| `ElkLayeredHierarchy.ts` :49 if[0] | `ElkLayered.java:344` | S | Sc9 (an oracle throw) |
| `GraphConfigurator.ts` :110 if[0], :130 if[1], binary-expr[1], :244 if[0], :327 if[0] | `GraphConfigurator.java:107-108`, `:125`, `:336-337`, `:279` | S | Sc13 |
| `GraphConfigurator.ts` :307 if[0] | `GraphConfigurator.java:258` (`LAYERING_NODE_PROMOTION_STRATEGY != NONE`) | J | `ModelOrderLayerAssignmentTest` |
| `GraphConfigurator.ts` :116 if[0] | `:112` | U | engine-unreachable: the importer resolves `UNDEFINED` directions (`ElkGraphImporterGraphs.ts:31`); only a hand-built `LGraph` reaches it (7f J) |
| `GraphConfigurator.ts` :122 if[0] | `:118` | U | engine-unreachable for an oracle row: seed 0 draws from `new Random()` (not repeatable; stop 6) |
| `GraphConfigurator.ts` :150 fn, :151 fn | `:141` | U | engine-unreachable: `copyPortContraints` over layers needs a hand-built layered `LGraph` (7f J) |
| `ElkLayered.ts` :72 if[0], :116 if[0] | `ElkLayered.java:137`, `:181` | U | engine-unreachable: a `null` monitor; every engine caller passes one (7f J, `ElkLayered.test.ts`) |
| `ElkLayered.ts` :280 fn `runLayoutTestUntil`, :281, :282 cond-expr[0,1], :291 binary-expr[0,1], :292 if[0,1], :295 if[0,1], :303 if[0,1], :326 if[0] | `ElkLayered.java:446` | U | engine-unreachable: the JUnit test API (7f J); the nine 7h suites and the 83 others do not call it (B2: 0 hits) |
| `ElkLayeredTestExecutionState.ts` :30 fn `getStep` | `ElkLayered.java` `TestExecutionState` | U | test API, as above |

E (earlier landed rows, B1): `ElkLayered.ts` 15 arms/functions (`:90`, `:268`, `:326 if[1]`, `:402`, `:409`, `:436`, `:465`, the logging and test-controller functions), `GraphConfigurator.ts` 11 arms (`:235`, `:268`, `:275`, `:281`, `:312`, `:319`, `:320`, `:338`, `:365`, `:374`, `:376`). The hierarchical arms of the pipeline map (H8 1) are all **taken** in run A (see the closure table).

### Labels items (H8 2): `JsonDebugUtilEdges.ts`, `JsonDebugUtilGraph.ts`, `CommentPreprocessor.ts`

| TS site | Java | Cat | Scenario or proof |
| ------- | ---- | --- | ----------------- |
| `JsonDebugUtilEdges.ts` :56 if[0] | `JsonDebugUtil.java:471` | U | dead: `TARGET_OFFSET` is written only by `CompoundGraphPostprocessor.java:174`, which runs after the last debug log of a run (`ElkLayered.java:179-198`: `doCompoundLayout` logs nothing around the postprocessor; the logs are the `hierarchicalLayout` slots `:249-283` and its `Finished` line `:292`). Probe: a logged compound run (Sc15 graph) takes `:56 if[1]` only |
| `JsonDebugUtilGraph.ts` :135 if[0] | `JsonDebugUtil.java:436` | S | Sc15 (taken by the logged run; no recorded row logs a compound graph) |
| `JsonDebugUtilGraph.ts` :47 if[0] | `JsonDebugUtil.java:303` | U | dead (7f2 proof, unchanged: layerless nodes and layers never coexist when logged; in 7h each level runs its own layerer before its own logs) |
| `JsonDebugUtilGraph.ts` :182 if[1], :188 cond-expr[1], :191 if[1] | `JsonDebugUtil.java:630,636,643` | U | dead (7f2/7g proofs: `LNode.getDesignation` never null; the same-side self-loop dummy origin) |
| `CommentPreprocessor.ts` :225 if[0], :229 if[0], :232 if[0], :235 if[0] | `CommentPreprocessor.java:226-231` | S | Sc12 `lone` |
| `CommentPreprocessor.ts` :232 if[1] | `:228` | S | Sc12 `shared` |
| `CommentPreprocessor.ts` :155 if[1], :161 if[1] | `:211`, `:217` | U | dead (7f2 proof: the opposite port had degree 1 and just lost that edge) |
| `CommentPreprocessor.ts` :229 if[1], :235 if[1] | `:228`, `:230` | U | dead: guards for `List.remove` on an element that is in the list by construction |
| `EdgeAndLayerConstraintEdgeReverser.ts` :273 if[0], :308 if[0] (named by the labels map as 7h) | `EdgeAndLayerConstraintEdgeReverser.java:297,338` | U | dead (7f2 proof, unchanged by the replay: still untaken in run A): no `LABEL` node exists at the reverser slot; each hierarchy level runs its own reverser before its own label dummy inserter |
| `LabelManagementProcessor.ts` :56 if[1], :310 if[1] (named as 7h) | `LabelManagementProcessor.java:84`, `:230` | U | dead (7f2 proofs, unchanged): the processor joins a plan only when the graph holds a label manager (`GraphConfigurator.java:221-222`, per graph); origin-less labels exist only on `EXTERNAL_PORT` dummy ports, which `manageNonCenterLabels` skips (`:113`) |

### Loops items (H8 3)

| TS site | Java | Cat | Scenario or proof |
| ------- | ---- | --- | ----------------- |
| `NorthToSouthRoutingStrategy.ts` :54 if[1], `SouthToNorthRoutingStrategy.ts` :54 if[1] | `NorthToSouthRoutingStrategy.java:58`, `SouthToNorthRoutingStrategy.java:58` | S | Sc14 |
| both strategies :38 if[0] | `:47` (`segment.isDummy()`) | **open** | a dummy segment exists only after `HyperEdgeSegmentSplitter` split a critical cycle (`OrthogonalRoutingGenerator.java:452-464`; needs two segments whose connection coordinates are within `criticalConflictThreshold`, `:176`, `:408`). Tried: 22 chain graphs with 3-5 north or south ports at reversed fixed positions, a scan of port positions, `FIXED_POS` ports (positions are ignored there: the routing is not the hierarchical-port router), `FIXED_RATIO` (throws, see Oracle throws): no dummy segment |
| both strategies :58 if[1] | `:62` (`abs(sourceX - targetX) <= TOLERANCE`) | **open** | a straight edge needs the dummy's x (evenly spread by `HierarchicalPortOrthogonalEdgeRouter.java:calculateNorthSouthDummyPositions` under `FIXED_SIDE`/`FIXED_ORDER`) to equal the source port's x within `1e-3`; tried: single-child graphs (the dummy then sits at the graph centre, the east port at the right border), 20 `FIXED_POS` positions: not reached; not proven impossible |
| both strategies :78 if[0] | `:72` (`getSplitPartner() != null`) | **open** | needs a dummy segment (above) |
| `BaseRoutingDirectionStrategy.ts` :73 if[0] | `BaseRoutingDirectionStrategy.java:105` | U | dead: `JUNCTION_POINTS` is never `null` (same argument as the postprocessor) |
| `BaseRoutingDirectionStrategy.ts` :111 fn `getCreatedJunctionPoints` | `BaseRoutingDirectionStrategy.java:137` | U | no caller in `org.eclipse.elk.alg.layered` |
| `BaseRoutingDirectionStrategyForRoutingDirection.ts` :20 switch[3] | `BaseRoutingDirectionStrategy.java:57` | U | dead: the TS `default` of a switch over the complete `RoutingDirection` enum (three members) |
| `RoutingDirection.ts` :39 fn, :40 if[0,1], :48, :52, :56, :60 fns | `RoutingDirection.java` | U | enum API (`find`, `ordinal`, `name`, `toString`, `compareTo`), no ELK caller |
| `SelfLoopHolder.ts` :70 (Java `SelfLoopPreProcessor.java:55`), `SelfLoopPreProcessor.ts` :77 binary-expr[1] (`:90`, `:100`) | | reached in run A | see the closure table (rows `scenarios/ElkLayered/inside-self-loop/RIGHT`, `scenarios/ElkLayered/compound-self-loop-ports/RIGHT`) |

### Crossing minimisation (H8 4)

The 97 items of the previous task's lists (A: 33 arms and 4 functions; B: 57 arms and 3 functions; four arms are on both lists: `GreedyPortDistributor.ts:123 if[1]`,
`LayerSweepCrossingMinimizerCounting.ts:161 if[1]`, `SweepCopy.ts:53 if[0]`, `PortSideProcessor.ts:70 if[0]`), measured against run A, B1 and B2, resolved to their Java lines:

| Item | Java | Cat | Suite, scenario or proof |
| ---- | ---- | --- | ------------------------ |
| list A, 24 arms: `BetweenLayerEdgeTwoNodeCrossingsCounter.ts` :88, :105, :122 if[0] | `BetweenLayerEdgeTwoNodeCrossingsCounter.java:102,121,140` | J | `BetweenLayerEdgeTwoNodeCrossingsCounterTest`, `SwitchDeciderTest` |
| `SwitchDecider.ts` :78 binary-expr[2,3], :82 if[0], :97 cond-expr[0], :99 if[0], :148 if[0] | `SwitchDecider.java:78-80` (constructor), `:96` (`rightMostLayer` branch), `:124-147` (`doesSwitchReduceCrossings`) | J | `LayerSweepHierarchicalTwoSidedGreedySwitchTest`, `SwitchDeciderTest` |
| `SwitchDecider.ts` :94 cond-expr[0], :97 cond-expr[1], :99 if[1] | `:91`, `:93-94`, `:96` | J | `LayerSweepHierarchicalTwoSidedGreedySwitchTest` |
| `SwitchDecider.ts` :94 cond-expr[1], :116 if[0] | `:91`, `:114` (`notifyOfSwitch`) | J | `SwitchDeciderTest` (and the hierarchical suite for :94) |
| `ForsterConstraintResolver.ts` :56 if[1] | `ForsterConstraintResolver.java:65` | J | `AllCrossingsCounterTest` |
| `GreedyPortDistributor.ts` :58 if[0], :62 cond-expr[1], :120 if[0], :123 if[0], binary-expr[0,1] | `GreedyPortDistributor.java:61,65,113,115` | J | `GreedyPortDistributorTest`, `LayerSweepHierarchicalTwoSidedGreedySwitchTest` |
| `LayerSweepCrossingMinimizerHierarchical.ts` :59 if[1] | `LayerSweepCrossingMinimizer.java:538` area (`sortPortDummiesByPortPositions` loop) | J | `LayerSweepCrossingMinimizerTest` |
| `LayerSweepTypeDecider.ts` :65 if[0] | `LayerSweepTypeDecider.java:66` (`graphData.crossMinDeterministic()` false arm, line `:70`) | J | `LayerSweepCrossingMinimizerTest`, the two-sided hierarchical suite, `SwitchDeciderTest` |
| `AllCrossingsCounter.ts` :46 if[0] | `AllCrossingsCounter.java:61` | J | `AllCrossingsCounterTest` |
| list A, 4 functions: `GraphInfoHolder.parentGraphData` (:266), `portPositions` (:290); `SwitchDecider.initParentCrossingsCounters` (:88), `countCrossingsBetweenOriginPorts` (:176) | `GraphInfoHolder.java:241,265`; `SwitchDecider.java:85,147-154` | J | `LayerSweepHierarchicalTwoSidedGreedySwitchTest`, `SwitchDeciderTest` |
| `LayerSweepCrossingMinimizerCounting.ts` :161 if[0] | `LayerSweepCrossingMinimizer.java:441` | S | Sc10 (A and B list) |
| `LayerSweepCrossingMinimizerCounting.ts` :161 if[1] | `:441` | S | Sc11 (A and B list) |
| `BarycenterHeuristic.ts` :419 if[1] | `BarycenterHeuristic.java:338` | U | engine-unreachable: the only caller is the sweep loop `LayerSweepCrossingMinimizer.java:459-460`, which starts at `firstFree` (`:565-566`: layer 1 forward, `length - 2` backward) and never passes the start index (`isFirstLayer`, `BarycenterHeuristic.java:391-394`); `BarycenterHeuristicTest` does not call the layer overload on the first layer (B2: 0 hits) |
| `GreedyPortDistributor.ts` :62 cond-expr[0] | `GreedyPortDistributor.java:65` | U | engine-unreachable: the forward hierarchical counter needs a node that is not order-fixed with a nested graph and a WEST port (`:61`); every such node is order-fixed or `FIXED_POS` when a greedy run meets it (findings above); the suites reach the backward arm only |
| `GreedyPortDistributor.ts` :123 if[1] (A and B list) | `:115` | U | engine-unreachable: as above, and a compound node's ports all own dummies (`CompoundGraphPreprocessor.java:176-190`), so `PORT_DUMMY` is null only on a hand-built port; the suites reach `if[0]` only |
| `SweepCopy.ts` :53 if[0] (A and B list) | `SweepCopy.java:71` | U | dead: both constructors read their argument (`SweepCopy.java:51-58`, `:64-66`: `for (LNode[] lNodes : nodeOrderIn)`, `sc.nodeOrder`) and the only two call sites pass `currentNodeOrder()` (= `graph.toNodeArray()`, non-null) and a copy of it (`LayerSweepCrossingMinimizer.java:547,553`) |
| `SweepCopy.ts` :125 if[1] | `SweepCopy.java:120` | U | dead: `transferNodeAndPortOrdersToGraph` has one caller, passing `true` (`LayerSweepCrossingMinimizer.java:636`); `SweepCopy` is package-private and no test calls it (`grep` over `../elk/test`: no hit) |
| `PortSideProcessor.ts` :70 if[0] (A and B list) | `PortSideProcessor.java:101` | U | dead: a port carries `PORT_DUMMY` only after `CompoundGraphPreprocessor.java:133`, which sets the node to `FIXED_SIDE` and the port side from the dummy (`:135-137`); `PortSideProcessor.process` then calls `setPortSide` only for `UNDEFINED` sides (`:80-83`), and every dummy side is defined (`LGraphUtil.java:818-823` computes it for non-fixed constraints; `ElkGraphImporter.ensureDefinedPortSide` for fixed ones). Probe: compound graphs with `FREE`, `FIXED_SIDE` and `FIXED_ORDER` ports never reach it |
| `LayerSweepCrossingMinimizerHierarchical.ts` :64 if[0] | `LayerSweepCrossingMinimizer.java:538` (`IllegalStateException`) | U | dead: the dummies of the layer at the sweep edge are `EXTERNAL_PORT` dummies of the nested graph on one side, each created for one port of the parent on that side (`CompoundGraphPreprocessor.java:132-133` marks it `INSIDE_CONNECTIONS`, which is `isHierarchical`), and `CrossMinUtil.inNorthSouthEastWestOrder(parent, side)` lists at least those ports, so `i` reaches the layer length |
| list B, 56 further arms (the 3 functions below included) | | | see the next two tables |

List B, arms still untaken, by cause:

| Item | Java | Cat | Proof |
| ---- | ---- | --- | ----- |
| `NorthSouthPortPreprocessor.ts` :173 if[0], :209 if[0]; `NorthSouthPortPreprocessorDummies.ts` :137 if[1], :165 binary-expr[0,1], :171 if[0,1], fn `createOldApproachDummies` (:152) | `NorthSouthPortPreprocessor.java:244,292,487-521` | U | dead: behind the constant `USE_NEW_APPROACH = true` (`NorthSouthPortPreprocessor.java:148`) |
| `PortListSorter.ts` :89 if[0] | `PortListSorter.java:111-113` | U | dead: `reverseWestAndSouthSide` returns before `findPortSideRange` for a list of at most one port |
| `PortListSorter.ts` :195 if[0] | `:219-221` | U | dead: `CMP_PORT_SIDE` decides different sides first; reachable only by calling the comparator directly |
| `SortByInputModelProcessor.ts` :189 binary-expr[0,1] | `SortByInputModelProcessor.java:173-186` | U | `insertionSortPort` is public and uncalled |
| `SortByInputModelProcessor.ts` :159 if[0] | `:145-149` | E | reached by an earlier mission's site rows (`northSouthInOut`) |
| `ModelOrderNodeComparator.ts` :100 if[0], :105 if[0]; `ModelOrderPortComparator.ts` :114 if[0], :119 if[0] | `ModelOrderNodeComparator.java:168-202`, `ModelOrderPortComparator.java:215-226` | U | dead: `biggerThan[x] contains y` iff `smallerThan[y] contains x` is kept by `updateBiggerAndSmallerAssociations` (a fuzz of 180,000 updates in 7c found no asymmetric state) |
| `ModelOrderNodeComparatorAssociations.ts` :31 if[1] | `ModelOrderNodeComparator.java:296-299` | U | dead: the port was found by `getIncomingEdges().length != 0` |
| `ModelOrderNodeComparatorHelperDummies.ts` :57 if[0], :62 if[0] | `ModelOrderNodeComparator.java:330` area | U | dead (7c): an inverted-port dummy sits behind its source and target, the insertion sort cannot move it past them |
| `ModelOrderNodeComparatorHelperDummies.ts` :120 if[1], :172 if[0], :172 binary-expr[1], :175 if[1], :178 if[0,1], :178 binary-expr[0,1] | `ModelOrderNodeComparator.java:330-460` | **open** | 7c: both dummies unconnected to the previous layer plus a same-reference pair; 120 random inverted-port graphs and about 15,000 class scans found no input (not retried here; the nested graphs add no new shape: these are flat comparator paths) |
| `ModelOrderNodeComparatorPreviousLayer.ts` :52 if[1], :146 if[0,1] | `ModelOrderNodeComparator.java:203-215` | U | dead: the "cannot happen" tail of `compareBothConnected` (the Java's own comment) |
| `ModelOrderPortComparatorIncoming.ts` :69 if[1], :76 if[1], :156 if[1] | `ModelOrderPortComparator.java:259-269` | U | dead: `compareOnSameSourceNode` always finds its port; `checkReferenceLayer` returns 0 only for nodes missing from the layer |
| `ModelOrderPortComparatorIncoming.ts` :157 if[1] | `:174` | **open** | 7c: same-layer long-edge dummies feed only EAST ports, as `INVERTED_PORT_PROCESSOR` creates them; no scenario found |
| `ModelOrderPortComparatorOutgoing.ts` :107 if[1] | `ModelOrderPortComparator.java:275` | **open** | 7c: an outgoing edge without `MODEL_ORDER`; ports and edges get it at import, processor-created edges copy it |
| `AbstractBarycenterPortDistributor.ts` :272 if[1] | `AbstractBarycenterPortDistributor.java:261-277` | **open** | 7c: only non-N/S ports enter `inLayerPorts`, and an `UNDEFINED`-side port with an in-layer edge makes the counting step throw in `BinaryIndexedTree` |
| `BarycenterHeuristic.ts` :407 if[1], :409 if[0,1], :411 if[0,1] | `BarycenterHeuristic.java:321` | U | dead: `fillInUnknownBarycenters` assigns every node a barycenter before the sort (`BarycenterHeuristic.java:118-126`) |
| `LayerSweepCrossingMinimizer.ts` :344 if[0] | `LayerSweepCrossingMinimizer.java:257-259` | U | dead: the two `*_TRY_WITH_INITIAL_ORDER` flags share one property id, so the first flag reads false once the second block ran |
| `MedianHeuristic.ts` :125 if[0], :138 if[0] | `MedianHeuristic.java:125-148` | U | dead: the free node is never in the fixed layer |
| `MedianHeuristic.ts` :166 if[1], :171 if[0,1], :173 if[0,1] | `:186` | U | dead: `calculateMedians` sets a `WEIGHT` on every free node before the sort (`:110-121`) |
| `ModelOrderBarycenterHeuristic.ts` :189 if[0], :194 if[0] | `ModelOrderBarycenterHeuristic.java:149` | **open** | 7c: the insertion sort compares a fresh pivot against the sorted prefix so the closure never answers a pair twice (`:189`/`:194` duplicate `:179`/`:184`); 300 random force graphs gave none |
| `CrossingsCounterConvenience.ts` :31 if[1] | `CrossingsCounter.java:577` | U | dead: `initPositions` is called with `(EAST, true)`, `(WEST, false)` and `(side, true)` only (`CrossingsCounter.java:482,483,288`) |
| `CrossingsCounterNorthSouth.ts` :86 if[1] | `CrossingsCounter.java:430` | U | dead: every long-edge dummy has a WEST and an EAST port (`LongEdgeSplitter.java:149-157`) |
| `ModelOrderNodeComparatorState.ts` :56 fn | `ModelOrderNodeComparator.java:41` | U | a TS initialiser the constructor overwrites |
| `CrossMinUtil.ts` :13 fn constructor | `CrossMinUtil.java` | U | private constructor of a utility class |

Arms in `p3order/**`, `greedyswitch/**` and `intermediate/preserveorder/**` that are untaken in run A, taken by no earlier row and no ported suite, and **not on either list**
(they are classified in `plans/layered-crossing-min/unreached.md`, rows "J" and "Dead by construction", and kept here as carried so the file totals add up; none is new):

| Item | Java | Cat | Earlier row |
| ---- | ---- | --- | ----------- |
| `LayerSweepCrossingMinimizerCrossMinType.ts` :50 if[0,1], :49, :58, :62 fns; `HyperedgeCrossingsCounterHyperedgeCornerType.ts` :36 if[0,1], :35, :44, :48, :52 fns; `SwitchDeciderCrossingCountSide.ts` :38 if[0,1], :37, :46, :50, :54 fns; `RoutingDirection.ts` | the enums' `find`/`ordinal`/`name`/`toString` | U | Java enum API with no ELK caller (7c "J: enum surfaces") |
| `BarycenterHeuristicBarycenterState.ts` :33 fn, :36 cond-expr[0,1]; `ForsterConstraintResolverConstraintGroup.ts` :233 fn, :237 if[0,1], :240 if[0,1]; `GraphInfoHolder.ts` :250 fn, :251 fns; `LayerSweepTypeDeciderNodeInfo.ts` :23; `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts` :156, :157; `...Adjacency.ts` :40 | the `toString`s | U | debug `toString`, no ELK caller (7c) |
| `ModelOrderBarycenterHeuristic.ts` :19, `ModelOrderPortComparatorAssociations.ts` :14, `ModelOrderPortComparatorPortSideComparator.ts` :5 (`Integer.compare` arms) | | U | Java `Integer.compare` returns -1, 0, 1 and only 0 and 1 occur (7c) |
| `LayerSweepCrossingMinimizer.ts` :419 cond-expr[0] (`getGraphData` before a run) , `BarycenterHeuristic.ts` :481 `alwaysImproves`, `ModelOrderPortComparator.ts` :199 `clearTransitiveOrdering`, :190 `checkPortModelOrder`, `BinaryIndexedTree.ts` :119 `isEmpty` and :51 if[0], `SwitchDecider.ts` :67 if[0], `SortByInputModelProcessor.ts` :130 if[0], `ModelOrderNodeComparatorAssociations.ts` :35 if[0], :82 and :104 binary-expr[1] | | U | public API with no ELK caller, or a Java exception (`ArrayIndexOutOfBoundsException`, `IndexOutOfBoundsException`, NPE as `TypeError`): unrecordable (7c J) |
| `BarycenterHeuristic.ts` :27 binary-expr[0,1,2], :112 if[0], :25 fn; `ModelOrderBarycenterHeuristic.ts` :155 if[1], :162 if[0], :211 if[1], :215 if[1], :219 if[0,1], :222 if[0,1]; `BarycenterHeuristic.ts` :316 if[1]; `ForsterConstraintResolverConstraintGroup.ts` :91 if[0], :93 if[1], :95 if[0,1], :97 if[0,1], :107 if[1], :123 if[0,1]; `InteractiveCrossingMinimizer.ts` :214, :225, :235 if[1]; `LayerSweepCrossingMinimizer.ts` :210 if[1]; `LayerSweepCrossingMinimizerCounting.ts` :188 if[1]; `LayerTotalPortDistributor.ts` :31 switch[2], `NodeRelativePortDistributor.ts` :33 switch[2]; `MedianHeuristic.ts` :158 if[0], :161 if[0]; `HyperedgeCrossingsCounterHyperedge.ts` :31 if[1], :33, :35 if[0,1]; `HyperedgeCrossingsCounterHyperedgeCorner.ts` :37, :39, :41, :43 if[0], :43 binary-expr[1], :45 if[1]; `CMGroupModelOrderCalculator.ts` :31 if[0]; `BetweenLayerEdgeTwoNodeCrossingsCounterAdjacencyList.ts` :107 if[0]; `PortListSorter.ts` :226 switch[4] | | U | dead (the 7c "Dead by construction" table and its T11 corrections: force flag, null barycenters, the first group of a merge, `LONG_EDGE` bend points, the Java switch defaults, distinct hyperedges, the `UPPER`/`LOWER` corner pair) |
| `ForsterConstraintResolver.ts` :314 if[0]; `ForsterConstraintResolverConstraintGroup.ts` :113 if[0]; `ModelOrderBarycenterHeuristic.ts` :77 if[0], :179 if[0], :184 if[0]; `ModelOrderPortComparator.ts` :148 if[1] | | **open** | 7c "unreached" (720, 300 scans) |

## H8 closure

One row per item of the cited documents. "Reached" gives a recorded row of `test/golden/refs/java/layered-compound.json` found by a single-row coverage run (`rowcov.sh <row id>`: the row alone through `runRow` with v8 coverage over the
included files; the counts are the hits of that row alone).

| # | Item | Verdict | Evidence |
| - | ---- | ------- | -------- |
| 1.1 | `ElkLayered.ts` hierarchical arms: `doCompoundLayout`, `hierarchicalLayout`, `runHierarchyLevel`, `getProcessorsForRootGraph` and their arms (`plans/layered-pipeline/unreached.md:61`; now `:114`, `:116`, `:146`, `:188`, `:200`, `:210`, `:224`, `:229`) | reached | row `scenarios/CompoundGraphPreprocessor/parent-to-child/RIGHT`: `doCompoundLayout` 1, `hierarchicalLayout` 1, `runHierarchyLevel` 4, `:200 if` 42/1, `:210 if` 1/41, `getProcessorsForRootGraph` 1 |
| 1.2 | `ElkLayered.ts` `notifyProcessorReady/Finished` non-root arms (`:363 if[1]`, `:377 if[1]`; now `:361`, `:375`) | reached | same row: 22 non-root and 22 root notifications each |
| 1.3 | `ElkLayeredHierarchy.ts` (`:17`, `:27 if[0,1]`, `:43`, `:47`, `:49 if[1]`, `:59`, `:63`, `:71`, `:73`, `:77`) | reached | same row: `collectAllGraphsBottomUp` 1, `reviewAndCorrectHierarchicalProcessors` 1, the iterator `hasNext` 48, `next` 43 |
| 1.3b | `ElkLayeredHierarchy.ts:49 if[0]` (the `reviewAndCorrectHierarchicalProcessors` throw, T1's `child-strategy-median` row) | S | Sc9; no row reaches it (the oracle throws, `ElkLayered.java:344`) |
| 1.4 | `GraphConfigurator.ts` nested-graph arms (`:160`, `:263`, `:400`, `:406 binary-expr[0]`; `:350`, `:407 binary-expr[1]`) | reached | `:160 if[0]` 1, `:263 if[0]` 2, `:400 if[0]` 2, `:406 binary-expr[0]` 2 on `scenarios/CompoundGraphPreprocessor/parent-to-child/RIGHT`; `:350 if[0]` 1 and `:407 binary-expr[1]` 2 on `full/hierarchy-aware/deep3/greedy-hierarchical-two-sided` |
| 2.1 | labels `:113` `JsonDebugUtilEdges.ts:56 if[0]` | U | `JsonDebugUtil.java:471`; `TARGET_OFFSET` is written at `CompoundGraphPostprocessor.java:174`, after the last debug log of a run |
| 2.2 | labels `:115` `JsonDebugUtilGraph.ts:135 if[0]` | S | Sc15 (taken by a logged compound run; `JsonDebugUtil.java:436`) |
| 2.3 | labels `:145` `CommentPreprocessor.ts:225 if[0]`, `:229 if[0]`, `:232 if[0]`, `:232 if[1]`, `:235 if[0]` | S | Sc12 (`CommentPreprocessor.java:226-231`; the Java reaches it because the nested graph runs ahead of the root, `ElkLayered.java:239-283`) |
| 2.4 | the other labels rows that name 7h: `EdgeAndLayerConstraintEdgeReverser.ts:273 if[0]`, `:308 if[0]`; `LabelManagementProcessor.ts:56 if[1]`, `:310 if[1]` | U | `EdgeAndLayerConstraintEdgeReverser.java:297,338`; `LabelManagementProcessor.java:84,230` (proofs in "Labels items"; still untaken in run A, so the replay does not change them) |
| 3.1 | `NorthToSouthRoutingStrategy.ts` / `SouthToNorthRoutingStrategy.ts` `:54 if[1]` (the self-loop arm) | S | Sc14 |
| 3.2 | the same strategies' `:38`, `:58`, `:78` | open | stop-8 (6 arms): see Open |
| 3.3 | `SelfLoopPreProcessor.java:55` (layerless non-`NORMAL` nodes of a nested graph; TS `SelfLoopHolder.ts:70 if[0]`) | reached | row `scenarios/ElkLayered/inside-self-loop/RIGHT`: 3 hits |
| 3.4 | `SelfLoopPreProcessor.java:90,100` (`nestedGraph != null` and its `EXTERNAL_PORTS` test; TS `SelfLoopPreProcessor.ts:77 binary-expr[1]`) | reached | row `scenarios/ElkLayered/compound-self-loop-ports/RIGHT`: 1 hit (also `full/issues/ticket-552_hierarchySelfLoopPorts/default`) |
| 4.1 | the 89 branches and 36 functions of `plans/layered-crossing-min/unreached.md:29,108`: those taken by the replay (56 arms, 32 functions) | reached | `LayerSweepCrossingMinimizerHierarchical.ts` both functions (30 and 28 calls), `LayerSweepTypeDecider.useBottomUp` (4 calls) on `full/hierarchy-aware/deep3/sweepiness-0.1`; `GreedyPortDistributor` (3 `distributePortsInLayer` calls) and `SwitchDecider` (`:78 binary-expr[0,1]` 2 hits) on `full/hierarchy-aware/deep3/greedy-hierarchical-two-sided` |
| 4.1a | 4.1, 33 arms and 4 functions the replay leaves | J 24 arms and 4 functions; S 2 arms (`LayerSweepCrossingMinimizerCounting.ts:161 if[0,1]`: Sc10, Sc11); U 7 arms (`BarycenterHeuristic.ts:419`, `GreedyPortDistributor.ts:62 cond-expr[0]`, `:123 if[1]`, `SweepCopy.ts:53 if[0]`, `:125 if[1]`, `PortSideProcessor.ts:70 if[0]`, `LayerSweepCrossingMinimizerHierarchical.ts:64 if[0]`) | table "Crossing minimisation"; the suites are named per arm |
| 4.2 | the 61 arms and 3 functions of `plans/layered-crossing-min-tests/coverage.md:74`, re-measured 59 + 3 before this mission; the replay reaches 2 arms, 57 arms and 3 functions remain | S 1 (`:161 if[1]`, Sc11, shared with 4.1a), E 1 (`SortByInputModelProcessor.ts:159 if[0]`, reached by an earlier mission's site row), U 42 arms and 3 functions, open 13 arms | tables "Crossing minimisation" (list B). J 0: none of the 92 ported suites reaches one of the 57 arms |
| 4.3 | the kept recursion of `countCurrentNumberOfCrossings` (C7) | keep | see "C7 re-evaluation" |

Verdict counts over the 17 rows: reached 7 (1.1, 1.2, 1.3, 1.4, 3.3, 3.4, 4.1), S 4 (1.3b, 2.2, 2.3, 3.1), U 2 (2.1, 2.4), open 1 (3.2), mixed 2 (4.1a: J 24 arms and 4 functions, S 2, U 7; 4.2: S 1, E 1, U 42 arms and 3 functions, open 13), keep 1 (4.3).
By arm: item 2 names 7 arms, 1 U and 6 S; the routing arms of item 3 are 2 S and 6 open; item 4 over its 86 distinct arms is J 24, S 2, E 1, U 46, open 13, and over its 7 functions J 4, U 3.

## C7 re-evaluation: the kept recursion of `countCurrentNumberOfCrossings`

`LayerSweepCrossingMinimizerCounting.ts:134` keeps the Java's shape (`LayerSweepCrossingMinimizer.java:395-408`): an explicit `Deque` for the graph under `currentGraph` and, inside it, a recursive call for each child graph that is not `dontSweepInto()`.
T9's measurement (journal row, call stack at `AllCrossingsCounter.countAllCrossings`): the deepest recorded hierarchy has 4 levels (the root and 3 nested; 81 rows, e.g. `full/include-children/edge_label_placement-hierarchy01/default` and `ticket-701_portLabels`); of the 516 rows 15 are flat, 334 have 2 levels and 86 have 3.
`countCurrentNumberOfCrossings` is entered by every row (516) to depth 1, by 114 rows to depth 2 and by 58 rows to depth 3 (the outer call plus 2 self-calls); why the 4th level adds no frame was not established. Its recursion arm (`:134` loop, `!child.dontSweepInto()`) is taken on every
hierarchical row and its twin in the model-order counter (`:161`) only by Sc10 and Sc11. The recursion depth is bounded by the nesting depth of the input, not by its size, and the recorded corpus nests at most 4 levels, so the stack-safety argument of C7/F11 (a traversal whose depth grows with the input size) does not arise from recorded input.
**Verdict: keep the recursion as ported and journal it; no explicit-stack rewrite.** What would reverse it: a layered input nested more than a few thousand levels, which no corpus holds; the 5,000-node twin of T9 remains the stack proof for the flat sweep.

## Oracle throws

The T1 recorder met 8 throws it did not record. Each was run in TypeScript on the same input (a probe through `runRow`, direction/routing as the variant names; the `default` of ticket 425 drops the two root options):

| Input | Oracle | TypeScript today | Reading |
| ----- | ------ | ---------------- | ------- |
| `full/hierarchy-aware/deep3/child-strategy-median` (`c2` on `MEDIAN_LAYER_SWEEP` under a `LAYER_SWEEP` root) | `UnsupportedGraphException`, `ElkLayered.java:344` | `UnsupportedGraphException`, same class and message ("The hierarchy aware processor MEDIAN_LAYER_SWEEP in child node G-unlayered[...] is only allowed if the root node specifies the same hierarchical processor") at `ElkLayeredHierarchy.ts:49` | matches: Sc9 decides `ElkLayeredHierarchy.ts:49 if[0]`; the carrier of an expected exception is the orchestrator's call |
| tickets 040, 160, 701 x `DOWN-SPLINES`, `UP-SPLINES` (6 inputs) | NPE, `SplineSegment.java:247` (`anchorY` unboxes `SPLINE_NS_PORT_Y_COORD`) | `TypeError: Cannot unbox the spline north/south y coordinate of a port without one`, thrown at `SplineSegment.anchorY` (`SplineSegment.ts:294`) on all 6 | matches at the corresponding site: not an S scenario that must match (an unrecordable throw); a candidate for a Java-structure test that pins the throw |
| `ticket-425_selfLoopInCompoundNode/default` | NPE, `ElkGraphImporter.java:1146` (`graphProperties.add(GraphProperties.SELF_LOOPS)`: `graphProperties` is `null`) | **completes without a throw** (the layout is produced) | **diverges**: the TS does not throw where the Java does; mechanism undiagnosed (see Open problems); the same input with `elk.direction=RIGHT` and `edgeRouting=ORTHOGONAL` is a recorded row that matches |
| (new) a compound node with `portConstraints=FIXED_RATIO` and a hierarchical port, `elk.direction=RIGHT` (probe `ns-r-*`) | not run on the oracle; `LGraphUtil.createExternalPortDummy` reads `portNodeSize.x` of the `null` the preprocessor passes (T6's journal row: `CompoundGraphPreprocessor.java:182-185`, `:637-646`) | `TypeError: Cannot read properties of null (reading 'x')` | probably a matched NPE; a recorder run on the oracle settles it (candidate: record the throw) |

## Open

Stop-8 candidates, each with what was tried (the earlier missions' attempts are cited, not repeated):

1. `NorthToSouthRoutingStrategy.ts` and `SouthToNorthRoutingStrategy.ts` `:38 if[0]`, `:58 if[1]`, `:78 if[0]` (6 arms, Java `:47`, `:62`, `:72`). Tried: 22 random chain graphs with 3-5 `NORTH`/`SOUTH` ports at reversed fixed positions, a scan of 22 port positions under `FIXED_POS` and 17 under `FIXED_RATIO`, single-child straight-edge designs; the strategies' `calculateBendPoints` ran only on `FIXED_SIDE` graphs, and none produced a dummy segment or a straight edge. The designs are not proven impossible: a dummy segment needs a critical conflict (`OrthogonalRoutingGenerator.java:176,408,452-464`) between two segments, and a straight edge needs the evenly spread dummy x to equal a source port x within `1e-3`.
2. `ModelOrderNodeComparatorHelperDummies.ts` :120 if[1], :172 if[0], binary-expr[1], :175 if[1], :178 if[0,1], binary-expr[0,1] (8 arms), `ModelOrderPortComparatorIncoming.ts:157 if[1]`, `ModelOrderPortComparatorOutgoing.ts:107 if[1]`, `AbstractBarycenterPortDistributor.ts:272 if[1]`, `ModelOrderBarycenterHeuristic.ts:77`, `:179`, `:184`, `:189`, `:194` if[0] (5 arms), `ForsterConstraintResolver.ts:314 if[0]`, `ForsterConstraintResolverConstraintGroup.ts:113 if[0]`, `ModelOrderPortComparator.ts:148 if[1]`: 7c's attempts (120 random inverted-port graphs and about 15,000 class scans, 720 seed-by-constraint variants, 300 random force graphs, 180,000 association updates) stand; the nested graphs of 7h add no shape to these flat comparator paths and no scenario of this task reaches one. 19 arms (13 from list B).
3. `CrossHierarchyEdge.ts:37 toString` (1 function): see the 7h class table; the Java prints it through the root graph's `CROSS_HIERARCHY_MAP` in the debug JSON, the TS logged run did not call it.

Open total: 26 items (6 + 19 + 1).

## Open problems for the orchestrator

- `ticket-425_selfLoopInCompoundNode/default`: Java NPE at `ElkGraphImporter.java:1146`, TS completes. Next instrument: run the recorder's `--dump` aid on the oracle for this input and read the `lgraph` of the failing edge (the edge `E1` of `Container_1`, a self loop inside a nested graph); then trace the TS import of the same edge (`ElkGraphImporterEdges.ts`) to see which `GRAPH_PROPERTIES` it reads.
- The logged compound run: check that the TS prints the root graph's `crossHierarchyMap` the way Java does (`HashMultimap.toString`); until then Sc15 may fail at record time on that line.

## Orchestrator check (after T13)

- `ticket-425_selfLoopInCompoundNode/default` does **not** diverge. The probe above ran the recorder's inline export of the model, which completes on both sides (the oracle recorded the `RIGHT-ORTHOGONAL` row from it). The row the recorder could not record loads the `.elkt` itself, and there TypeScript throws too: the compound sweep (T13) runs `tickets/layered/425_selfLoopInCompoundNode.elkt` in 5 variants, and in each the oracle throws `NullPointerException` (`ElkGraphImporter.java:1146`) and TypeScript throws `TypeError: Cannot read properties of null (reading 'getProperty')` at the same import step. The "diverges" reading of the table row and the first open problem are withdrawn.
- The open items (26) go to T14 where a scenario can settle them (`CrossHierarchyEdge.toString` through Sc15) and otherwise to a `needs-ruling` issue (stop 8), journaled with its number.
