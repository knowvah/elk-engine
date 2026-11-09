<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Label metrics (G8, AD-13 exception)

**Agent:** main session · **Commit:** `test(T3): grow the label metrics table append-only`

## Context

Mission 7f2, G8 (user-approved one-time AD-13 exception), stop 20. `test/golden/refs/java/layered-label-metrics.json` holds the JVM
(AWT SansSerif 10 plain) sizes of 1,380 texts at `main` `22fcfcb`; `test/helpers/layout-test-labels.ts:5-32` reads it and throws on
a missing text. `tools/vectors/layered-label-metrics-texts.txt` is the list and `tools/vectors/layered-label-metrics-vectors.sh`
records the table (`.agent-notes/layered-pipeline.md` § "the Java test framework sizes labels before layout"). The suites that
need sizes are T13a–c, and T1's `full` rows size nothing (they do not go through the framework).

## Task

1. Gather the texts of this mission's suites: every label text in the inputs the allocated suites load (`Issue445/471/541/905`,
   `Issue871`, `LabelDummyRemoverTest`, `LabelSideSelectorTest`, `EndLabelSorterTest`, `CommentPostprocessorTest`,
   `AlternatingLayerUnzipperTest`, `PartitionTest`; the `preserve_order` models of `SortByInputModelProcessorTest`) and the
   hand-built graphs in the Java suites (`JT/intermediate/{LabelDummyRemoverTest,LabelSideSelectorTest,EndLabelSorterTest,
   CommentPostprocessorTest,AlternatingLayerUnzipperTest,PartitionTest}.java`, `JT/issues/Issue*Test.java`). A scratch script
   (`<scratchpad>/T3/`) lists texts missing from the table; node and port labels count as well as edge labels.
2. Before editing anything, record the digest: the SHA-256 of the canonical serialization (sorted keys, the file's number
   formatting) of the 1,380 existing entries, taken from `git show main:test/golden/refs/java/layered-label-metrics.json`.
3. Append the missing texts to `layered-label-metrics-texts.txt` after the existing 1,380 lines (never reordering or editing
   them) and re-record with `bash tools/vectors/layered-label-metrics-vectors.sh`.
4. `test/helpers/layout-test-labels.append-only.test.ts` (new): the first 1,380 lines of the texts file hash to the pinned
   digest of step 2, and the table's entries for those texts, serialized canonically, hash to the same digest as the old file's.
   The test also asserts that every text of the file has an entry (no zero-sized fallback) and that the first line count is 1,380.
5. If an old entry would change, or the JVM sizes a text differently than the table records: stop 20, journal, wait.
6. Journal the added-text count and the digest; a suite that later finds one more text appends it under the same test (push-forward).

## Write-set

`tools/vectors/layered-label-metrics-texts.txt`, `test/golden/refs/java/layered-label-metrics.json`,
`test/helpers/layout-test-labels.append-only.test.ts`.

## Read-set

`test/helpers/layout-test-labels.ts:1-60`, `tools/vectors/layered-label-metrics-vectors.sh`, `JT/intermediate/*Test.java` and
`JT/issues/Issue{445,471,541,871,905}Test.java` (label constructions only), `decisions.md` G8, stop 20.

## Architecture decisions

G8 (append-only, the new test proves old entries byte-identical, the refs gate allows only added keys in this file), F7 and FX8
(suites size labels before layout).

## Interface contract (consumed by T13a–c, T17)

Every text a mission-7f2 suite measures has an entry; entries of the 1,380 earlier texts are unchanged.

## Acceptance criteria

- Given the re-recorded table, when its 1,380 earlier entries are compared with `main`, then they are byte-identical (the test).
- Given `git diff main -- test/golden/refs/java/layered-label-metrics.json`, when read, then only keys were added.
- Given the texts file, when diffed against `main`, then only lines were appended.
- Given a suite text, when looked up, then it has an entry (no throw naming the text).

## Observability / Rollback

N/A — no new observable operations. Reversible (the table's growth reverts with the commit).
