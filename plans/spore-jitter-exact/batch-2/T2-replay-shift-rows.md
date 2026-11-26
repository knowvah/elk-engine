<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: port replay of the `shift` rows

**Agent:** orchestrator (optionally one `claude` opus subagent). **Budget:** 40 min.

## Context

The rows helper rejects unknown groups (`checkRow`) and checks `rowCounts` per group in `SPORE_ROW_GROUPS`
(`test/helpers/spore-replay-rows.ts:43, 295-328`). The stops replay already compares every stop through the real providers
(`SporeLayoutVectors.test.ts`, the stops `describe`) and the importer stops (`ElkGraphImporter.test.ts:59-86`).

## Task

1. `spore-replay-rows.ts`: `'shift'` after `'jitter'` in `SPORE_ROW_GROUPS`; a `ShiftRow` type (stops shape, group
   `shift`); a `loadSporeRows('shift')` overload; `checkRow` validates `shift` with `checkStops`. Update the header comment.
2. Write the new `describe` blocks first and see them fail on a ref without `shift` rows (the count test), then green on T1's
   ref (D4):
   - `SporeLayoutVectors.test.ts`: "spore providers: shift rows (the seeded shift, exact)": count 4; per row, step sequence and
     every stop equal at AD-4; `result.dump` equals the `end` stop's dump fields; `jitterNodes` equals the row and is > 0;
     tie summary equals `tieOrder`.
   - `ElkGraphImporter.test.ts`: "ElkGraphImporter: shift rows (underlying, import, update, end)": the importer stops equal the
     port dump, `jitterNodes` equals the row, and at least `jitterNodes` `import` vertices differ from their child's centre.
   Update both files' header comments.
3. Run with `SPORE_REPORT=1` and journal the raw-bit tally of the full replay file (before T1's rows and after, so the new
   rows' share is known).
4. Any difference is stop 2: diagnose before any change.
5. Batch gates of the README; commit `test(spore): replay the exact shift rows` (or fold into T1's commit per T1 step 7).

## Write-set

`test/helpers/spore-replay-rows.ts`, `src/alg/spore/SporeLayoutVectors.test.ts`, `src/alg/spore/ElkGraphImporter.test.ts`;
under stop 2 only, the origin file in `src/alg/spore/` or `src/java/util/Random.ts`.

## Read-set

`test/helpers/spore-replay-rows.ts`, `test/helpers/spore-replay-dump.ts:290-400`, `test/helpers/spore-replay-providers.ts:110-230,
430-464`, `src/alg/spore/SporeLayoutVectors.test.ts`, `src/alg/spore/ElkGraphImporter.test.ts:1-120`,
`src/alg/spore/ElkGraphImporter.ts` (the shift).

## Interface contract

Consumes T1's row shape (see [T1](../batch-1/T1-recorder-shift-group.md#interface-contract-consumed-by-t2)).

## Acceptance criteria

- Given the regenerated ref, when `loadSporeRows('shift')` runs, then it returns 4 rows and `parseSporeFile` accepts the header.
- Given each `shift` row, when the providers replay it, then every stop and the end dump equal the row at AD-4 and
  `jitterNodes` > 0.
- Given the landed spore replays, when the batch gate runs, then every landed test passes unchanged (19 files plus 0 new).

**Observability:** N/A. **Rollback:** Reversible (revert the commit).
