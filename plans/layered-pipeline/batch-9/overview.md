<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 9 — Anchored unit tests

Two parallel tasks with disjoint write-sets, on T15's rows.

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T16a | Anchored tests: components and driver ([brief](T16a-components-driver-tests.md)) | typescript-pro | src/alg/layered/components/**/*.test.ts, src/alg/layered/{ElkLayered,GraphConfigurator}*.test.ts | T15 | [x] |
| T16b | Anchored tests: processors ([brief](T16b-processor-tests.md)) | typescript-pro | src/alg/layered/intermediate/{GraphTransformer,HierarchicalPortOrthogonalEdgeRouter,EndLabelSorter,HypernodesProcessor,ConstraintsPostprocessor}*.test.ts | T15 | [x] |

The batch is done when the mutation checks bite and coverage is 90/90/90/90, shortfalls U-explained (stop 10).
