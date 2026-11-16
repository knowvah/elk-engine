<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — radial compactors and overlap removal

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port radial compaction and overlap removal`
Scratch: `$TMPDIR/alg-trees/T10/`

## Context

Mission 8a, TR3, TR7, TR9. `R/intermediate/compaction/{GeneralCompactor,AbstractRadiusExtensionCompaction,RadialCompaction,AnnulusWedgeCompaction}`
(649 lines; `AnnulusWedgeCompaction` contours are identity `HashMultimap`s, any-match only, `:174-182`) and
`R/intermediate/overlaps/RadiusExtensionOverlapRemoval` (104; I30 at `:79-93`, the discarded `sorter.sort` copy at `:91`, recursion
`extend :57`). All but `AbstractRadiusExtensionCompaction` are T5 staged files: replace bodies, keep marker and row.

## Task

1. Port the five classes whole. Contours: `LinkedHashMultimap.create(identity, identity)` (W6 precedent). Keep the discarded sort.
2. I30 twin: a test-only switch (the 7h H3 shape) that iterates `getNextLevelNodeSet` in reversed insertion order; run every T2 row
   reaching `RadiusExtensionOverlapRemoval` both ways and record per row whether the result differs (observable) or not. Journal
   the counts (`ad10`). A row where Java order matches the oracle and reversed does not is the expected outcome; a row where neither
   matches is stop 14.
3. Tests: each compactor and the overlap removal from the stop before to the stop after it, for every T2 row that runs it.

## Write-set

`src/alg/radial/intermediate/compaction/**`, `src/alg/radial/intermediate/overlaps/RadiusExtensionOverlapRemoval{,.test}.ts`.

## Read-set

The Java files above, `src/guava/LinkedHashMultimap.ts`, `src/alg/layered/intermediate/compaction/NetworkSimplexCompaction.ts:185-195`
(identity strategies), `test/helpers/layered-compound-replay-sites.ts` (twin switch shape), T7's helpers and `RadialUtil`,
`decisions.md` TR3.

## Interface contract (consumed by T13)

The five classes with Java signatures (`compact`, `removeOverlaps`, `extend`, `process`).

## Acceptance criteria

- Given every T2 row reaching a compactor or the overlap removal, when the step runs on the recorded "before" state, then the
  "after" stop equals the row at 1e-6.
- Given the I30 twin, then the journal states how many rows reach the site and how many are order-observable.
- Given the replaced staged files, then marker and row remain and the staged fitness test passes.

## Observability / Rollback

N/A — no new observable operations. Reversible.
