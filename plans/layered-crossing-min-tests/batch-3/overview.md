<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Counting and greedy-switch suites

Two tasks after T3a and T3b, run in parallel; disjoint write-sets. Suite agents follow
[suite-rules.md](../suite-rules.md); the orchestrator applies any T7 fix after the batch, before the gates.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T7 | Counting and in-layer suites ([brief](T7-counting-suites.md)) | typescript-pro | src/alg/layered/p3order/counting/{AllCrossingsCounter,CrossingsCounter,NorthSouthEdgeAllCrossingsCounter}Test.test.ts, src/alg/layered/intermediate/greedyswitch/InLayerEdgeTwoNodeCrossingCounterTest.test.ts | T3a, T3b | [x] |
| T8 | Greedy-switch suites ([brief](T8-greedy-switch-suites.md)) | typescript-pro | src/alg/layered/intermediate/greedyswitch/{GreedySwitchProcessor,NorthSouthEdgeNeighbouringNodeCrossingsCounter,SwitchDecider}Test.test.ts | T3b | [x] |

Gate after the batch: the README quality gates, plus `bash tools/oracle/java-tests.sh` over the batch's seven suites.
