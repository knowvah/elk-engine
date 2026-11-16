<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Log shim; force model and importer; disco model and polyomino

Parallel; disjoint write-sets.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T5 | Full-domain `JavaMath.log` ([brief](T5-java-log.md)) | typescript-pro | src/java/lang/JavaMath{,.test}.ts, src/java/util/Random{,.test}.ts (only if it keeps its tests) | T1 | [x] |
| T6 | Force graph, importer, components, `ForceImportTest` ([brief](T6-force-model.md)) | typescript-pro | src/alg/force/{graph/**,options/InternalProperties.ts,IGraphImporter.ts,ElkGraphImporter*,ComponentsProcessor*,ForceImportTest.test.ts}, test/helpers/force-replay-*.ts | T1, T4 | [x] |
| T7 | Disco graph, polyomino, `TwoBitGridTest` ([brief](T7-disco-model.md)) | typescript-pro | src/alg/disco/{graph/**,structures/**,ICompactor.ts,transform/IGraphTransformer.ts,TwoBitGridTest.test.ts}, test/helpers/disco-replay-*.ts | T2, T4 | [x] |
