<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Coverage map; label sweep

Two tasks with disjoint write-sets, **in parallel**, both after the replay is green. T14 (orchestrator) measures what the row replays
alone leave unreached in the 15 classes and writes `unreached.md`, the input of T16 and T17. T15 (java-architect) adds the G7
breadth sweep to the recorder (sweep and dump modes only, the no-flag recording path stays byte-identical) and its replay test.
The sweep is the strongest evidence this mission has: exact hashes over about 217 label- and comment-bearing models in five
direction variants, stride 1 at mission end.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T14 | Replay-alone coverage map ([brief](T14-coverage-map.md)) | orchestrator (main session) | plans/layered-labels/unreached.md | T12 | [x] |
| T15 | Label sweep, G7 ([brief](T15-labels-sweep.md)) | java-architect | tools/vectors/LayeredLabelsVectors.java (sweep and dump modes only), tools/oracle/labels-sweep.sh, test/corpus/labels-sweep.test.ts, test/helpers/layered-labels-sweep.ts, .gitignore | T12 | [x] |

T14 runs coverage alone (no parallel vitest during its measurement; run it before T15's long sweep run or after, never concurrently:
timed gates and coverage reads are load-sensitive). A sweep mismatch is a port defect: diagnosis artifact, fix at origin through the
orchestrator (the classes are outside T15's write-set, stop 1). The batch is done when both pass their acceptance criteria and the
README gates are green.
