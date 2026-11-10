<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Recorder, replay helpers, `compaction.oned`, `recthull`

Four tasks with disjoint write-sets, **in parallel**. T1 records every expectation first (AD-13, L4) with whole-plan refusal
(W3), so no row needs pinning. T2 builds the TS twin of T1's row format and the `processor` op; it consumes T1's **header
contract**, not its output, and develops against the landed 7f2 rows until T1 lands. T3 and T4 port two leaf packages whose
suites carry the Java's own literals (W8), so they need no oracle row.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | Oracle recorder `LayeredLoopsVectors`, the ref, vendored inputs ([brief](T1-loops-recorder.md)) | java-architect | tools/vectors/{LayeredLoopsVectors.java,layered-loops-vectors.sh}, test/golden/refs/java/layered-loops.json, test/golden/inputs/loops/**, test/golden/inputs/manifest.json, test/golden/algorithm-refs.test.ts | — | [x] |
| T2  | Loops replay helpers and the `processor` op twin ([brief](T2-loops-replay-helpers.md)) | typescript-pro | test/helpers/layered-loops-replay-{rows,ops}.ts + tests | — | [x] |
| T3  | `compaction/oned` and `oned/algs` + `CompactionTest` ([brief](T3-compaction-oned.md)) | typescript-pro | src/alg/layered/compaction/oned/** | — | [x] |
| T4  | `compaction/recthull` + `RectlinearConvexHullTest` ([brief](T4-recthull.md)) | typescript-pro | src/alg/layered/compaction/recthull/** | — | [x] |

The batch is done when all four pass their acceptance criteria and the README gates are green. Agents never run
`npm run coverage` and never commit; the orchestrator commits per task.
