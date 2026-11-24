<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: append four label texts to the metrics table (ruling item 2, D5)

## Context

Under the default measurer, the runner's `ensureSensibleLabelSize` (`test/helpers/layout-test-labels.ts`) looks every
label text up in `test/golden/refs/java/layered-label-metrics.json`. If a text is missing, it throws before layout.
`665_includeChildrenDoesntStop.elkt` and `hierarchicalLayoutMixing.elkt` need four texts that the table lacks. G8 keeps
the table append-only, and `test/helpers/layout-test-labels.append-only.test.ts` enforces it.

## Read-set

`tools/vectors/LayeredLabelMetricsVectors.java`, `tools/vectors/layered-label-metrics-vectors.sh`,
`test/helpers/layout-test-labels.append-only.test.ts`, issue #58 (body, item 2).

## Write-set

- `tools/vectors/layered-label-metrics-texts.txt`: append four lines at the end, in this order: `insideOtherLayout`,
  `child1`, `child2`, `insideOtherDirection`.
- `test/golden/refs/java/layered-label-metrics.json`: replaced by the recorder's output, after the checks below.

## Steps

1. `java -version` gives 21.0.1 and `uname -m` gives `arm64` (reference platform, #52). Otherwise halt.
2. Append the four texts. Run `tools/vectors/layered-label-metrics-vectors.sh "$TMPDIR/layered-stress-cases/metrics"`.
   It is JDK only and headless, takes seconds, and needs no load check.
3. `diff test/golden/refs/java/layered-label-metrics.json "$TMPDIR/layered-stress-cases/metrics/layered-label-metrics.json"`.
   The diff must show only the old last entry gaining a `,` and the four new lines, with the D5 values. Anything else is
   stop 1.
4. Copy the output over the ref. Journal the full diff (or its line count and the four lines) as a ref change, with the
   ruling as authority (#58 item 2, precedent G8) and the count correction (2,317 old entries, not 2,258).

## Acceptance criteria

- Given the appended texts file, when the recorder runs on JDK 21.0.1 arm64, then the four entries are exactly
  `[89.0, 11.77734375]`, `[29.0, 11.77734375]`, `[29.0, 11.77734375]`, `[101.0, 11.77734375]`.
- Given the new ref, when `npx vitest run test/helpers/layout-test-labels.append-only.test.ts` runs, then all three
  cases pass with no edit to that test.
- Given `git diff --stat test/golden/refs/`, then only `layered-label-metrics.json` changes, with +5/−1 lines.

## Interface contract (consumed by T4)

`sizes` has keys `insideOtherLayout`, `child1`, `child2` and `insideOtherDirection`, so the default measurer resolves
every label of the two models.

## Observability

N/A (test data). Evidence: the diff and the recorder's `jdk` field, in the journal.

## Rollback

Reversible: revert the commit. The append-only test pins the old entries.
