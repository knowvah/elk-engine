<!-- SPDX-License-Identifier: EPL-2.0 -->

# T20 — Site rows

**Agent:** java-architect (sonnet) · **Commit:** `test(T20): record and replay the 7g site rows`
Scratch: `$TMPDIR/7g/T20/`.

## Context

W3, W10, F12. T18's S scenarios become rows of the `sites` group in `layered-loops.json` (7f2's T16 shape). Adding a group is the
one change T1's ref may take after T1 (stop 3 forbids re-recording `full`, `models`, `scenarios`): the other three groups must stay
byte-identical, proven by a check that extracts them before and after.

## Task

1. Add the `sites` rows to `LayeredLoopsVectors.java` (≤ 5,000 lines) and re-record through `layered-loops-vectors.sh`.
2. Prove `full`, `models`, `scenarios` byte-identical (journal the check and its output).
3. `src/alg/layered/LayeredLoopsSites.test.ts` replays every `sites` row (title = row id) and asserts the TS sites each scenario
   decides are now covered (T18's "TS sites" column).

## Write-set

`tools/vectors/LayeredLoopsVectors.java`, `test/golden/refs/java/layered-loops.json` (`sites` only),
`src/alg/layered/LayeredLoopsSites.test.ts`.

## Read-set

`unreached.md` (T18), `plans/layered-labels/batch-7/T16-site-rows.md`, `src/alg/layered/LayeredSiteVectors.test.ts`, T2's helpers.

## Acceptance criteria

- Given the re-recorded ref, when the three earlier groups are compared with T1's, then they are byte-identical.
- Given every `sites` row, when replayed, then it equals the oracle at AD-4.
- Given T18's S items, when coverage is re-measured with the site rows, then each is reached or re-classified with evidence.

## Observability / Rollback

N/A. Reversible.
