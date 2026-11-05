<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Replay-alone coverage map; breadth sweep

T13 is a main-session measurement, run alone; T14 builds and runs the sweep. They do not share a write-set, but T13's coverage run must not overlap T14's JVM jobs.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T13 | Replay-alone coverage map ([brief](T13-coverage-map.md)) | main session | plans/layered-pipeline/unreached.md | T9, T10 | [x] |
| T14 | Hash sweep and cross-check ([brief](T14-pipeline-sweep.md)) | java-architect | tools/vectors/LayeredPipelineVectors.java (sweep and dump modes only), tools/oracle/pipeline-sweep.sh, test/corpus/pipeline-sweep.test.ts, test/helpers/layered-pipeline-sweep.ts, .gitignore | T9 | [x] |

The batch is done when `unreached.md` partitions every untaken branch and the sweep matches at stride 1.
