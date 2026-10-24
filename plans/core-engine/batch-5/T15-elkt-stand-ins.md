<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Retire the `.elkt` mission-5 stand-ins

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T15): validate elkt models against the real core algorithms`

## Context
G3 (4b) validated models naming `fixed`/`box`/`random` against stand-in registrations
(`test/helpers/mission5-stand-ins.ts`) and skipped the 11 `@deferred mission5` rows of
`test/golden/refs/java/graph-text-validate.json`. T8/T10/T12 registered the real algorithms and shrank the stand-ins
to nothing. M7: the rows must replay unchanged against the real registry; the vector file is not edited.

## Task
1. `src/graph/text/validation/ElkGraphValidator.test.ts`: drop the `MISSION5_ALGORITHMS` import and filter, the
   "filter is still needed" tripwire, the stand-in `describe`; replay every row (deferred ones included) through the
   normal path. Keep every other assertion.
2. `test/corpus/elkt-sweep.test.ts`: remove `withMission5StandIns`, `MISSION5_ALGORITHM_VALUE`, the stand-in
   selection; every model validates against the plain registry. Expected counts stay as recorded (validate-equal
   898/898 per the roadmap's 2026-10-15 note) — if a count would change, stop 4.
3. Delete `test/helpers/mission5-stand-ins.ts`.
4. If any of the 11 rows differs, dump expected vs actual and apply M7 (regenerate only when traced to registry
   state, by `tools/vectors/elkt-vectors.sh`, journaled; otherwise stop 4).

## Write-set
`src/graph/text/validation/ElkGraphValidator.test.ts`, `test/corpus/elkt-sweep.test.ts`,
`test/helpers/mission5-stand-ins.ts` (delete).

## Read-set
`ElkGraphValidator.test.ts:40-80,195-276`, `elkt-sweep.test.ts:1-70,200-230`, `test/helpers/mission5-stand-ins.ts`,
`plans/graph-text/decisions.md` (G3), `plans/core-engine/decisions.md#m7--registry-growth-and-vectors`.

## Acceptance criteria
- Given the 11 rows formerly tagged `mission5`, when replayed, then each equals its JVM vector.
- `grep -rn "mission5\|MISSION5" src test --include=*.ts` returns only `JsonMetaDataConverter.test.ts` (T18) and the
  vector/scenario data files.
- The elkt sweep test passes with the recorded counts (skips cleanly when `$ELK_MODELS_DIR` is absent).

## Observability / Rollback
N/A. Reversible: revert the commit.
