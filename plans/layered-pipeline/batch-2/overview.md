<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Components; transformer; hierarchical router; three small processors

Four ports with disjoint write-sets, in parallel. Each proves its class on its `scenarios`/`models` rows with the class
injected; `GraphConfigurator` and the driver arrive in batch 3.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4  | `components`, `ComponentGroupTest` ([brief](T4-components.md)) | typescript-pro | src/alg/layered/components/** except ComponentOrderingStrategy and ComponentsCompactor | T1, T2, T3 | [x] |
| T5  | `GraphTransformer` ([brief](T5-graph-transformer.md)) | typescript-pro | src/alg/layered/intermediate/GraphTransformer*.ts + tests | T1, T3 | [x] |
| T6  | `HierarchicalPortOrthogonalEdgeRouter` ([brief](T6-hierarchical-port-router.md)) | typescript-pro | src/alg/layered/intermediate/HierarchicalPortOrthogonalEdgeRouter*.ts + tests | T1, T3 | [x] |
| T7  | `EndLabelSorter`, `HypernodesProcessor`, `ConstraintsPostprocessor` ([brief](T7-three-processors.md)) | typescript-pro | src/alg/layered/intermediate/{EndLabelSorter,HypernodesProcessor,ConstraintsPostprocessor}*.ts + tests | T1, T3 | [x] |

The arms stay throwing until T8, so a class test injects its class through the row's `Factories` (`createProcessor`) or a
wrapper around `IntermediateProcessorStrategy.valueOf(name).create()` that substitutes the class. The batch is done when all
four tasks pass and the README gates are green.
