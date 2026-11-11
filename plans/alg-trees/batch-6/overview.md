<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — mrtree wiring, replay, JUnit

One task after batch 5: it is the only writer of `tools/melk/config.ts` and `staged-classes.json` in the batch.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T17 | `MrTree`, `TreeLayoutProvider`, unstaging, wiring, replay, `MrTreeGraphSizeTest` ([brief](T17-mrtree-wiring.md)) | typescript-pro | src/alg/mrtree/{MrTree,TreeLayoutProvider,MrTreeVectors.test,MrTreeGraphSizeTest.test}*, src/alg/mrtree/options/** (regenerated), the 15 mrtree staged markers, tools/melk/config.ts, test/architecture/staged-classes.json, test/melk/mrtree-options.test.ts | T15, T16 | [x] |
