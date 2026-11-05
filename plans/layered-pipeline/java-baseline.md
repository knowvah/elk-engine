<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — unported layered suites (planning, 2026-11-04)

`MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <fqcn…>` on the oracle build, all 54 classes in one run, one JVM per
class, `-XX:hashCode=2`. Prefix `org.eclipse.elk.alg.layered.` omitted. T1 allocates each suite to a mission; the start and
end runs of stop 18 cover the suites allocated to this brief.

| Suite | runs | failures |
| ----- | ---: | -------: |
| `OverallLayoutTest` | 4 | 0 |
| `compaction.CompactionTest` | 16 | 0 |
| `compaction.recthull.RectlinearConvexHullTest` | 2 | 0 |
| `components.ComponentGroupTest` | 2 | 0 |
| `intermediate.AllowNonFlowPortsToSwitchSidesTest` | 6 | 0 |
| `intermediate.AlternatingLayerUnzipperTest` | 12 | 0 |
| `intermediate.CommentPostprocessorTest` | 3 | 0 |
| `intermediate.ConcreteSortByInputModelTest` | 32 | 0 |
| `intermediate.EndLabelSorterTest` | 4 | 0 |
| `intermediate.InLayerConstraintProcessorTest` | 550 | 0 |
| `intermediate.LabelAndNodeSizeProcessorOffsetTest` | 1 | 0 |
| `intermediate.LabelDummyRemoverTest` | 550 | 0 |
| `intermediate.LabelSideSelectorTest` | 551 | 0 |
| `intermediate.LongEdgeJoinerTest` | 550 | 0 |
| `intermediate.NodeMarginCalculatorTest` | 2200 | 0 |
| `intermediate.NorthSouthPortPostprocessorTest` | 7 | 0 |
| `intermediate.PartitionTest` | 5 | 0 |
| `intermediate.SelfLoopPreprocessorTest` | 5 | 0 |
| `intermediate.loops.SelfLoopHolderTest` | 3 | 0 |
| `intermediate.loops.routing.PolylineSelfLoopRouterTest` | 2 | 0 |
| `intermediate.loops.routing.RoutingDirectorTest` | 1 | 0 |
| `issues.Issue143And318Test` | 2 | 0 |
| `issues.Issue316Test` | 4 | 0 |
| `issues.Issue405Test` | 3 | 0 |
| `issues.Issue405_2Test` | 2 | 0 |
| `issues.Issue433Test` | 1 | 0 |
| `issues.Issue444Test` | 1 | 0 |
| `issues.Issue445Test` | 1 | 0 |
| `issues.Issue447Test` | 1 | 0 |
| `issues.Issue455Test` | 2 | 0 |
| `issues.Issue463Test` | 1 | 0 |
| `issues.Issue471Test` | 1 | 0 |
| `issues.Issue476Test` | 2 | 0 |
| `issues.Issue502Test` | 1 | 0 |
| `issues.Issue515Test` | 3 | 0 |
| `issues.Issue541Test` | 2 | 0 |
| `issues.Issue546Test` | 1 | 0 |
| `issues.Issue548Test` | 1 | 0 |
| `issues.Issue552Test` | 1 | 0 |
| `issues.Issue562Test` | 1 | 0 |
| `issues.Issue587Test` | 3 | 0 |
| `issues.Issue596Test` | 1 | 0 |
| `issues.Issue603Test` | 1 | 0 |
| `issues.Issue628Test` | 4 | 0 |
| `issues.Issue665Test` | 1 | 0 |
| `issues.Issue680Test` | 1 | 0 |
| `issues.Issue682Test` | 4 | 0 |
| `issues.Issue700Test` | 4 | 0 |
| `issues.Issue701Test` | 6 | 0 |
| `issues.Issue734Test` | 3 | 0 |
| `issues.Issue870Test` | 1 | 0 |
| `issues.Issue871Test` | 3 | 0 |
| `issues.Issue905Test` | 2 | 0 |
| `p2layers.ModelOrderLayerAssignmentTest` | 7 | 0 |
