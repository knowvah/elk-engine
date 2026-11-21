<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline: every ported JUnit class on the pinned oracle (java-tests-bundles, issue #97)

Recorded 2026-11-20 by T1 with the landed `tools/oracle/java-tests.sh` after it gained the thirteen bundles of
[D1](decisions.md#d1-carry-every-cited-test-bundle-in-test_bundles). Oracle: `8bca22f4afa3371562d2f702d59929818f7f7b71`,
patches 0001-0003, `builtAt` 2026-11-18T15:18:16Z, JDK 21.0.1, Darwin arm64. Models: `elk-models` at
`ac5af2ba511c0037e4f347e8bd91f013950951c7`. Load 2.9 at start; 432 s wall under `nice -n 10`.

The commands ([D4](decisions.md#d4-the-class-list-includes-the-xtend-suites-143-at-planning-not-124), run from the
repository root, outputs under `$TMPDIR/java-tests-bundles/`):

```sh
git grep -hoE 'org\.eclipse\.elk\.[a-z.]+test[a-z.]*/src/[A-Za-z0-9_/]+Test\.(java|xtend)' -- src test | sort -u |
  sed -E 's#^[^/]+/src/##; s#\.(java|xtend)$##; s#/#.#g' >"$TMPDIR/ported-classes.txt"
MODELS_REPO="$ELK_MODELS_DIR" nice -n 10 tools/oracle/java-tests.sh $(cat "$TMPDIR/ported-classes.txt") | tee "$TMPDIR/java-tests.txt"
```

Exit 0. **143 classes, 51,577 runs, 0 failures.**

| Test bundle                            | Classes |   Runs | Failures |
| -------------------------------------- | ------: | -----: | -------: |
| `org.eclipse.elk.alg.common.test`      |       7 |     49 |        0 |
| `org.eclipse.elk.alg.disco.test`       |       1 |      3 |        0 |
| `org.eclipse.elk.alg.force.test`       |       1 |      3 |        0 |
| `org.eclipse.elk.alg.layered.test`     |     100 | 51,299 |        0 |
| `org.eclipse.elk.alg.mrtree.test`      |       1 |      6 |        0 |
| `org.eclipse.elk.alg.radial.test`      |       1 |      2 |        0 |
| `org.eclipse.elk.alg.rectpacking.test` |       5 |     23 |        0 |
| `org.eclipse.elk.alg.spore.test`       |       3 |     11 |        0 |
| `org.eclipse.elk.alg.topdown.test`     |       3 |     11 |        0 |
| `org.eclipse.elk.core.test`            |      11 |    127 |        0 |
| `org.eclipse.elk.graph.json.test`      |       9 |     36 |        0 |
| `org.eclipse.elk.graph.test`           |       1 |      7 |        0 |
| Total                                  |     143 | 51,577 |        0 |

`org.eclipse.elk.alg.test` is carried as the test framework; no suite of it is ported.

Checks against the other two runs of [D5](decisions.md#d5-evidence-before-and-after-on-the-pinned-oracle):

- The 100 `org.eclipse.elk.alg.layered.*` lines are byte-identical to the "before" run of the same 100 classes with the
  unedited two-bundle script (51,299 runs, 0 failures, 402 s): the wider classpath changed no count.
- The 43 other lines equal the planning probe's list, class by class (278 runs, 0 failures).

The script's output, in the order of the class list (by source path):

```text
org.eclipse.elk.alg.common.RectilinearConvexHullTest runs=2 failures=0
org.eclipse.elk.alg.common.compaction.oned.OneDimensionalCompactorTest runs=17 failures=0
org.eclipse.elk.alg.common.issues.Issue475Test runs=2 failures=0
org.eclipse.elk.alg.common.networksimplex.NetworkSimplexTest runs=1 failures=0
org.eclipse.elk.alg.common.nodespacing.InsidePortLabelTest runs=1 failures=0
org.eclipse.elk.alg.common.nodespacing.NextToPortLabelPlacementTest runs=2 failures=0
org.eclipse.elk.alg.common.nodespacing.PortLabelPlacementVariantsTest runs=24 failures=0
org.eclipse.elk.alg.disco.test.TwoBitGridTest runs=3 failures=0
org.eclipse.elk.alg.force.test.ForceImportTest runs=3 failures=0
org.eclipse.elk.alg.layered.InteractiveLayeredGraphVisitorTest runs=3 failures=0
org.eclipse.elk.alg.layered.LayeredSpacingTest runs=16 failures=0
org.eclipse.elk.alg.layered.NestedModelOrderConfigurationTest runs=10 failures=0
org.eclipse.elk.alg.layered.OverallLayoutTest runs=4 failures=0
org.eclipse.elk.alg.layered.compaction.CompactionTest runs=16 failures=0
org.eclipse.elk.alg.layered.compaction.recthull.RectlinearConvexHullTest runs=2 failures=0
org.eclipse.elk.alg.layered.components.ComponentGroupTest runs=2 failures=0
org.eclipse.elk.alg.layered.intermediate.AllowNonFlowPortsToSwitchSidesTest runs=6 failures=0
org.eclipse.elk.alg.layered.intermediate.AlternatingLayerUnzipperTest runs=12 failures=0
org.eclipse.elk.alg.layered.intermediate.BasicConsiderModelOrderTest runs=4950 failures=0
org.eclipse.elk.alg.layered.intermediate.CommentPostprocessorTest runs=3 failures=0
org.eclipse.elk.alg.layered.intermediate.ConcreteSortByInputModelTest runs=32 failures=0
org.eclipse.elk.alg.layered.intermediate.EdgeAndLayerConstraintEdgeReverserTest runs=184 failures=0
org.eclipse.elk.alg.layered.intermediate.EndLabelSorterTest runs=4 failures=0
org.eclipse.elk.alg.layered.intermediate.InLayerConstraintProcessorTest runs=550 failures=0
org.eclipse.elk.alg.layered.intermediate.InvertedPortProcessorTest runs=550 failures=0
org.eclipse.elk.alg.layered.intermediate.LabelAndNodeSizeProcessorOffsetTest runs=1 failures=0
org.eclipse.elk.alg.layered.intermediate.LabelDummyRemoverTest runs=550 failures=0
org.eclipse.elk.alg.layered.intermediate.LabelSideSelectorTest runs=551 failures=0
org.eclipse.elk.alg.layered.intermediate.LayerConstraintProcessorTest runs=12 failures=0
org.eclipse.elk.alg.layered.intermediate.LayerSizeAndGraphHeigthCalculatorTest runs=550 failures=0
org.eclipse.elk.alg.layered.intermediate.LongEdgeJoinerTest runs=550 failures=0
org.eclipse.elk.alg.layered.intermediate.LongEdgeSplitterTest runs=550 failures=0
org.eclipse.elk.alg.layered.intermediate.NodeMarginCalculatorTest runs=2200 failures=0
org.eclipse.elk.alg.layered.intermediate.NodePromotionTest runs=11550 failures=0
org.eclipse.elk.alg.layered.intermediate.NorthSouthPortPostprocessorTest runs=7 failures=0
org.eclipse.elk.alg.layered.intermediate.NorthSouthPortPreprocessorTest runs=7 failures=0
org.eclipse.elk.alg.layered.intermediate.PartitionPostProcessorTest runs=10 failures=0
org.eclipse.elk.alg.layered.intermediate.PartitionTest runs=5 failures=0
org.eclipse.elk.alg.layered.intermediate.PortListSorterTest runs=1100 failures=0
org.eclipse.elk.alg.layered.intermediate.PortSideProcessorTest runs=1100 failures=0
org.eclipse.elk.alg.layered.intermediate.ReversedEdgeRestorerTest runs=550 failures=0
org.eclipse.elk.alg.layered.intermediate.SelfLoopPreprocessorTest runs=5 failures=0
org.eclipse.elk.alg.layered.intermediate.SortByInputModelProcessorTest runs=15 failures=0
org.eclipse.elk.alg.layered.intermediate.greedyswitch.BetweenLayerEdgeTwoNodeCrossingsCounterTest runs=15 failures=0
org.eclipse.elk.alg.layered.intermediate.greedyswitch.GreedySwitchProcessorTest runs=26 failures=0
org.eclipse.elk.alg.layered.intermediate.greedyswitch.InLayerEdgeTwoNodeCrossingCounterTest runs=21 failures=0
org.eclipse.elk.alg.layered.intermediate.greedyswitch.NorthSouthEdgeNeighbouringNodeCrossingsCounterTest runs=26 failures=0
org.eclipse.elk.alg.layered.intermediate.greedyswitch.SwitchDeciderTest runs=38 failures=0
org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopHolderTest runs=3 failures=0
org.eclipse.elk.alg.layered.intermediate.loops.ordering.PortRestorerTest runs=2 failures=0
org.eclipse.elk.alg.layered.intermediate.loops.routing.LabelPlacerTest runs=3 failures=0
org.eclipse.elk.alg.layered.intermediate.loops.routing.PolylineSelfLoopRouterTest runs=2 failures=0
org.eclipse.elk.alg.layered.intermediate.loops.routing.RoutingDirectorTest runs=1 failures=0
org.eclipse.elk.alg.layered.intermediate.wrapping.GraphStatsTest runs=7 failures=0
org.eclipse.elk.alg.layered.issues.Issue1232Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue143And318Test runs=2 failures=0
org.eclipse.elk.alg.layered.issues.Issue316Test runs=4 failures=0
org.eclipse.elk.alg.layered.issues.Issue405Test runs=3 failures=0
org.eclipse.elk.alg.layered.issues.Issue405_2Test runs=2 failures=0
org.eclipse.elk.alg.layered.issues.Issue433Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue444Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue445Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue447Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue455Test runs=2 failures=0
org.eclipse.elk.alg.layered.issues.Issue463Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue471Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue476Test runs=2 failures=0
org.eclipse.elk.alg.layered.issues.Issue502Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue515Test runs=3 failures=0
org.eclipse.elk.alg.layered.issues.Issue541Test runs=2 failures=0
org.eclipse.elk.alg.layered.issues.Issue546Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue548Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue552Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue562Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue587Test runs=3 failures=0
org.eclipse.elk.alg.layered.issues.Issue596Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue603Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue628Test runs=4 failures=0
org.eclipse.elk.alg.layered.issues.Issue665Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue680Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue682Test runs=4 failures=0
org.eclipse.elk.alg.layered.issues.Issue700Test runs=4 failures=0
org.eclipse.elk.alg.layered.issues.Issue701Test runs=6 failures=0
org.eclipse.elk.alg.layered.issues.Issue726Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue734Test runs=3 failures=0
org.eclipse.elk.alg.layered.issues.Issue870Test runs=1 failures=0
org.eclipse.elk.alg.layered.issues.Issue871Test runs=3 failures=0
org.eclipse.elk.alg.layered.issues.Issue905Test runs=2 failures=0
org.eclipse.elk.alg.layered.p1cycles.BasicCycleBreakerTest runs=3306 failures=0
org.eclipse.elk.alg.layered.p2layers.BasicLayerAssignmentTest runs=11550 failures=0
org.eclipse.elk.alg.layered.p2layers.BasicModelOrderTest runs=1100 failures=0
org.eclipse.elk.alg.layered.p2layers.ModelOrderLayerAssignmentTest runs=7 failures=0
org.eclipse.elk.alg.layered.p2layers.ModelOrderLayeringEdgeDirectionTest runs=5 failures=0
org.eclipse.elk.alg.layered.p3order.AbstractBarycenterPortDistributorTest runs=6 failures=0
org.eclipse.elk.alg.layered.p3order.BarycenterHeuristicTest runs=7 failures=0
org.eclipse.elk.alg.layered.p3order.BasicCrossingMinimizationTest runs=193 failures=0
org.eclipse.elk.alg.layered.p3order.ForsterConstraintResolverTest runs=4 failures=0
org.eclipse.elk.alg.layered.p3order.GreedyPortDistributorTest runs=11 failures=0
org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizerTest runs=74 failures=0
org.eclipse.elk.alg.layered.p3order.LayerSweepHierarchicalTwoSidedGreedySwitchTest runs=6 failures=0
org.eclipse.elk.alg.layered.p3order.LayerSweepTypeDeciderTest runs=3 failures=0
org.eclipse.elk.alg.layered.p3order.ModelOrderBarycenterHeuristicTest runs=550 failures=0
org.eclipse.elk.alg.layered.p3order.counting.AllCrossingsCounterTest runs=14 failures=0
org.eclipse.elk.alg.layered.p3order.counting.BinaryIndexedTreeTest runs=3 failures=0
org.eclipse.elk.alg.layered.p3order.counting.CrossingsCounterTest runs=13 failures=0
org.eclipse.elk.alg.layered.p3order.counting.NorthSouthEdgeAllCrossingsCounterTest runs=20 failures=0
org.eclipse.elk.alg.layered.p4nodes.BasicNodePlacementTest runs=8008 failures=0
org.eclipse.elk.alg.layered.p5edges.BasicEdgeRouterTest runs=550 failures=0
org.eclipse.elk.alg.layered.p5edges.splines.SplineSegmentEdgeOrderTest runs=1 failures=0
org.eclipse.elk.alg.mrtree.test.MrTreeGraphSizeTest runs=6 failures=0
org.eclipse.elk.alg.radial.test.CenterOnRootTest runs=2 failures=0
org.eclipse.elk.alg.rectpacking.CompactionTest runs=11 failures=0
org.eclipse.elk.alg.rectpacking.InteractiveNodeReordererTest runs=3 failures=0
org.eclipse.elk.alg.rectpacking.PaddingTest runs=4 failures=0
org.eclipse.elk.alg.rectpacking.issues.Issue1214Test runs=4 failures=0
org.eclipse.elk.alg.rectpacking.issues.Issue583Test runs=1 failures=0
org.eclipse.elk.alg.spore.test.RandomSeedTest runs=6 failures=0
org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest runs=2 failures=0
org.eclipse.elk.alg.spore.test.UtilsTest runs=3 failures=0
org.eclipse.elk.alg.topdown.layered.test.PortPlacementCalculationTest runs=2 failures=0
org.eclipse.elk.alg.topdown.test.TopdownLayoutTest runs=5 failures=0
org.eclipse.elk.alg.topdown.test.TopdownPackingTest runs=4 failures=0
org.eclipse.elk.core.LayoutConfiguratorTest runs=5 failures=0
org.eclipse.elk.core.RecursiveGraphLayoutEngineTest runs=4 failures=0
org.eclipse.elk.core.alg.AlgorithmAssemblerTest runs=8 failures=0
org.eclipse.elk.core.alg.LayoutProcessorConfigurationTest runs=7 failures=0
org.eclipse.elk.core.alg.SpacingConfigurationTest runs=58 failures=0
org.eclipse.elk.core.data.LayoutDataContentAssistTest runs=15 failures=0
org.eclipse.elk.core.issues.Issue457Test runs=1 failures=0
org.eclipse.elk.core.issues.Issue489Test runs=2 failures=0
org.eclipse.elk.core.math.BezierSplineTest runs=5 failures=0
org.eclipse.elk.core.math.CubicSplineInterpolatorTest runs=1 failures=0
org.eclipse.elk.core.math.ElkMathTest runs=21 failures=0
org.eclipse.elk.graph.json.test.EdgeCoordsTest runs=1 failures=0
org.eclipse.elk.graph.json.test.EdgesTest runs=3 failures=0
org.eclipse.elk.graph.json.test.ExportTest runs=6 failures=0
org.eclipse.elk.graph.json.test.GraphTest runs=5 failures=0
org.eclipse.elk.graph.json.test.IdTest runs=7 failures=0
org.eclipse.elk.graph.json.test.IndividualSpacingsTest runs=3 failures=0
org.eclipse.elk.graph.json.test.LayoutOptionsTest runs=4 failures=0
org.eclipse.elk.graph.json.test.SectionsTest runs=4 failures=0
org.eclipse.elk.graph.json.test.TransferLayoutTest runs=3 failures=0
org.eclipse.elk.graph.util.ElkGraphUtilTest runs=7 failures=0
```
