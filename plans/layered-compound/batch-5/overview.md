<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Replay every row with H3 twins; layered golden test

Two tasks with disjoint write-sets run **in parallel**, after T8. T9 replays the whole new ref through the real pipeline and
settles every H3 container with its twin. T10 adds the TS test of T3's 24 goldens.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | `LayeredCompoundVectors.test.ts`, twins, the C3 re-measure ([brief](T9-replay.md)) | typescript-pro | src/alg/layered/LayeredCompound{Vectors,Twins}.test.ts | T8 | [x] |
| T10 | `test/golden/layered-hierarchy-goldens.test.ts` ([brief](T10-golden-test.md)) | typescript-pro | test/golden/layered-hierarchy-goldens.test.ts | T3, T8 | [x] |
