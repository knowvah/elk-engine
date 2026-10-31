<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Replay-alone coverage map; breadth sweep

Two independent tasks after T8 (7b's batch 4). T10 may slip without blocking batch 7; its JVM sweep never runs while
a gate is measured.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | Replay-alone coverage map ([brief](T9-coverage-map.md)) | main session | plans/layered-crossing-min/unreached.md | T8 | [x] |
| T10 | Hash sweep at the P3 stop over `$ELK_MODELS_DIR` ([brief](T10-order-sweep.md)) | java-architect | tools/vectors/LayeredOrderVectors.java (`--sweep`, `--dump`), tools/oracle/order-sweep.sh, test/corpus/order-sweep.test.ts, test/helpers/layered-order-sweep.ts, .gitignore | T8 | [x] |
