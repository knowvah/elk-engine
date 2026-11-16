<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Wiring, pre-approved assertions, unpinning

One task, orchestrator-reviewed: after it, `LayeredLayoutProvider.layout` runs self loops, wrapping and compaction.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T15 | Wire the 9 arms; unstage; unpin; W9's T15 changes ([brief](T15-wiring.md)) | typescript-pro | src/alg/layered/intermediate/IntermediateProcessorStrategy{Create,}.ts + test, test/architecture/{staged-classes.json,layered-entry-points.fitness.test.ts}, the six staged files' line 2, test/helpers/layered-pipeline-pinned-rows.ts, src/alg/layered/LayeredPipelineVectors.test.ts, src/alg/layered/components/ComponentsProcessor.test.ts, test/helpers/layout-test-runner.test.ts | T11, T12, T14 | [x] |
