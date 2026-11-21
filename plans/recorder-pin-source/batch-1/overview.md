<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: sweep before-side, then one source for the pin

Two tasks, run in order by the orchestrator. T0 must finish before T1 edits any recorder: it captures what the
unedited recorders' sweep modes produce.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T0](T0-sweep-before-side.md) | `$TMPDIR/pm96-before/`; `test/corpus/.<name>-sweep/` (gitignored); `decision-journal.md` | [x] |
| [T1](T1-pin-single-source.md) | the 41 `tools/vectors/*Vectors.java` with `ELK_COMMIT`; `tools/vectors/vector-cache.sh`; `tools/vectors/{graph,graph-json,metadata,transfer}-vectors.sh`; `test/architecture/elk-pin.fitness.test.ts`; `decision-journal.md` | [x] |

Done when both tasks' acceptance criteria hold. T0 makes no commit (journal row only, committed with T1). T1 is
committed as `chore(T1): read the pinned elk commit from tools/oracle/ELK_COMMIT` (unsigned, `-F <file>`), followed
by `docs(plans): mark batch 1 done`.
