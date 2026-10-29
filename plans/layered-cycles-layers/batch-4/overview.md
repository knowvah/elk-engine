<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Replay-alone coverage map; breadth sweep

Two independent tasks after T8. T9 (main session) measures what the replays leave untaken (L4/X5, B7) and plans the
site rows; T10 (java-architect, resuming T1's agent) gives 7b the breadth of the Java tests over all 550 ptolemy
models, locally (B6). T10 may slip without blocking batch 5.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | Replay-alone coverage map ([brief](T9-coverage-map.md)) | main session | plans/layered-cycles-layers/unreached.md | T8 | [x] |
| T10 | Hash sweep over `$ELK_MODELS_DIR` ([brief](T10-phase-sweep.md)) | java-architect (resume T1) | tools/vectors/LayeredPhaseVectors.java (`--sweep`, `--dump`), tools/oracle/phase-sweep.sh, test/corpus/phase-sweep.test.ts, .gitignore | T8 | [x] |
