<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Replay-alone coverage map

**Agent:** main session · **Commit:** `docs(T14): map label branches unreached by the replays`

## Context

Mission 7f2, G1, G12, F12, L4 under X5. `plans/layered-pipeline/unreached.md` is the format and
`plans/layered-pipeline/batch-7/T13-coverage-map.md` the procedure. The classes measured are the 15 of G1: `LabelDummyInserter`,
`LabelDummySwitcher` (+ `LabelDummySwitcherLabelDummyInfo`), `LabelDummyRemover`, `LabelSideSelector`, `EndLabelPreprocessor`,
`EndLabelPostprocessor`, `LabelManagementProcessor`, `CommentPreprocessor`, `CommentNodeMarginCalculator`, `CommentPostprocessor`,
`unzipping/AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`, `DotDebugUtil`, `JsonDebugUtil`, `DebugUtil`. Replay-alone means
the row replays of `LayeredLabelsVectors.test.ts` without the ported suites (X4); T13's suites may report additional reach but do not
close a branch here. Hand-offs to re-measure (G1): 7b's 43 `p2layers`/`intermediate` branches, 7c's `LongEdgeSplitter.ts:166,169`
and `SortByInputModelProcessor.ts:159`, `HyperedgeDummyMerger`'s 13 label arms.

## Task

1. Run, alone, with the log outside the reports directory and the load recorded (`uptime`):
   `npx vitest run --coverage --coverage.include='src/alg/layered/**' --coverage.exclude='**/*.test.ts' --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=<scratch>/T14 src/alg/layered/LayeredLabelsVectors.test.ts`;
   keep only the 15 classes and the hand-off sites. Re-measure the hand-offs in a run that also includes 7f's replay tests, since the
   hand-off branches were reachable only with labels.
2. Classify every untaken branch and uncovered function: **S** (a step scenario: graph, steps, expected shape, the field it decides),
   **J** (structural, unit-tested from the Java), **U** (self loops, wrapping and compaction 7g; `INCLUDE_CHILDREN` 7h; dead by
   construction with the Java line, journaled), **X** (throwing arms, stages; 7f2 has none left after T11 except the 7g/7h throws
   it reaches). Per-row runs (`-t '<row id>$'`) attribute an arm. A branch that no scenario can reach and is not provably dead
   from the Java is stop 8.
3. Write `plans/layered-labels/unreached.md` in 7f's layout: per-class table, the S list with stable ids `sites/<Class>/<name>`, the J
   list, the U list with mechanisms and Java lines, the hand-off table (each of the 43, the 3, the 13 closed or still U), totals.
   More than about 30 S scenarios is stop 9.
4. A scratch script checks the partition (every untaken branch and function in exactly one of S, J, U, X) and the hand-off counts;
   journal its output.

## Write-set

`plans/layered-labels/unreached.md`.

## Read-set

`plans/layered-pipeline/unreached.md`, `plans/layered-pipeline/batch-7/T13-coverage-map.md`, the 15 sources under `src/alg/layered/`,
the Java per branch, `decisions.md` G1, G12, F12, `.agent-notes/layered-crossing-min.md` (per-row coverage),
`.agent-notes/layered-pipeline.md` (hypernode and cancellation arms need non-obvious graphs).

## Interface contract (consumed by T16, T17a, T17b)

`unreached.md`: one row per S scenario with id, graph, steps, expected shape and the field it decides; one row per J item; one row
per U item with mechanism and Java line; the hand-off table.

## Acceptance criteria

- Given the coverage run, when filtered to the 15 classes, then every untaken branch and uncovered function appears exactly once in S, J, U or X.
- Given the S list, when counted, then at most about 30 scenarios (else stop 9).
- Given the hand-off table, when read, then each of the 43 branches, the 3 sites and the 13 `HyperedgeDummyMerger` arms is closed or U with a reason.

## Observability / Rollback

N/A (a document). Reversible.
