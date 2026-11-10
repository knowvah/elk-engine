<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Loops model, cut heuristics, intermediate compaction, `compaction.components`

Four ports with disjoint write-sets, **in parallel**, after batch 1 (T1's rows exist; T2's loaders and injected factories;
T3 and T4 for T8). Staged files keep their `// @staged 7g` marker and registry row until T15 (W13), so the enum arms still throw
and the suite stays green.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T5  | Loops model + `SelfLoopHolderTest` + `SelfLoopTestGraphCreator` ([brief](T5-loops-model.md)) | typescript-pro | src/alg/layered/intermediate/loops/{SelfLoopType,SelfLoopEdge,SelfLoopPort,SelfLoopHolder,SelfHyperLoop,SelfHyperLoopLabels}*.ts + tests, test/helpers/SelfLoopTestGraphCreator.ts | T1, T2 | [x] |
| T6  | Wrapping cut heuristics and graph statistics ([brief](T6-cut-heuristics.md)) | typescript-pro | src/alg/layered/intermediate/wrapping/{GraphStats,ICutIndexCalculator,ARDCutIndexHeuristic,MSDCutIndexHeuristic,CuttingUtils}*.ts + tests | T1, T2 | [x] |
| T7  | `intermediate/compaction` with `HorizontalGraphCompactor` ([brief](T7-intermediate-compaction.md)) | typescript-pro | src/alg/layered/intermediate/compaction/** | T1, T2 | [x] |
| T8  | `compaction/components` ([brief](T8-compaction-components.md)) | typescript-pro | src/alg/layered/compaction/components/** | T3, T4 | [x] |

Agents never run `npm run coverage` and never commit; the orchestrator commits per task and runs the README gates after the batch.
