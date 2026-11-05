<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Replay every row; the four ptolemy goldens

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T9): replay layered pipeline rows and the ptolemy goldens`
Scratch: a private subdirectory `<scratchpad>/T9/`.

**Rules (F16).** Every behavioural literal is an oracle row or a twin comparison; a hand-derived expectation is stop 3. Never
change a row, the comparator or a tolerance to get green.

## Context

Mission 7f, F3, F4, F14. This is the first time a full layout runs in TS, so expect real defects. Each mismatch gets the diagnosis
artifact (mechanism, origin `file:line`, causal chain, ruled out), journaled, with the fix at origin inside the 7f write-sets; a cause
outside them is stop 17. `src/alg/layered/LayeredRoutingVectors.test.ts` is the row-test pattern, `test/golden/layout-goldens.test.ts` the golden pattern.

## Task

1. `src/alg/layered/LayeredPipelineVectors.test.ts`: every row of `layered-pipeline.json`, one `it` per row: `full` through
   `runFullRow`/`compareFullRow`; `models` through `runStopRow`; `scenarios` and `sites` through the step interpreter with the real
   factories. Counts from `rowCounts`, unique ids. Under 30 s alone (stop 11).
2. `test/golden/layered-goldens.test.ts`: the four entries of `test/corpus/manifest.json`: read the input, lay out with the engine, export
   with `exportLikeOracle`, `compareLayout` against `test/golden/refs/elk/<id>.json` at AD-4. Never regenerates a ref.
3. A red row that needs a fix in a 7f class: T9 owns the fix if the class's owning task is done (journal the write-set extension); fix at origin,
   no compensating change.
4. Report row counts per family, slowest ten rows and any row a fix changed.

## Write-set

`src/alg/layered/LayeredPipelineVectors.test.ts`, `test/golden/layered-goldens.test.ts`, fixes in the 7f classes of T4–T8 (journaled).

## Read-set

`src/alg/layered/LayeredRoutingVectors.test.ts`, `test/golden/layout-goldens.test.ts`, `test/golden/oracle-refs.test.ts:1-20`, `test/helpers/layered-pipeline-replay-*.ts`,
`tools/vectors/LayeredPipelineVectors.java` (the `--dump` aid), `decisions.md` F3, F4, F14, F16.

## Interface contract (consumed by T13, T16)

The `full`-row test titles equal the row ids, so `-t '<row id>'` isolates one row for per-row coverage.

## Acceptance criteria

- Given `layered-pipeline.json`, when replayed, then every row passes at AD-4 and the counts equal `rowCounts`.
- Given the four goldens, when laid out, then each equals its `refs/elk` file at AD-4.
- Given `git status`, when inspected, then no landed ref changed.
- Given the file alone, when timed at normal load, then at most 30 s.

## Observability / Rollback

The journal row per fix is the record. Reversible.
