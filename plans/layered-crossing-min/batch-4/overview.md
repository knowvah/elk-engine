<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — p3order upper half, greedy switch, strategy arms

One task after batch 3: the sweep driver and everything mutually dependent with it.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T7  | `GraphInfoHolder`, `LayerSweepTypeDecider`, `LayerSweepCrossingMinimizer`, `InteractiveCrossingMinimizer`, `NoCrossingMinimizer`, `greedyswitch` (5), `CrossingMinimizationStrategy` arms, sentinel ([brief](T7-p3order-upper-greedyswitch.md)) | typescript-pro | src/alg/layered/p3order/{GraphInfoHolder,LayerSweepTypeDecider,LayerSweepCrossingMinimizer,InteractiveCrossingMinimizer,NoCrossingMinimizer}.ts, src/alg/layered/intermediate/greedyswitch/*.ts, src/alg/layered/options/CrossingMinimizationStrategy.ts, src/alg/layered/IHierarchyAwareLayoutProcessor.test.ts + tests | T6 | [x] |
