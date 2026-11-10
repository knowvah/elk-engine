<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Self-loop processors

One task after batch 4.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T14 | `SelfLoopPreProcessor`, `SelfLoopPortRestorer`, `SelfLoopRouter`, `SelfLoopPostProcessor`, `DummySelfLoopProcessor` + `SelfLoopPreprocessorTest` ([brief](T14-self-loop-processors.md)) | typescript-pro | src/alg/layered/intermediate/{SelfLoopPreProcessor,SelfLoopPortRestorer,SelfLoopRouter,SelfLoopPostProcessor,DummySelfLoopProcessor}*.ts + tests, SelfLoopPreprocessorTest.test.ts | T13 | [x] |
