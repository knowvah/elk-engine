<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — Loops sweep

**Agent:** java-architect (sonnet) · **Commit:** `test(T19): add the loops breadth sweep`
Scratch: `$TMPDIR/7g/T19/`.

## Context

W5. 7f2's label sweep is the shape: `LayeredLabelsVectors.java --sweep/--dump`, `tools/oracle/labels-sweep.sh [--force]`
(stamp over the oracle build, recorder source, models commit and inputs; `.agent-notes/layered-labels.md`: run `--force` after any
diagnosis-aid run), `test/corpus/labels-sweep.test.ts`, `test/helpers/layered-labels-sweep.ts`, `LABELS_SWEEP_DIR`,
`test/corpus/.labels-sweep/` (gitignored, `.gitignore:53`).

## Task

1. `--sweep <modelsDir> <outDir>` / `--dump <case id> …` in `LayeredLoopsVectors.java` (≤ 5,000 lines in total, stop 13): cases
   (a) the pipeline sweep's enumeration and (b) the label sweep's, copied with origin cited, kept only where the whole plan holds
   one of the 9 arms or `COMPACTION_CONNECTED_COMPONENTS` is on; (c) the W5 option family. Refusals only in 7h's categories.
   Canonical form and hash as 7f's sweep (raw IEEE hex); 20 s per case.
2. `tools/oracle/loops-sweep.sh [--force]` (shellcheck clean), `LOOPS_SWEEP_DIR`, `test/corpus/.loops-sweep/` added to `.gitignore`,
   `test/corpus/loops-sweep.test.ts` (skips when the dir is absent, like the label sweep), `test/helpers/layered-loops-sweep.ts`
   + test.
3. Run detached at stride 1 (`uptime` first; `nohup nice -n 10 …`; polls ≤ 9 min); journal the counts per part: (a) expected 600,
   (b) expected 105 (`SELF_LOOP_PREPROCESSOR` 75, `HORIZONTAL_COMPACTOR` 25, `COMPACTION_CONNECTED_COMPONENTS` 5); a different
   count is journaled with its mechanism. Every `ok` case hash-matches; throws equal on both sides.

## Write-set

`tools/vectors/LayeredLoopsVectors.java`, `tools/oracle/loops-sweep.sh`, `test/corpus/loops-sweep.test.ts`,
`test/helpers/layered-loops-sweep.ts` (+ test), `.gitignore`.

## Read-set

`tools/vectors/LayeredLabelsVectors.java` (`--sweep` part, `:3280-3689`), `LayeredPipelineVectors.java` (`--sweep` part),
`tools/oracle/{labels,pipeline}-sweep.sh`, `test/corpus/labels-sweep.test.ts`, `test/helpers/layered-labels-sweep.ts`,
`decisions.md` W5.

## Acceptance criteria

- Given the sweep at stride 1, when run, then every `ok` case matches, refusals are only 7h's, and the journal holds the per-part
  counts with any difference from 600/105 explained.
- Given `T1`'s ref, when the recorder is re-run after this task, then `layered-loops.json` is byte-identical.
- Given a second sweep run, when nothing changed, then the stamp hits and results are reused.

## Observability / Rollback

Stderr: per-part counts, refusals per category, timeouts. Reversible.
