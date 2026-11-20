<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning inventory: per-file `Factories` objects (issue #46)

Generated at planning (HEAD `f5c2c889`) by grouping every `const <name>: Factories = {` body in `src/` and `test/`
after collapsing whitespace. **T1 re-derives this and owns the final mapping in [inventory.md](inventory.md).**
A group is a consolidation candidate only under D1: identical body, and every identifier in it resolves to the same
import or the same constant value in every file. `dbdd1cd5` and `7e5cf017` are the same dispatch (P1 → cycle
breaking, P2 → layering, anything else → crossing minimization), written as a `switch` and as a ternary; D1 lets
them share one export.

Totals: 176 objects; 25 groups of two or more (120 objects); 56 singletons (kept, D1).

## Groups of two or more

| Group | Objects | Body lines | Sites (`file:line` name) |
| ----- | ------- | ---------- | ------------------------ |
| `dbdd1cd5` | 23 | 11 | `src/alg/layered/p3order/counting/CrossingsCounterNorthSouth.test.ts:18` siteFactories<br>`src/alg/layered/p3order/counting/CrossingsCounter.test.ts:124` siteFactories<br>`src/alg/layered/p3order/counting/AllCrossingsCounter.test.ts:84` siteFactories<br>`src/alg/layered/p3order/counting/HyperedgeCrossingsCounter.test.ts:109` siteFactories<br>`src/alg/layered/p3order/LayerSweepCrossingMinimizer.test.ts:375` siteFactories<br>`src/alg/layered/p3order/BarycenterHeuristic.test.ts:479` siteFactories<br>`src/alg/layered/p3order/BasicCrossingMinimizationTest.test.ts:32` factories<br>`src/alg/layered/p3order/ForsterConstraintResolverTest.test.ts:29` factories<br>`src/alg/layered/p3order/InteractiveCrossingMinimizer.test.ts:369` siteFactories<br>`src/alg/layered/p3order/ModelOrderBarycenterHeuristicTest.test.ts:33` factories<br>`src/alg/layered/p3order/AbstractBarycenterPortDistributor.test.ts:484` siteFactories<br>`src/alg/layered/p3order/LayerTotalPortDistributor.test.ts:18` siteFactories<br>`src/alg/layered/p3order/NodeRelativePortDistributor.test.ts:18` siteFactories<br>`src/alg/layered/p3order/ModelOrderBarycenterHeuristic.test.ts:227` siteFactories<br>`src/alg/layered/p3order/SweepCopy.test.ts:138` siteFactories<br>`src/alg/layered/p3order/MedianHeuristic.test.ts:222` siteFactories<br>`src/alg/layered/intermediate/PortSideProcessorTest.test.ts:28` factories<br>`src/alg/layered/intermediate/PortListSorterTest.test.ts:42` factories<br>`src/alg/layered/intermediate/NorthSouthPortPreprocessorTest.test.ts:29` factories<br>`src/alg/layered/intermediate/BasicConsiderModelOrderTest.test.ts:75` factories<br>`src/alg/layered/intermediate/InvertedPortProcessorTest.test.ts:28` factories<br>`src/alg/layered/intermediate/SortByInputModelProcessorTest.test.ts:43` factories<br>`src/alg/layered/intermediate/LongEdgeSplitterTest.test.ts:25` factories |
| `7e5cf017` | 10 | 7 | `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorPreviousLayer.test.ts:23` siteFactories<br>`src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorAssociations.test.ts:23` siteFactories<br>`src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorHelperDummies.test.ts:23` siteFactories<br>`src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorOutgoing.test.ts:23` siteFactories<br>`src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorIncoming.test.ts:23` siteFactories<br>`src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparator.test.ts:33` siteFactories<br>`src/alg/layered/intermediate/preserveorder/ModelOrderPortComparator.test.ts:32` siteFactories<br>`src/alg/layered/intermediate/greedyswitch/NorthSouthEdgeNeighbouringNodeCrossingsCounter.test.ts:33` siteFactories<br>`src/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.test.ts:32` siteFactories<br>`src/alg/layered/intermediate/greedyswitch/SwitchDecider.test.ts:40` siteFactories |
| `fdf72abd` | 8 | 16 | `src/alg/layered/DotDebugUtilSites.test.ts:25` factories<br>`src/alg/layered/InteractiveLayeredGraphVisitorArms.test.ts:148` factories<br>`src/alg/layered/JsonDebugUtilSites.test.ts:27` factories<br>`src/alg/layered/InteractiveLayeredGraphVisitor.test.ts:38` factories<br>`src/alg/layered/intermediate/CommentPreprocessorSites.test.ts:26` factories<br>`src/alg/layered/intermediate/CommentPostprocessorSites.test.ts:25` factories<br>`src/alg/layered/intermediate/unzipping/AlternatingLayerUnzipperSites.test.ts:24` factories<br>`src/alg/layered/InteractiveLayeredGraphVisitorSites.test.ts:256` factories |
| `d8ceccce` | 8 | 5 | `src/alg/layered/p1cycles/BasicCycleBreakerTest.test.ts:31` factories<br>`src/alg/layered/p2layers/BasicLayerAssignmentTest.test.ts:18` factories<br>`src/alg/layered/p2layers/BasicModelOrderTest.test.ts:18` factories<br>`src/alg/layered/intermediate/LayerConstraintProcessorTest.test.ts:23` factories<br>`src/alg/layered/intermediate/ReversedEdgeRestorerTest.test.ts:22` factories<br>`src/alg/layered/intermediate/PartitionPostProcessorTest.test.ts:23` factories<br>`src/alg/layered/intermediate/NodePromotionTest.test.ts:29` factories<br>`src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverserTest.test.ts:23` factories |
| `54baac7b` | 7 | 5 | `src/alg/layered/intermediate/InvertedPortProcessor.test.ts:120` SITE_FACTORIES<br>`src/alg/layered/intermediate/LongEdgeSplitter.test.ts:126` SITE_FACTORIES<br>`src/alg/layered/intermediate/NorthSouthPortPreprocessor.test.ts:182` SITE_FACTORIES<br>`src/alg/layered/intermediate/SemiInteractiveCrossMinProcessor.test.ts:130` SITE_FACTORIES<br>`src/alg/layered/intermediate/PortSideProcessor.test.ts:128` SITE_FACTORIES<br>`src/alg/layered/intermediate/HierarchicalPortConstraintProcessor.test.ts:135` SITE_FACTORIES<br>`src/alg/layered/intermediate/PortListSorter.test.ts:148` SITE_FACTORIES |
| `34aa9fa0` | 6 | 15 | `src/alg/layered/p5edges/BasicEdgeRouterTest.test.ts:41` factories<br>`src/alg/layered/intermediate/LabelDummySwitcherSites.test.ts:24` factories<br>`src/alg/layered/intermediate/LabelDummyInserterSites.test.ts:25` factories<br>`src/alg/layered/intermediate/LabelManagementProcessorSites.test.ts:25` factories<br>`src/alg/layered/intermediate/LayerSizeAndGraphHeigthCalculatorTest.test.ts:36` factories<br>`src/alg/layered/issues/Issue726Test.test.ts:34` factories |
| `a1b507d8` | 5 | 20 | `src/alg/layered/intermediate/HyperedgeDummyMerger.test.ts:45` factories<br>`src/alg/layered/intermediate/NorthSouthPortPostprocessor.test.ts:46` factories<br>`src/alg/layered/intermediate/HierarchicalPortPositionProcessor.test.ts:38` factories<br>`src/alg/layered/intermediate/LayerSizeAndGraphHeightCalculator.test.ts:38` factories<br>`src/alg/layered/intermediate/LongEdgeJoiner.test.ts:46` factories |
| `62bee9f6` | 5 | 28 | `src/alg/layered/intermediate/InnermostNodeMarginCalculator.test.ts:101` factories<br>`src/alg/layered/intermediate/InLayerConstraintProcessor.test.ts:100` factories<br>`src/alg/layered/intermediate/HierarchicalPortDummySizeProcessor.test.ts:42` factories<br>`src/alg/layered/intermediate/LabelAndNodeSizeProcessor.test.ts:109` factories<br>`src/alg/layered/intermediate/NodePlacementRepeater.test.ts:57` factories |
| `dee0be9a` | 5 | 16 | `src/alg/layered/intermediate/CommentPreprocessor.test.ts:36` factories<br>`src/alg/layered/intermediate/CommentNodeMarginCalculator.test.ts:36` factories<br>`src/alg/layered/intermediate/LabelSideSelector.test.ts:62` factories<br>`src/alg/layered/intermediate/LabelManagementProcessor.test.ts:55` factories<br>`src/alg/layered/intermediate/CommentPostprocessor.test.ts:36` factories |
| `f40c2912` | 4 | 17 | `src/alg/layered/LayeredRoutingVectors.test.ts:67` factories<br>`src/alg/layered/LayeredPipelineVectors.test.ts:58` factories<br>`src/alg/layered/LayeredLabelsVectors.test.ts:72` factories<br>`test/corpus/routing-sweep.test.ts:61` factories |
| `bcf91161` | 4 | 32 | `src/alg/layered/p3order/LayerSweepCrossingMinimizer.test.ts:145` factories<br>`src/alg/layered/p3order/InteractiveCrossingMinimizer.test.ts:58` factories<br>`src/alg/layered/p3order/NoCrossingMinimizer.test.ts:42` factories<br>`src/alg/layered/intermediate/greedyswitch/GreedySwitchHeuristic.test.ts:59` factories |
| `301abb6a` | 4 | 22 | `src/alg/layered/intermediate/InvertedPortProcessor.test.ts:63` factories<br>`src/alg/layered/intermediate/LongEdgeSplitter.test.ts:69` factories<br>`src/alg/layered/intermediate/PortSideProcessor.test.ts:71` factories<br>`src/alg/layered/intermediate/PortListSorter.test.ts:77` factories |
| `64ce4644` | 4 | 26 | `src/alg/layered/intermediate/SortByInputModelProcessor.test.ts:76` factories<br>`src/alg/layered/intermediate/NorthSouthPortPreprocessor.test.ts:60` factories<br>`src/alg/layered/intermediate/SemiInteractiveCrossMinProcessor.test.ts:72` factories<br>`src/alg/layered/intermediate/HierarchicalPortConstraintProcessor.test.ts:52` factories |
| `e64a9807` | 3 | 18 | `src/alg/layered/p3order/BarycenterHeuristic.test.ts:49` factories<br>`src/alg/layered/p3order/AbstractBarycenterPortDistributor.test.ts:40` factories<br>`src/alg/layered/p3order/MedianHeuristic.test.ts:35` factories |
| `6f92a0f5` | 3 | 24 | `src/alg/layered/intermediate/HypernodesProcessor.test.ts:41` factories<br>`src/alg/layered/intermediate/ConstraintsPostprocessor.test.ts:45` factories<br>`src/alg/layered/intermediate/EndLabelSorter.test.ts:41` factories |
| `742591f7` | 3 | 16 | `src/alg/layered/intermediate/GraphTransformer.sites.test.ts:193` factories<br>`src/alg/layered/intermediate/HypernodesProcessor.sites.test.ts:116` factories<br>`src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter.sites.test.ts:143` factories |
| `658bad7a` | 2 | 26 | `src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts:116` factories<br>`src/alg/layered/p4nodes/LinearSegmentsNodePlacer.sites.test.ts:34` factories |
| `1e022de0` | 2 | 17 | `src/alg/layered/components/ComponentsAnchored.test.ts:45` factories<br>`src/alg/layered/ElkLayeredAnchored.test.ts:37` factories |
| `6aadd7d8` | 2 | 4 | `src/alg/layered/p5edges/splines/NubSpline.test.ts:41` factories<br>`src/alg/layered/p5edges/splines/NubSpline.sites.test.ts:28` factories |
| `378b9fff` | 2 | 4 | `src/alg/layered/p5edges/splines/Rectangle.test.ts:25` factories<br>`src/alg/layered/p5edges/splines/Rectangle.sites.test.ts:25` factories |
| `47816ebe` | 2 | 4 | `src/alg/layered/p5edges/splines/NubsSelfLoop.sites.test.ts:26` factories<br>`src/alg/layered/p5edges/splines/NubsSelfLoop.test.ts:31` factories |
| `77b17ac0` | 2 | 15 | `src/alg/layered/LayeredPlacementVectors.test.ts:33` factories<br>`test/corpus/placement-sweep.test.ts:54` factories |
| `35c4b805` | 2 | 3 | `src/alg/layered/intermediate/HypernodesProcessor.test.ts:101` idle<br>`src/alg/layered/intermediate/ConstraintsPostprocessor.test.ts:105` idle |
| `9e63be62` | 2 | 13 | `src/alg/layered/LayeredOrderVectors.test.ts:30` factories<br>`test/corpus/order-sweep.test.ts:52` factories |
| `c37cfd1c` | 2 | 11 | `src/alg/layered/LayeredPhaseVectors.test.ts:34` factories<br>`test/corpus/phase-sweep.test.ts:47` factories |

## Singletons (kept unless T1 finds an identical twin)

| Group | Site |
| ----- | ---- |
| `1dd29adb` | `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.test.ts:149` factories |
| `2b52d7d6` | `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.test.ts:191` twinFactories |
| `c5579eff` | `src/alg/layered/p1cycles/BFSNodeOrderCycleBreaker.test.ts:21` factories |
| `b0e5254c` | `src/alg/layered/p1cycles/SCConnectivity.test.ts:21` factories |
| `7f19ad27` | `src/alg/layered/p1cycles/GreedyModelOrderCycleBreaker.test.ts:21` factories |
| `98159ab5` | `src/alg/layered/p1cycles/SCCNodeTypeCycleBreaker.test.ts:21` factories |
| `853db37c` | `src/alg/layered/p1cycles/GreedyCycleBreaker.test.ts:27` factories |
| `0cf4cdf3` | `src/alg/layered/p1cycles/ModelOrderCycleBreaker.test.ts:23` factories |
| `5266ff9b` | `src/alg/layered/p1cycles/DepthFirstCycleBreaker.test.ts:107` factories |
| `f742a7be` | `src/alg/layered/p1cycles/DepthFirstCycleBreaker.test.ts:149` twinFactories |
| `6e36875f` | `src/alg/layered/p1cycles/InteractiveCycleBreaker.test.ts:114` factories |
| `73e563eb` | `src/alg/layered/p1cycles/InteractiveCycleBreaker.test.ts:158` twinFactories |
| `d1566b3a` | `src/alg/layered/p2layers/NetworkSimplexLayerer.test.ts:35` factories |
| `308416b0` | `src/alg/layered/p2layers/StretchWidthLayerer.test.ts:28` factories |
| `f4576de9` | `src/alg/layered/p2layers/MinWidthLayerer.test.ts:29` factories |
| `c0fa2015` | `src/alg/layered/p2layers/LongestPathLayerer.test.ts:82` factories |
| `d59a4710` | `src/alg/layered/p2layers/LongestPathSourceLayerer.test.ts:84` factories |
| `45bb4556` | `src/alg/layered/p2layers/InteractiveLayerer.test.ts:28` factories |
| `097d4af1` | `src/alg/layered/p2layers/BreadthFirstModelOrderLayerer.test.ts:40` factories |
| `c2c25261` | `src/alg/layered/p2layers/CoffmanGrahamLayerer.test.ts:31` factories |
| `37cf29fb` | `src/alg/layered/p2layers/DepthFirstModelOrderLayerer.test.ts:35` factories |
| `560ccbeb` | `src/alg/layered/p4nodes/bk/BKCompactor.test.ts:189` factories |
| `701d4538` | `src/alg/layered/p4nodes/bk/BKNodePlacer.sites.test.ts:33` factories |
| `1140b509` | `src/alg/layered/p4nodes/bk/BKNodePlacer.test.ts:160` factories |
| `7cc64372` | `src/alg/layered/p4nodes/NetworkSimplexPlacer.sites.test.ts:28` factories |
| `d7031dd2` | `src/alg/layered/p4nodes/InteractiveNodePlacer.test.ts:98` factories |
| `3212b0bd` | `src/alg/layered/p4nodes/NetworkSimplexPlacer.test.ts:256` factories |
| `fb7fa73b` | `src/alg/layered/p4nodes/BasicNodePlacementTest.test.ts:44` factories |
| `ca23f560` | `src/alg/layered/p4nodes/SimpleNodePlacer.test.ts:95` factories |
| `e735f30a` | `src/alg/layered/components/ComponentsProcessor.test.ts:90` factories |
| `39c0abc5` | `src/alg/layered/p5edges/orthogonal/HyperEdgeSegment.sites.test.ts:35` factories |
| `0ca4e3d9` | `src/alg/layered/p5edges/PolylineEdgeRouter.sites.test.ts:34` factories |
| `0cd597b9` | `src/alg/layered/p5edges/splines/SplineEdgeRouter.sites.test.ts:35` factories |
| `a5d42440` | `src/alg/layered/p5edges/splines/SplineEdgeRouter.test.ts:61` factories |
| `3216c50d` | `src/alg/layered/p5edges/splines/SplinesMath.test.ts:24` factories |
| `5b3ad347` | `src/alg/layered/p5edges/OrthogonalEdgeRouter.sites.test.ts:36` factories |
| `65fa1ac6` | `src/alg/layered/p5edges/PolylineEdgeRouter.test.ts:40` factories |
| `8ddaa055` | `src/alg/layered/p5edges/OrthogonalEdgeRouter.test.ts:61` factories |
| `ad333849` | `src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverser.test.ts:17` factories |
| `edccab59` | `src/alg/layered/intermediate/PartitionMidprocessor.test.ts:18` factories |
| `b48953dc` | `src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter.test.ts:54` factories |
| `48b2a93b` | `src/alg/layered/intermediate/HierarchicalPortPositionProcessor.sites.test.ts:37` factories |
| `f2f4c7b0` | `src/alg/layered/intermediate/LabelDummySwitcher.test.ts:66` factories |
| `a9404005` | `src/alg/layered/intermediate/HyperedgeDummyMerger.sites.test.ts:32` factories |
| `34952a25` | `src/alg/layered/intermediate/LayerConstraintPostprocessor.test.ts:26` factories |
| `d647ec44` | `src/alg/layered/intermediate/ReversedEdgeRestorer.test.ts:17` factories |
| `6672a678` | `src/alg/layered/intermediate/GraphTransformer.test.ts:53` factories |
| `f9587b2f` | `src/alg/layered/intermediate/InteractiveExternalPortPositioner.test.ts:27` factories |
| `ff001725` | `src/alg/layered/intermediate/NorthSouthPortPostprocessor.sites.test.ts:38` factories |
| `1b078a7d` | `src/alg/layered/intermediate/PartitionPostprocessor.test.ts:17` factories |
| `338bb87f` | `src/alg/layered/intermediate/LayerConstraintPreprocessor.test.ts:24` factories |
| `1a1a0bf8` | `src/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.test.ts:72` factories |
| `2a99734c` | `src/alg/layered/intermediate/EndLabelPreprocessorSides.test.ts:76` factories |
| `8a4928f9` | `src/alg/layered/intermediate/PartitionPreprocessor.test.ts:16` factories |
| `0a45515c` | `src/alg/layered/intermediate/LayerSizeAndGraphHeightCalculator.sites.test.ts:33` factories |
| `cb6478d3` | `test/helpers/layered-phase-replay-ops.test.ts:153` factories |

## Order site-row replay blocks (D2)

`SITE_ROWS` + `siteFactories` + `replaySite(id)` over `test/golden/refs/java/layered-order.json`:

- Variant A (13 files, eager `filter(sites/)`, error `no site row <id>`): `src/alg/layered/p3order/{LayerSweepCrossingMinimizer,
  BarycenterHeuristic,InteractiveCrossingMinimizer,AbstractBarycenterPortDistributor,LayerTotalPortDistributor,
  NodeRelativePortDistributor,ModelOrderBarycenterHeuristic,SweepCopy,MedianHeuristic}.test.ts` and
  `src/alg/layered/p3order/counting/{CrossingsCounterNorthSouth,CrossingsCounter,AllCrossingsCounter,HyperedgeCrossingsCounter}.test.ts`.
- Variant B (10 files, lazy `siteRows ??=`, error `site row <id> is not in layered-order.json`):
  `src/alg/layered/intermediate/preserveorder/{ModelOrderNodeComparator,ModelOrderNodeComparatorPreviousLayer,
  ModelOrderNodeComparatorHelperDummies,ModelOrderPortComparator,ModelOrderPortComparatorAssociations,
  ModelOrderPortComparatorIncoming,ModelOrderPortComparatorOutgoing}.test.ts` and
  `src/alg/layered/intermediate/greedyswitch/{SwitchDecider,BetweenLayerEdgeTwoNodeCrossingsCounter,
  NorthSouthEdgeNeighbouringNodeCrossingsCounter}.test.ts`.
- Kept (per-file injected factories with `expect`/`throw` guards or another ref): the `layered-phase` site blocks of
  `intermediate/{NodePromotion,HighDegreeNodeLayeringProcessor,EdgeAndLayerConstraintEdgeReverser,
  InteractiveExternalPortPositioner,LayerConstraintPreprocessor,LayerConstraintPostprocessor}.test.ts`, the seven
  `SITE_FACTORIES = { ...factories, … }` blocks (each spreads its own file's `factories`), and the p4nodes `.sites` files.

## `CALLERS` tables (D1)

`LayeredRoutingVectors.test.ts:88` holds the union of the per-class tables of `p5edges/splines/{SplinesMath,Rectangle,
NubSpline,NubsSelfLoop}.test.ts` and their `.sites.test.ts` twins (`Rectangle.sites` has a narrower `Rectangle.union`
that only takes an `LNode`; the others are key subsets with identical functions).

