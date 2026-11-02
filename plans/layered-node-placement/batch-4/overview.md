<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Replay-alone coverage map; breadth sweep

Two parallel tasks after batch 3 with disjoint write-sets. T9 measures which branches of the 7d classes the row
replay leaves untaken and classifies them (the input of T11 and T12); T10 proves the breadth of the Java test over
every ptolemy model at the P4 stop by hashing the oracle's output and the port's.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | Replay-alone coverage map ([brief](T9-coverage-map.md)) | main session | plans/layered-node-placement/unreached.md | T8 | [x] |
| T10 | Hash sweep at the P4 stop over `$ELK_MODELS_DIR` ([brief](T10-placement-sweep.md)) | java-architect | tools/vectors/LayeredPlacementVectors.java (sweep/dump modes), tools/oracle/placement-sweep.sh, test/corpus/placement-sweep.test.ts, test/helpers/layered-placement-sweep.ts, .gitignore | T8 | [x] |

The batch is done when `unreached.md` lists every untaken branch exactly once (at most about 25 S scenarios, else
stop 9), the sweep's `ok` cases all match at stride 2, and the README gates are green. T10 never runs
`npm run coverage` and never commits; T9 runs its coverage command alone (never concurrently with the sweep's JVM).
