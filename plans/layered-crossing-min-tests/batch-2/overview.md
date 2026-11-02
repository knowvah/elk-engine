<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Derived creators, p3order suites, between-layer counter suite

Five tasks after T2, run in parallel; write-sets are disjoint files. T4–T6 need only the base creator; T3a and T3b feed
batch 3. Suite agents follow [suite-rules.md](../suite-rules.md); a failing literal comes back as a diagnosis and the
orchestrator applies any T7 fix after the batch, before the gates.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T3a | `InLayerEdgeTestGraphCreator` ([brief](T3a-in-layer-edge-creator.md)) | typescript-pro | test/helpers/InLayerEdgeTestGraphCreator.ts (+ .test.ts) | T2 | [x] |
| T3b | `NorthSouthEdgeTestGraphCreator` ([brief](T3b-north-south-edge-creator.md)) | typescript-pro | test/helpers/NorthSouthEdgeTestGraphCreator.ts (+ .test.ts) | T2 | [x] |
| T4 | `LayerSweepCrossingMinimizerTest` ([brief](T4-layer-sweep-suite.md)) | typescript-pro | src/alg/layered/p3order/LayerSweepCrossingMinimizerTest*.test.ts | T2 | [x] |
| T5 | Five p3order suites ([brief](T5-p3order-suites.md)) | typescript-pro | src/alg/layered/p3order/{AbstractBarycenterPortDistributor,BarycenterHeuristic,GreedyPortDistributor,LayerSweepHierarchicalTwoSidedGreedySwitch,LayerSweepTypeDecider}Test.test.ts | T2 | [x] |
| T6 | `BetweenLayerEdgeTwoNodeCrossingsCounterTest` ([brief](T6-between-layer-suite.md)) | typescript-pro | src/alg/layered/intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounterTest.test.ts | T2 | [x] |

Gate after the batch: the README quality gates, plus `bash tools/oracle/java-tests.sh` over the batch's six suites.
