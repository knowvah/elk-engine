<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Replay-alone coverage map; breadth sweep

Two parallel tasks after batch 5 with disjoint write-sets: T11 measures what the oracle rows leave untaken in the 7e
classes (main session, writes `unreached.md`); T12 adds the sweep and dump modes to the recorder and the corpus test
(java-architect).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T11 | Replay-alone coverage map ([brief](T11-coverage-map.md)) | main session | plans/layered-edge-routing/unreached.md | T10 | [x] |
| T12 | Hash sweep at the P4 and P5 stops over `$ELK_MODELS_DIR` ([brief](T12-routing-sweep.md)) | java-architect | tools/vectors/LayeredRoutingVectors.java (sweep/dump modes), tools/oracle/routing-sweep.sh, test/corpus/routing-sweep.test.ts, test/helpers/layered-routing-sweep.ts, .gitignore | T10 | [x] |

The batch is done when both tasks pass their acceptance criteria and the README gates are green; the sweep runs
alone (JVM load) and never concurrently with the coverage run.
