<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Force models and provider; disco transform, compactor, provider

Parallel; disjoint write-sets. Neither task touches `staged-classes.json`; T10 removes every staged row.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T8 | Force models, `ForceLayoutProvider`, replay ([brief](T8-force-models.md)) | typescript-pro | src/alg/force/model/**, src/alg/force/ForceLayoutProvider.ts, src/alg/force/ForceVectors.test.ts, test/helpers/force-replay-*.ts | T5, T6 | [x] |
| T9 | Disco transform, compactor, provider, replay, twin ([brief](T9-disco-transform.md)) | typescript-pro | src/alg/disco/transform/{ElkGraphComponentsProcessor,ElkGraphTransformer}*, src/alg/disco/DisCoPolyominoCompactor*, src/alg/disco/DisCoLayoutProvider.ts, src/alg/disco/DiscoVectors.test.ts, test/helpers/disco-replay-*.ts | T7 | [x] |
