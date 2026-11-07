<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Recorder, replay helpers, label metrics

Three tasks with disjoint write-sets, **in parallel**. T1 records every expectation first (AD-13, L4) with whole-plan refusal
(G2), so no row needs pinning. T2 builds the TS twin of T1's row format and ops; it consumes T1's **header contract**, not its
output, and develops against the landed 7f rows until T1 lands. T3 is the orchestrator's G8 task: it extends the label-metrics
texts list, re-records the table append-only and proves the 1,380 old entries byte-identical, before any suite needs a new text.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | Oracle recorder `LayeredLabelsVectors`, the ref, vendored inputs ([brief](T1-labels-recorder.md)) | java-architect | tools/vectors/{LayeredLabelsVectors.java,layered-labels-vectors.sh}, test/golden/refs/java/layered-labels.json, test/golden/inputs/**, test/golden/inputs/manifest.json, test/golden/algorithm-refs.test.ts | — | [x] |
| T2  | Labels replay helpers, G3 comparator, G6 manager twin ([brief](T2-labels-replay-helpers.md)) | typescript-pro | test/helpers/layered-labels-replay-{rows,ops,logged}.ts + tests | — | [x] |
| T3  | Label metrics, G8 ([brief](T3-label-metrics.md)) | orchestrator (main session) | tools/vectors/layered-label-metrics-texts.txt, test/golden/refs/java/layered-label-metrics.json, test/helpers/layout-test-labels.append-only.test.ts | — | [x] |

T1 and T3 both touch a file under `test/golden/refs/java/`, but different files. `algorithm-refs.test.ts` is T1's alone; T3
does not touch the refs gate list (the gate for the metrics file is a test T3 adds, G8). The batch is done when all three pass
their acceptance criteria and the README gates are green. Agents never run `npm run coverage` and never commit; the
orchestrator commits per task.
