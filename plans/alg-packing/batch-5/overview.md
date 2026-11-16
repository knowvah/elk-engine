<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Goldens test, sweep, hand-offs; recursion and coverage

Parallel; disjoint write-sets (T13 writes under `test/golden/` and `tools/corpus/`; T14 under `src/` and `plans/alg-packing/unreached.md`).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T13 | Packing goldens test, sweep, 8a/8b hand-offs ([brief](T13-goldens-sweep.md)) | typescript-pro | test/golden/packing-goldens.test.ts, test/golden/force-disco-goldens.test.ts (registration + row removal), tools/corpus/ts-layout-compare.ts, test/corpus/ts-layout-compare.test.ts | T4, T8, T11, T12 | [x] |
| T14 | Recursion probes (PK6), coverage closure, `unreached.md` ([brief](T14-recursion-coverage.md)) | typescript-pro | src/alg/{rectpacking,spore,topdownpacking}/**/*.test.ts (new files), any AC6 conversion (src/alg/spore/p2processingorder, p3execution, src/alg/common/spore/DepthFirstCompaction.ts), plans/alg-packing/unreached.md | T8, T11, T12 | [x] |
