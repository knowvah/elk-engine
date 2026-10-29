<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Processors, cycle breakers, layerers

Four parallel tasks after batch 1. Each ports its classes test-first against the `scenarios/*` rows of
`layered-phases.json`, running a row through T3's helpers with the class under test injected, so no task needs
another's classes (T1 built every scenario pre-state by steps). The ten recursive methods become explicit-stack loops
with twins (B8). Write-sets are disjoint by directory; T6 and T7 each own one strategy file.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4  | The five declared processors ([brief](T4-declared-processors.md)) | typescript-pro | src/alg/layered/intermediate/{EdgeAndLayerConstraintEdgeReverser,LayerConstraintPreprocessor,LayerConstraintPostprocessor,ReversedEdgeRestorer,InteractiveExternalPortPositioner}.ts + tests | T1, T3 | [x] |
| T5  | The five layering-adjacent processors ([brief](T5-layering-processors.md)) | typescript-pro | src/alg/layered/intermediate/{NodePromotion*,HighDegreeNodeLayeringProcessor,PartitionPreprocessor,PartitionMidprocessor,PartitionPostprocessor}.ts + tests | T1, T3 | [x] |
| T6  | `p1cycles` and the `CycleBreakingStrategy` arms ([brief](T6-p1cycles.md)) | typescript-pro | src/alg/layered/p1cycles/*.ts + tests, src/alg/layered/options/CycleBreakingStrategy.ts | T1, T2, T3 | [x] |
| T7  | `p2layers` and the `LayeringStrategy` arms ([brief](T7-p2layers.md)) | typescript-pro | src/alg/layered/p2layers/*.ts + tests, src/alg/layered/options/LayeringStrategy.ts | T1, T2, T3 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green. Agents never run
`npm run coverage` and never commit.
