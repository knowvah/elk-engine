<!-- SPDX-License-Identifier: EPL-2.0 -->

# Suite allocation — layered-pipeline, mission 7f (T1, F8)

Written by T1 from `LayeredPipelineVectors.java --plan-dump` over the suites' `@GraphResourceProvider` inputs and `@Configurator`s (resource
suites: `tests/layered/**`, `tickets/layered/**`, `realworld/ptolemy/**`, `tests/core/**` of `$ELK_MODELS_DIR`) and from reading the Java for hand-built
graphs ("from Java"). Rule: a suite whose graphs use only ported arms (`SEVEN_B`..`SEVEN_F`, P1-P5) belongs here; otherwise it belongs to the
LATEST mission among its refused members (7f2 labels and comments < 7g self loops, wrapping, compaction < 7h nested graphs) and the deciding plan
member is the first refused member of that mission in plan order. "Vendored scope" = the suite runs here over the vendored inputs (F7); the
corpus-wide run needs the later mission named. Oracle runs are `java-baseline.md`'s; S1 runs are oracle-run through a scratch copy of `java-tests.sh` with the two test bundles added (the landed script is never edited): 1, 2, 24, 4, all `failures=0`.

| Suite | Oracle runs | Graphs source | Owning mission | Deciding plan member | Target task |
| --- | ---: | --- | --- | --- | --- |
| `OverallLayoutTest` | 4 | hand-built simple graph, `LayeredLayoutProvider.layout` (from Java) | 7f | - (all arms ported) | T12c |
| `compaction.CompactionTest` | 16 | hand-built `OneDimensionalCompactor` graphs, no layout (from Java) | 7g | HORIZONTAL_COMPACTOR (compaction package) | 7g brief |
| `compaction.recthull.RectlinearConvexHullTest` | 2 | hand-built point sets, no layout (from Java) | 7g | HORIZONTAL_COMPACTOR (compaction/recthull) | 7g brief |
| `components.ComponentGroupTest` | 2 | hand-built `ComponentGroup` unit test, no layout (from Java) | 7f | - (class ported here) | T16a |
| `intermediate.AllowNonFlowPortsToSwitchSidesTest` | 6 | hand-built graphs with N/S ports, provider layout (from Java) | 7f | - (all arms ported) | T12a |
| `intermediate.AlternatingLayerUnzipperTest` | 12 | hand-built, `LAYER_UNZIPPING_STRATEGY=ALTERNATING` (from Java) | 7f2 | ALTERNATING_LAYER_UNZIPPER | 7f2 brief |
| `intermediate.CommentPostprocessorTest` | 3 | tests/layered/comment_boxes/** (3 files) | 7f2 | COMMENT_PREPROCESSOR | 7f2 brief |
| `intermediate.ConcreteSortByInputModelTest` | 32 | hand-built, provider layout, model order, no labels (from Java) | 7f | - (all arms ported) | T12a |
| `intermediate.EndLabelSorterTest` | 4 | tests/layered/labels_ordering/** (4 files) | 7f2 | END_LABEL_PREPROCESSOR | 7f2 brief |
| `intermediate.InLayerConstraintProcessorTest` | 550 | realworld/ptolemy `*.elkg` (twin `.json` read), `@Configurator` random in-layer constraints; vendored scope = the 13 vendored ptolemy models minus those with self loops (sinewaveoptimization N1); full corpus needs 7g for 66 of 550 models (SELF_LOOP_PREPROCESSOR) | 7f | - (vendored scope) | T12c |
| `intermediate.LabelAndNodeSizeProcessorOffsetTest` | 1 | `@GraphProvider` hand-built node with N/S/E/W ports (from Java) | 7f | - (all arms ported) | T12c |
| `intermediate.LabelDummyRemoverTest` | 550 | realworld/ptolemy `*.elkg` | 7f2 | LABEL_DUMMY_REMOVER (the tested class; not in any ptolemy plan) | 7f2 brief |
| `intermediate.LabelSideSelectorTest` | 551 | realworld/ptolemy `*.elkg` + 1 more, `@Configurator` edge label placement | 7f2 | LABEL_SIDE_SELECTOR | 7f2 brief |
| `intermediate.LongEdgeJoinerTest` | 550 | realworld/ptolemy `*.elkg`; vendored scope as InLayerConstraintProcessorTest | 7f | - (vendored scope) | T12c |
| `intermediate.NodeMarginCalculatorTest` | 2200 | realworld/ptolemy `*.elkg` x 4 `@TestAfterProcessor` hooks; vendored scope: only the InnermostNodeMarginCalculator hook fires (CommentNodeMarginCalculator, EndLabelPreprocessor, SelfLoopRouter are in no vendored plan); full corpus needs 7g (SELF_LOOP_ROUTER) | 7f | - (vendored scope) | T12c |
| `intermediate.NorthSouthPortPostprocessorTest` | 7 | tests/layered/north_south_ports/** (7 files, plan dump: no refused member) | 7f | - (all arms ported) | T12c |
| `intermediate.PartitionTest` | 5 | tests/layered/partitioning/** (4) + tickets/layered/656; `partitioning-withEdgeLabels` has LABEL_DUMMY_INSERTER, so the whole suite moves (FX1) | 7f2 | LABEL_DUMMY_INSERTER | 7f2 brief |
| `intermediate.SelfLoopPreprocessorTest` | 5 | hand-built self-loop graphs (from Java) | 7g | SELF_LOOP_PREPROCESSOR | 7g brief |
| `intermediate.loops.SelfLoopHolderTest` | 3 | hand-built (from Java) | 7g | SELF_LOOP_PREPROCESSOR (loops package) | 7g brief |
| `intermediate.loops.routing.PolylineSelfLoopRouterTest` | 2 | hand-built (from Java) | 7g | SELF_LOOP_ROUTER | 7g brief |
| `intermediate.loops.routing.RoutingDirectorTest` | 1 | hand-built (from Java) | 7g | SELF_LOOP_ROUTER | 7g brief |
| `issues.Issue143And318Test` | 2 | tickets/layered/143_*, 318_* (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue316Test` | 4 | tickets/layered/316_* (2 files x 2 configurations), `INCLUDE_CHILDREN` | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor), HIERARCHICAL_NODE_RESIZER | 7h brief |
| `issues.Issue405Test` | 3 | tickets/layered/405_* NSWEInside, NSWEOutsideNextToPort, TwoWestOutside (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue405_2Test` | 2 | tickets/layered/405_* NSWEOutside, TwoWestOutsideNextToPort (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue433Test` | 1 | tickets/layered/433_graphSizeWithSelfLoopLabel | 7g | SELF_LOOP_PREPROCESSOR (also LABEL_DUMMY_INSERTER, 7f2) | 7g brief |
| `issues.Issue444Test` | 1 | tickets/layered/444_selfLoopsNPE | 7g | SELF_LOOP_PREPROCESSOR | 7g brief |
| `issues.Issue445Test` | 2 | tickets/layered/445_feedbackEdgeTailLabel, `@Configurator` | 7f2 | END_LABEL_PREPROCESSOR | 7f2 brief |
| `issues.Issue447Test` | 1 | tickets/layered/447_hierarchicalPortAnchors, `@Configurator` port size 10, anchor (5, 5) (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue455Test` | 2 | tickets/layered/455_long/short HierarchicalEdges (one with INCLUDE_CHILDREN) | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor) | 7h brief |
| `issues.Issue463Test` | 1 | tickets/layered/463_aioobe_with_self_loops | 7g | SELF_LOOP_PREPROCESSOR | 7g brief |
| `issues.Issue471Test` | 1 | tickets/layered/471_verticalInlineLabelAlignment | 7f2 | LABEL_DUMMY_INSERTER | 7f2 brief |
| `issues.Issue476Test` | 2 | tickets/layered/476_multiLabelIn{Horizontal,Vertical}Layout (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue502Test` | 1 | tickets/layered/502_collapsingCompoundNode (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue515Test` | 3 | tickets/layered/515_* (3 files, plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue541Test` | 2 | tickets/layered/541_* (2 files) | 7f2 | END_LABEL_PREPROCESSOR | 7f2 brief |
| `issues.Issue546Test` | 1 | tickets/layered/546_borderGaps (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue548Test` | 1 | tickets/layered/548_NPEWithInsideSelfLoops (inside self loops: plan dump clean, no SELF_LOOP member) | 7f | - (all arms ported) | T12b |
| `issues.Issue552Test` | 1 | tickets/layered/552_hierarchySelfLoopPorts | 7h | INCLUDE_CHILDREN (also SELF_LOOP_PREPROCESSOR, 7g) | 7h brief |
| `issues.Issue562Test` | 1 | hand-built node with two ports, inside self loop (from Java; replica plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue587Test` | 3 | tickets/layered/587_polylineSplinesNPE x 3 `@Configurator` edge routers (plan dump clean) | 7f | - (all arms ported) | T12b (landed; full rows only) |
| `issues.Issue596Test` | 1 | tickets/layered/596_outsideHierarchicalPortLabels, `INCLUDE_CHILDREN` | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor) | 7h brief |
| `issues.Issue603Test` | 1 | tickets/layered/603_labelOverlaps, `@Configurator` node label placement (plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue628Test` | 4 | tickets/layered/628_hierarchyAwareLayoutProcessor x 4 `@Configurator` | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor) | 7h brief |
| `issues.Issue665Test` | 1 | tickets/layered/665_includeChildrenDoesntStop | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor) | 7h brief |
| `issues.Issue680Test` | 1 | hand-built graph > parent > child, DOWN, ports with border offsets (from Java; replica plan dump clean) | 7f | - (all arms ported) | T12b |
| `issues.Issue682Test` | 4 | hand-built, node labels inside top center, 4 directions (from Java) | 7f | - (all arms ported) | T12b |
| `issues.Issue700Test` | 4 | tickets/layered/665_*, 700_brokenHierarchyHandling, ... | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor) | 7h brief |
| `issues.Issue701Test` | 6 | tickets/layered/701_portLabels, `INCLUDE_CHILDREN` | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor) | 7h brief |
| `issues.Issue734Test` | 3 | tickets/layered/734_nodeEdgeSpacing{Flat,FlatMoreComplex,Hierarchical}; the hierarchical one needs INCLUDE_CHILDREN | 7h | INCLUDE_CHILDREN (CompoundGraphPreprocessor) | 7h brief |
| `issues.Issue870Test` | 1 | tickets/layered/870_networkSimplexNodePlacer | 7g | SELF_LOOP_PREPROCESSOR | 7g brief |
| `issues.Issue871Test` | 3 | hand-built, feedback edges, model order; `testNoFeedbackEdgesStillWorking` creates edge labels (correction, T12a) | 7f2 | LABEL_DUMMY_INSERTER | 7f2 brief |
| `issues.Issue905Test` | 2 | tickets/layered/905_* (2 files, edge labels) | 7f2 | LABEL_DUMMY_INSERTER | 7f2 brief |
| `p2layers.ModelOrderLayerAssignmentTest` | 7 | hand-built, node labels only (from Java) | 7f | - (all arms ported) | T12a |
| `nodespacing.InsidePortLabelTest (S1)` | 1 | tests/core/node_size/inside_port_labels.elkt (plan dump clean) | 7f | - (all arms ported) | T12c |
| `nodespacing.NextToPortLabelPlacementTest (S1)` | 2 | tests/core/label_placement/port_labels/next_to_port_if_possible_{inside,outside}.elkt (plan dump clean) | 7f | - (all arms ported) | T12c |
| `nodespacing.PortLabelPlacementVariantsTest (S1)` | 24 | tests/core/label_placement/port_labels/variants.elkt (plan dump clean), 2 active `@ConfiguratorProvider` (WEST, EAST) | 7f | - (all arms ported) | T12c |
| `core.RecursiveGraphLayoutEngineTest (S1)` | 4 | hand-built, `testEmptyAlgorithmId` and 3 more (from Java) | 7f | - (all arms ported) | T12c |

## Tally

| Mission | Suites |
| --- | ---: |
| 7f | 28 |
| 7f2 | 11 |
| 7g | 10 |
| 7h | 9 |
| total | 58 |

Planned in this brief (T12a-c: 5 + 30 issue suites + 6 + 4 S1 = 45 suites): 19 leave (6 to 7f2, 4 to 7g, 9 to 7h), 42 %, after FX1 and T12a's `Issue871Test` correction. Stop 21 was raised at 17 and decided by the user (FX1): strict F8, no partial scope; a suite with any later-mission input moves whole, and F7's corpus-wide suites keep their vendored scope.

Plan dump over the whole corpus (550 ptolemy models, 282 `tests/layered` + `tickets/layered` files): 484 ptolemy models and 158 of the 282 layered files have no refused member.
