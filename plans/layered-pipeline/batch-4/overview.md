<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Replay every row; goldens; SC4 re-replay

Two parallel tasks with disjoint write-sets, both through the real driver. A mismatch is first a port defect: diagnose with
the oracle's dump to where the port first departs; stops 17 and 20 cover what lies outside the write-sets.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | Replay `layered-pipeline.json`; the four ptolemy goldens ([brief](T9-replay-and-goldens.md)) | typescript-pro | src/alg/layered/LayeredPipelineVectors.test.ts, test/golden/layered-goldens.test.ts | T8 | [x] |
| T10 | SC4 re-replay of the landed `models/*` rows ([brief](T10-sc4-replay.md)) | typescript-pro | src/alg/layered/LayeredPipelineReplay.test.ts | T8 | [x] |

The batch is done when both pass, each file runs in at most 30 s alone (stop 11), and the README gates are green.
