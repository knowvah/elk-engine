<!-- SPDX-License-Identifier: EPL-2.0 -->

# Inventory: test-helper-consolidation (issue #46, written by T1)

Re-derived at the squash base `f5c2c889` from the AST (`oxc-parser`): every variable declared `: Factories` with an
object literal, in `src/**/*.test.ts` and `test/**/*.ts`. The planning inventory counted 176 objects; this one has
181, because it also reads `test/helpers/` non-test files, declarations inside a test body in `test/helpers/`, and
two that the planning script missed (`LabelDummyInserterReplay.test.ts:54`,
`layered-phase-replay-pre-state.test.ts:17`). Hashes differ from the planning ones (another normaliser); the groups
are the same.

Totals: 181 `Factories` objects, 109 moved to an export (23 of them inside an order site-replay
block), 72 kept; 23 order site-replay blocks, all moved; 8 `CALLERS` tables, all moved (planning said 9: there is no
`SplinesMath.sites.test.ts`).

Row format (T5-T7 contract): `| file:line | name | lane | action |`. Lines are those of the squash base.

## How a move was checked (D1)

For every moved object, a script compared the site with its export: the body after collapsing whitespace, with each
file-local string constant replaced by its literal (`CYCLE_PHASE` and `'P1_CYCLE_BREAKING'` are the same value), and
the import each remaining identifier resolves to (module path and symbol). All 109 agree, with these notes:

- ¹ `ORDER_PHASE_FACTORIES` holds the `switch` form; the ten variant-B sites wrote the same three-way dispatch as a
  ternary. D1 names this merge.
- ² `CHECKED_ROUTING_PHASE_FACTORIES` holds `createPhase` as an arrow property; three `.sites` files wrote it as a
  method (`createPhase(phase, strategy) { … }`). The text is identical once the method head is rewritten, and no body
  uses `this`, `arguments` or `super`, so the two forms are the same function. D1 allows one semantic merge by name;
  this second one is a syntax-only difference decided under the borderline push-forward and journaled for review.
- `STRICT_ROUTING_PHASE_FACTORIES` serves the sites that named the phases by constant and the two that wrote the
  literals (same values).
- `COMMENT_PROCESSOR_FACTORIES` and `LABEL_PROCESSOR_FACTORIES`: the planning group of five closes over a file-local
  `INJECTED` table. The table is identical in three files and in the other two, so the group splits in two and each
  table moves with its export.

## Exports

| Export | File | Sites |
| ------ | ---- | ----- |
| `CHECKED_ROUTING_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 11 |
| `ORDER_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 10 |
| `LAYERING_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 8 |
| `STRICT_ROUTING_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 7 |
| `ROUTING_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 6 |
| `INJECTED_ROUTER_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 5 |
| `PLACEMENT_PROCESSOR_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 5 |
| `GREEDY_SWITCH_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 4 |
| `ORDER_PROCESSOR_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 4 |
| `PORT_PROCESSOR_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 4 |
| `COMMENT_PROCESSOR_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 3 |
| `SPLITTER_TO_SORTER_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 3 |
| `LABEL_PROCESSOR_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 2 |
| `LINEAR_SEGMENTS_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 2 |
| `NUBS_SELF_LOOP_CALL_FACTORIES` | `test/helpers/layered-spline-callers.ts` | 2 |
| `NUB_SPLINE_CALL_FACTORIES` | `test/helpers/layered-spline-callers.ts` | 2 |
| `RECTANGLE_CALL_FACTORIES` | `test/helpers/layered-spline-callers.ts` | 2 |
| `STRICT_LAYERING_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 2 |
| `STRICT_ORDER_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 2 |
| `STRICT_PLACEMENT_PHASE_FACTORIES` | `test/helpers/layered-replay-factories.ts` | 2 |
| `replayOrderSite(id)` | `test/helpers/layered-order-site-replay.ts` | 23 blocks |
| `SPLINES_MATH_CALLERS`, `RECTANGLE_CALLERS`, `NUB_SPLINE_CALLERS`, `NUBS_SELF_LOOP_CALLERS` | `test/helpers/layered-spline-callers.ts` | 8 tables |

## Lane T5: `src/alg/layered/p3order/**`

### `Factories` objects

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `src/alg/layered/p3order/AbstractBarycenterPortDistributor.test.ts:40` | `factories` | T5 | → `SPLITTER_TO_SORTER_FACTORIES` |
| `src/alg/layered/p3order/AbstractBarycenterPortDistributor.test.ts:484` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/BarycenterHeuristic.test.ts:49` | `factories` | T5 | → `SPLITTER_TO_SORTER_FACTORIES` |
| `src/alg/layered/p3order/BarycenterHeuristic.test.ts:479` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/BasicCrossingMinimizationTest.test.ts:32` | `factories` | T5 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/p3order/ForsterConstraintResolverTest.test.ts:29` | `factories` | T5 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/p3order/InteractiveCrossingMinimizer.test.ts:58` | `factories` | T5 | → `GREEDY_SWITCH_FACTORIES` |
| `src/alg/layered/p3order/InteractiveCrossingMinimizer.test.ts:369` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/LayerSweepCrossingMinimizer.test.ts:145` | `factories` | T5 | → `GREEDY_SWITCH_FACTORIES` |
| `src/alg/layered/p3order/LayerSweepCrossingMinimizer.test.ts:375` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/LayerTotalPortDistributor.test.ts:18` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/MedianHeuristic.test.ts:35` | `factories` | T5 | → `SPLITTER_TO_SORTER_FACTORIES` |
| `src/alg/layered/p3order/MedianHeuristic.test.ts:222` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/ModelOrderBarycenterHeuristic.test.ts:227` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/ModelOrderBarycenterHeuristicTest.test.ts:33` | `factories` | T5 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/p3order/NoCrossingMinimizer.test.ts:42` | `factories` | T5 | → `GREEDY_SWITCH_FACTORIES` |
| `src/alg/layered/p3order/NodeRelativePortDistributor.test.ts:18` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/SweepCopy.test.ts:138` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/counting/AllCrossingsCounter.test.ts:84` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/counting/CrossingsCounter.test.ts:124` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/counting/CrossingsCounterNorthSouth.test.ts:18` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |
| `src/alg/layered/p3order/counting/HyperedgeCrossingsCounter.test.ts:109` | `siteFactories` | T5 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) |

### Order site-replay blocks (D2)

The block is `SITE_ROWS` (variant A) or `SITE_ROWS_FILE`, `SITE_PHASE_*`, `siteRows` (variant B), `siteFactories` and
`replaySite`. All of it goes; calls become `replayOrderSite(…)`.

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `src/alg/layered/p3order/AbstractBarycenterPortDistributor.test.ts:499` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/BarycenterHeuristic.test.ts:494` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/InteractiveCrossingMinimizer.test.ts:384` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/LayerSweepCrossingMinimizer.test.ts:390` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/LayerTotalPortDistributor.test.ts:33` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/MedianHeuristic.test.ts:237` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/ModelOrderBarycenterHeuristic.test.ts:242` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/NodeRelativePortDistributor.test.ts:33` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/SweepCopy.test.ts:153` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/counting/AllCrossingsCounter.test.ts:99` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/counting/CrossingsCounter.test.ts:139` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/counting/CrossingsCounterNorthSouth.test.ts:33` | `replaySite` (variant A) | T5 | → `replayOrderSite` |
| `src/alg/layered/p3order/counting/HyperedgeCrossingsCounter.test.ts:124` | `replaySite` (variant A) | T5 | → `replayOrderSite` |

## Lane T6: `src/alg/layered/intermediate/**`

### `Factories` objects

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `src/alg/layered/intermediate/BasicConsiderModelOrderTest.test.ts:75` | `factories` | T6 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/CommentNodeMarginCalculator.test.ts:36` | `factories` | T6 | → `COMMENT_PROCESSOR_FACTORIES` (its `INJECTED` table moves with it as `INJECTED_COMMENT_PROCESSORS`) |
| `src/alg/layered/intermediate/CommentPostprocessor.test.ts:36` | `factories` | T6 | → `COMMENT_PROCESSOR_FACTORIES` (its `INJECTED` table moves with it as `INJECTED_COMMENT_PROCESSORS`) |
| `src/alg/layered/intermediate/CommentPostprocessorSites.test.ts:25` | `factories` | T6 | → `CHECKED_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/CommentPreprocessor.test.ts:36` | `factories` | T6 | → `COMMENT_PROCESSOR_FACTORIES` (its `INJECTED` table moves with it as `INJECTED_COMMENT_PROCESSORS`) |
| `src/alg/layered/intermediate/CommentPreprocessorSites.test.ts:26` | `factories` | T6 | → `CHECKED_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/ConstraintsPostprocessor.test.ts:45` | `factories` | T6 | kept: closes over the file's `INJECTED` table, whose `[PROCESSOR]` entry is the class under test and differs in each file (D1 identifier rule fails) |
| `src/alg/layered/intermediate/ConstraintsPostprocessor.test.ts:105` | `idle` | T6 | kept: declared inside one test, spreads the file's `factories` and closes over the file's `PROCESSOR` name, which differs |
| `src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverser.test.ts:17` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/EdgeAndLayerConstraintEdgeReverserTest.test.ts:23` | `factories` | T6 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/EndLabelPreprocessorSides.test.ts:76` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/EndLabelSorter.test.ts:41` | `factories` | T6 | kept: closes over the file's `INJECTED` table, whose `[PROCESSOR]` entry is the class under test and differs in each file (D1 identifier rule fails) |
| `src/alg/layered/intermediate/GraphTransformer.sites.test.ts:193` | `factories` | T6 | → `CHECKED_ROUTING_PHASE_FACTORIES` ² |
| `src/alg/layered/intermediate/GraphTransformer.test.ts:53` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/HierarchicalPortConstraintProcessor.test.ts:52` | `factories` | T6 | → `ORDER_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/HierarchicalPortConstraintProcessor.test.ts:135` | `SITE_FACTORIES` | T6 | kept: spreads the file's `factories` and calls it for the other phases (D1 names these seven); after the move it spreads the imported export |
| `src/alg/layered/intermediate/HierarchicalPortDummySizeProcessor.test.ts:42` | `factories` | T6 | → `PLACEMENT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter.sites.test.ts:143` | `factories` | T6 | → `CHECKED_ROUTING_PHASE_FACTORIES` ² |
| `src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter.test.ts:54` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/HierarchicalPortPositionProcessor.sites.test.ts:37` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/HierarchicalPortPositionProcessor.test.ts:38` | `factories` | T6 | → `INJECTED_ROUTER_FACTORIES` |
| `src/alg/layered/intermediate/HyperedgeDummyMerger.sites.test.ts:32` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/HyperedgeDummyMerger.test.ts:45` | `factories` | T6 | → `INJECTED_ROUTER_FACTORIES` |
| `src/alg/layered/intermediate/HypernodesProcessor.sites.test.ts:116` | `factories` | T6 | → `CHECKED_ROUTING_PHASE_FACTORIES` ² |
| `src/alg/layered/intermediate/HypernodesProcessor.test.ts:41` | `factories` | T6 | kept: closes over the file's `INJECTED` table, whose `[PROCESSOR]` entry is the class under test and differs in each file (D1 identifier rule fails) |
| `src/alg/layered/intermediate/HypernodesProcessor.test.ts:101` | `idle` | T6 | kept: declared inside one test, spreads the file's `factories` and closes over the file's `PROCESSOR` name, which differs |
| `src/alg/layered/intermediate/InLayerConstraintProcessor.test.ts:100` | `factories` | T6 | → `PLACEMENT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/InnermostNodeMarginCalculator.test.ts:101` | `factories` | T6 | → `PLACEMENT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/InteractiveExternalPortPositioner.test.ts:27` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/InvertedPortProcessor.test.ts:63` | `factories` | T6 | → `PORT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/InvertedPortProcessor.test.ts:120` | `SITE_FACTORIES` | T6 | kept: spreads the file's `factories` and calls it for the other phases (D1 names these seven); after the move it spreads the imported export |
| `src/alg/layered/intermediate/InvertedPortProcessorTest.test.ts:28` | `factories` | T6 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/LabelAndNodeSizeProcessor.test.ts:109` | `factories` | T6 | → `PLACEMENT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/LabelDummyInserterReplay.test.ts:54` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/LabelDummyInserterSites.test.ts:25` | `factories` | T6 | → `ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/LabelDummySwitcher.test.ts:66` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/LabelDummySwitcherSites.test.ts:24` | `factories` | T6 | → `ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/LabelManagementProcessor.test.ts:55` | `factories` | T6 | → `LABEL_PROCESSOR_FACTORIES` (its `INJECTED` table moves with it as `INJECTED_LABEL_PROCESSORS`) |
| `src/alg/layered/intermediate/LabelManagementProcessorSites.test.ts:25` | `factories` | T6 | → `ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/LabelSideSelector.test.ts:62` | `factories` | T6 | → `LABEL_PROCESSOR_FACTORIES` (its `INJECTED` table moves with it as `INJECTED_LABEL_PROCESSORS`; `LabelSideSelector.test.ts` imports the table for its enum patch) |
| `src/alg/layered/intermediate/LayerConstraintPostprocessor.test.ts:26` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/LayerConstraintPreprocessor.test.ts:24` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/LayerConstraintProcessorTest.test.ts:23` | `factories` | T6 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/LayerSizeAndGraphHeightCalculator.sites.test.ts:33` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/LayerSizeAndGraphHeightCalculator.test.ts:38` | `factories` | T6 | → `INJECTED_ROUTER_FACTORIES` |
| `src/alg/layered/intermediate/LayerSizeAndGraphHeigthCalculatorTest.test.ts:36` | `factories` | T6 | → `ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/LongEdgeJoiner.test.ts:46` | `factories` | T6 | → `INJECTED_ROUTER_FACTORIES` |
| `src/alg/layered/intermediate/LongEdgeSplitter.test.ts:69` | `factories` | T6 | → `PORT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/LongEdgeSplitter.test.ts:126` | `SITE_FACTORIES` | T6 | kept: spreads the file's `factories` and calls it for the other phases (D1 names these seven); after the move it spreads the imported export |
| `src/alg/layered/intermediate/LongEdgeSplitterTest.test.ts:25` | `factories` | T6 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/NodePlacementRepeater.test.ts:57` | `factories` | T6 | → `PLACEMENT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/NodePromotionTest.test.ts:29` | `factories` | T6 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/NorthSouthPortPostprocessor.sites.test.ts:38` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/NorthSouthPortPostprocessor.test.ts:46` | `factories` | T6 | → `INJECTED_ROUTER_FACTORIES` |
| `src/alg/layered/intermediate/NorthSouthPortPreprocessor.test.ts:60` | `factories` | T6 | → `ORDER_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/NorthSouthPortPreprocessor.test.ts:182` | `SITE_FACTORIES` | T6 | kept: spreads the file's `factories` and calls it for the other phases (D1 names these seven); after the move it spreads the imported export |
| `src/alg/layered/intermediate/NorthSouthPortPreprocessorTest.test.ts:29` | `factories` | T6 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/PartitionMidprocessor.test.ts:18` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/PartitionPostProcessorTest.test.ts:23` | `factories` | T6 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/PartitionPostprocessor.test.ts:17` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/PartitionPreprocessor.test.ts:16` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/PortListSorter.test.ts:77` | `factories` | T6 | → `PORT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/PortListSorter.test.ts:148` | `SITE_FACTORIES` | T6 | kept: spreads the file's `factories` and calls it for the other phases (D1 names these seven); after the move it spreads the imported export |
| `src/alg/layered/intermediate/PortListSorterTest.test.ts:42` | `factories` | T6 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/PortSideProcessor.test.ts:71` | `factories` | T6 | → `PORT_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/PortSideProcessor.test.ts:128` | `SITE_FACTORIES` | T6 | kept: spreads the file's `factories` and calls it for the other phases (D1 names these seven); after the move it spreads the imported export |
| `src/alg/layered/intermediate/PortSideProcessorTest.test.ts:28` | `factories` | T6 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/ReversedEdgeRestorer.test.ts:17` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/ReversedEdgeRestorerTest.test.ts:22` | `factories` | T6 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/SemiInteractiveCrossMinProcessor.test.ts:72` | `factories` | T6 | → `ORDER_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/SemiInteractiveCrossMinProcessor.test.ts:130` | `SITE_FACTORIES` | T6 | kept: spreads the file's `factories` and calls it for the other phases (D1 names these seven); after the move it spreads the imported export |
| `src/alg/layered/intermediate/SortByInputModelProcessor.test.ts:76` | `factories` | T6 | → `ORDER_PROCESSOR_FACTORIES` |
| `src/alg/layered/intermediate/SortByInputModelProcessorTest.test.ts:43` | `factories` | T6 | → `ORDER_PHASE_FACTORIES` |
| `src/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.test.ts:32` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/greedyswitch/GreedySwitchHeuristic.test.ts:59` | `factories` | T6 | → `GREEDY_SWITCH_FACTORIES` |
| `src/alg/layered/intermediate/greedyswitch/NorthSouthEdgeNeighbouringNodeCrossingsCounter.test.ts:33` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/greedyswitch/SwitchDecider.test.ts:40` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparator.test.ts:33` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorHelperDummies.test.ts:23` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorPreviousLayer.test.ts:23` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparator.test.ts:32` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorAssociations.test.ts:23` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorIncoming.test.ts:23` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorOutgoing.test.ts:23` | `siteFactories` | T6 | → `replayOrderSite` (the block goes; its dispatch is `ORDER_PHASE_FACTORIES`) ¹ |
| `src/alg/layered/intermediate/unzipping/AlternatingLayerUnzipper.test.ts:72` | `factories` | T6 | kept: occurs once (D1) |
| `src/alg/layered/intermediate/unzipping/AlternatingLayerUnzipperSites.test.ts:24` | `factories` | T6 | → `CHECKED_ROUTING_PHASE_FACTORIES` |

### Order site-replay blocks (D2)

The block is `SITE_ROWS` (variant A) or `SITE_ROWS_FILE`, `SITE_PHASE_*`, `siteRows` (variant B), `siteFactories` and
`replaySite`. All of it goes; calls become `replayOrderSite(…)`.

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `src/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.test.ts:45` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/greedyswitch/NorthSouthEdgeNeighbouringNodeCrossingsCounter.test.ts:46` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/greedyswitch/SwitchDecider.test.ts:53` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparator.test.ts:46` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorHelperDummies.test.ts:36` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/preserveorder/ModelOrderNodeComparatorPreviousLayer.test.ts:36` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparator.test.ts:45` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorAssociations.test.ts:36` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorIncoming.test.ts:36` | `replaySite` (variant B) | T6 | → `replayOrderSite` |
| `src/alg/layered/intermediate/preserveorder/ModelOrderPortComparatorOutgoing.test.ts:36` | `replaySite` (variant B) | T6 | → `replayOrderSite` |

## Lane T7: the rest of `src/alg/layered/**` and `test/corpus/`

### `Factories` objects

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `src/alg/layered/DotDebugUtilSites.test.ts:25` | `factories` | T7 | → `CHECKED_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/ElkLayeredAnchored.test.ts:37` | `factories` | T7 | → `STRICT_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/InteractiveLayeredGraphVisitor.test.ts:38` | `factories` | T7 | → `CHECKED_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/InteractiveLayeredGraphVisitorArms.test.ts:148` | `factories` | T7 | → `CHECKED_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/InteractiveLayeredGraphVisitorSites.test.ts:256` | `factories` | T7 | → `CHECKED_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/JsonDebugUtilSites.test.ts:27` | `factories` | T7 | → `CHECKED_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/LayeredLabelsVectors.test.ts:72` | `factories` | T7 | → `STRICT_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/LayeredOrderVectors.test.ts:30` | `factories` | T7 | → `STRICT_ORDER_PHASE_FACTORIES` |
| `src/alg/layered/LayeredPhaseVectors.test.ts:34` | `factories` | T7 | → `STRICT_LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/LayeredPipelineVectors.test.ts:58` | `factories` | T7 | → `STRICT_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/LayeredPlacementVectors.test.ts:33` | `factories` | T7 | → `STRICT_PLACEMENT_PHASE_FACTORIES` |
| `src/alg/layered/LayeredRoutingVectors.test.ts:67` | `factories` | T7 | → `STRICT_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/components/ComponentsAnchored.test.ts:45` | `factories` | T7 | → `STRICT_ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/components/ComponentsProcessor.test.ts:90` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/issues/Issue726Test.test.ts:34` | `factories` | T7 | → `ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/p1cycles/BFSNodeOrderCycleBreaker.test.ts:21` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/BasicCycleBreakerTest.test.ts:31` | `factories` | T7 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.test.ts:149` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.test.ts:191` | `twinFactories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/DepthFirstCycleBreaker.test.ts:107` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/DepthFirstCycleBreaker.test.ts:149` | `twinFactories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/GreedyCycleBreaker.test.ts:27` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/GreedyModelOrderCycleBreaker.test.ts:21` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/InteractiveCycleBreaker.test.ts:114` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/InteractiveCycleBreaker.test.ts:158` | `twinFactories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/ModelOrderCycleBreaker.test.ts:23` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/SCCNodeTypeCycleBreaker.test.ts:21` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p1cycles/SCConnectivity.test.ts:21` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/BasicLayerAssignmentTest.test.ts:18` | `factories` | T7 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/p2layers/BasicModelOrderTest.test.ts:18` | `factories` | T7 | → `LAYERING_PHASE_FACTORIES` |
| `src/alg/layered/p2layers/BreadthFirstModelOrderLayerer.test.ts:40` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/CoffmanGrahamLayerer.test.ts:31` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/DepthFirstModelOrderLayerer.test.ts:35` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/InteractiveLayerer.test.ts:28` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/LongestPathLayerer.test.ts:82` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/LongestPathSourceLayerer.test.ts:84` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/MinWidthLayerer.test.ts:29` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/NetworkSimplexLayerer.test.ts:35` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p2layers/StretchWidthLayerer.test.ts:28` | `factories` | T7 | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `src/alg/layered/p4nodes/BasicNodePlacementTest.test.ts:44` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p4nodes/InteractiveNodePlacer.test.ts:98` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p4nodes/LinearSegmentsNodePlacer.sites.test.ts:34` | `factories` | T7 | → `LINEAR_SEGMENTS_FACTORIES` |
| `src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts:116` | `factories` | T7 | → `LINEAR_SEGMENTS_FACTORIES` |
| `src/alg/layered/p4nodes/NetworkSimplexPlacer.sites.test.ts:28` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p4nodes/NetworkSimplexPlacer.test.ts:256` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p4nodes/SimpleNodePlacer.test.ts:95` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p4nodes/bk/BKCompactor.test.ts:189` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p4nodes/bk/BKNodePlacer.sites.test.ts:33` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p4nodes/bk/BKNodePlacer.test.ts:160` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/BasicEdgeRouterTest.test.ts:41` | `factories` | T7 | → `ROUTING_PHASE_FACTORIES` |
| `src/alg/layered/p5edges/OrthogonalEdgeRouter.sites.test.ts:36` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/OrthogonalEdgeRouter.test.ts:61` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/PolylineEdgeRouter.sites.test.ts:34` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/PolylineEdgeRouter.test.ts:40` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/orthogonal/HyperEdgeSegment.sites.test.ts:35` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/splines/NubSpline.sites.test.ts:28` | `factories` | T7 | → `NUB_SPLINE_CALL_FACTORIES` |
| `src/alg/layered/p5edges/splines/NubSpline.test.ts:41` | `factories` | T7 | → `NUB_SPLINE_CALL_FACTORIES` |
| `src/alg/layered/p5edges/splines/NubsSelfLoop.sites.test.ts:26` | `factories` | T7 | → `NUBS_SELF_LOOP_CALL_FACTORIES` |
| `src/alg/layered/p5edges/splines/NubsSelfLoop.test.ts:31` | `factories` | T7 | → `NUBS_SELF_LOOP_CALL_FACTORIES` |
| `src/alg/layered/p5edges/splines/Rectangle.sites.test.ts:25` | `factories` | T7 | → `RECTANGLE_CALL_FACTORIES` |
| `src/alg/layered/p5edges/splines/Rectangle.test.ts:25` | `factories` | T7 | → `RECTANGLE_CALL_FACTORIES` |
| `src/alg/layered/p5edges/splines/SplineEdgeRouter.sites.test.ts:35` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/splines/SplineEdgeRouter.test.ts:61` | `factories` | T7 | kept: occurs once (D1) |
| `src/alg/layered/p5edges/splines/SplinesMath.test.ts:24` | `factories` | T7 | kept: occurs once (D1) |
| `test/corpus/order-sweep.test.ts:52` | `factories` | T7 | → `STRICT_ORDER_PHASE_FACTORIES` |
| `test/corpus/phase-sweep.test.ts:47` | `factories` | T7 | → `STRICT_LAYERING_PHASE_FACTORIES` |
| `test/corpus/placement-sweep.test.ts:54` | `factories` | T7 | → `STRICT_PLACEMENT_PHASE_FACTORIES` |
| `test/corpus/routing-sweep.test.ts:61` | `factories` | T7 | → `STRICT_ROUTING_PHASE_FACTORIES` |

### `CALLERS` tables (D1 exception)

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `src/alg/layered/LayeredRoutingVectors.test.ts:88` | `CALLERS` | T7 | → `{ ...SPLINES_MATH_CALLERS, ...RECTANGLE_CALLERS, ...NUB_SPLINE_CALLERS, ...NUBS_SELF_LOOP_CALLERS }` (its 26 keys are exactly the four tables; the `isBetween` choice stays local) |
| `src/alg/layered/p5edges/splines/SplinesMath.test.ts:31` | `CALLERS` | T7 | → `SPLINES_MATH_CALLERS` (same six keys); `isBetweenCallers` stays |
| `src/alg/layered/p5edges/splines/Rectangle.test.ts:39` | `CALLERS` | T7 | → `RECTANGLE_CALLERS` (same six keys) |
| `src/alg/layered/p5edges/splines/Rectangle.sites.test.ts:38` | `CALLERS` | T7 | → `RECTANGLE_CALLERS` (superset of its three keys; its `Rectangle.union` takes only an `LNode`: T7 step 2 proves the rows) |
| `src/alg/layered/p5edges/splines/NubSpline.test.ts:49` | `CALLERS` | T7 | → `NUB_SPLINE_CALLERS` (same nine keys) |
| `src/alg/layered/p5edges/splines/NubSpline.sites.test.ts:35` | `CALLERS` | T7 | → `NUB_SPLINE_CALLERS` (superset of its seven keys, same functions: T7 step 2) |
| `src/alg/layered/p5edges/splines/NubsSelfLoop.test.ts:38` | `CALLERS` | T7 | → `NUBS_SELF_LOOP_CALLERS` (same five keys; the local `FACTORIES` list stays if the file still uses it) |
| `src/alg/layered/p5edges/splines/NubsSelfLoop.sites.test.ts:33` | `CALLERS` | T7 | → `NUBS_SELF_LOOP_CALLERS` (superset of its one key, same function: T7 step 2) |

## Helpers, done by T1

### `Factories` objects

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `test/helpers/layered-loops-replay-ops.ts:75` | `strategyFactories` | T1 | → `STRICT_ROUTING_PHASE_FACTORIES` (done in T1: `strategyFactories` is now that export under its old name, its six importers unchanged) |

## `test/helpers/` objects that stay

### `Factories` objects

| file:line | name | lane | action |
| --------- | ---- | ---- | ------ |
| `test/helpers/layered-phase-replay-ops.test.ts:153` | `factories` | — | kept: occurs once; declared inside its test and injects the class under test (D1) |
| `test/helpers/layered-phase-replay-pre-state.test.ts:17` | `REFUSE` | — | kept: occurs once (D1) |
| `test/helpers/layered-placement-replay-compare.test.ts:58` | `factories` | — | kept: declared inside one test and closes over that test's stub `phase` |
| `test/helpers/layered-routing-replay-compare.test.ts:87` | `factories` | — | kept: declared inside one test and closes over that test's stub `phase` |

## The other four items of #46

| Item | Site | Action |
| ---- | ---- | ------ |
| `fromPattern` (D6) | `src/alg/common/polyomino/ProfileFill.test.ts:7`, `src/alg/common/polyomino/structures/Polyomino.test.ts:8` | → `fromPattern` of `test/helpers/polyomino-fixtures.ts` |
| JUnit delta assertion (D3) | `test/helpers/edge-route-orthogonal.ts:27-32` (private `assertEqualsWithin`, `AssertionFailure`) | → `assertEqualsWithin` and `AssertionFailure` of `test/helpers/junit-delta.ts`; the class is re-exported |
| JUnit delta assertion (D3) | `src/alg/layered/intermediate/LabelAndNodeSizeProcessorOffsetTest.test.ts:31` (private `assertEquals`, the same body; found by T8's grep) | → `assertEqualsWithin` of `junit-delta.ts`, imported as `assertEquals` so the four assertion lines are unchanged |
| JUnit delta assertion (D3) | `src/alg/layered/issues/Issue447Test.test.ts:39` (private `assertEqualsWithin` built on `expect(…).toBe(true)`) | kept: replacing it removes an `expect` line (AD-13); `needs-ruling` #119 |
| Layout harness (D4) | `src/core/issues/Issue489Test.test.ts`, `src/alg/common/issues/Issue475Test.test.ts` | → `defineLayoutTest` with `defaultConfiguration: true` |
| Layout harness (D4) | `src/core/issues/Issue457Test.test.ts`, `test/helpers/elkt-layout-harness.ts`, `test/helpers/elkt-layout-harness.test.ts` | kept (stop 5): with the Java's defaults the suite needs label metrics for `n` and `ni`, which `layered-label-metrics.json` lacks; `follow-up` #118 |
| Duplicated full-row loop (D5) | `src/alg/layered/ElkLayered.test.ts:56-61` | removed: `LayeredPipelineVectors.test.ts`'s `full rows` group runs the same 199 rows with the same assertion; the `finds the 199 full rows` pin stays |
