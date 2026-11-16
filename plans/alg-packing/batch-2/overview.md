<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Rectpacking util; spore model and phases; topdownpacking whole

Parallel; disjoint write-sets.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T6 | Rectpacking `util`, `InternalProperties`, `RectPackingLayoutPhases` ([brief](T6-rectpacking-util.md)) | typescript-pro | src/alg/rectpacking/{util/**,options/InternalProperties.ts,RectPackingLayoutPhases.ts}, test/helpers/rectpacking-replay-*.ts | T1, T5 | [x] |
| T7 | Spore graph, importer and the three phases ([brief](T7-spore-model.md)) | typescript-pro | src/alg/spore/{graph/**,IGraphImporter.ts,ElkGraphImporter*,SPOrEPhases.ts,p1structure/**,p2processingorder/**,p3execution/**}, test/helpers/spore-replay-*.ts | T2, T5 | [x] |
| T8 | Topdownpacking whole, `GridElkNode`, guard registry, three suites ([brief](T8-topdownpacking.md)) | typescript-pro (opus) | src/alg/topdownpacking/**, src/graph/ElkGraphPackage{,.test}.ts, test/helpers/topdownpacking-replay-*.ts | T3, T5 | [x] |

T8 also unstages `TopdownpackingLayoutProvider` and the topdownpacking enums and removes their rows.
