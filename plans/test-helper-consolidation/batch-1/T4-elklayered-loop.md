<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: remove `ElkLayered.test.ts`'s duplicated 199-row loop

## Context

Issue #46 item 5. `src/alg/layered/ElkLayered.test.ts:56-61` runs `compareFullRow(runFullRow(row), row)` over the 199
`full` rows of `layered-pipeline.json`; `src/alg/layered/LayeredPipelineVectors.test.ts:136-147` runs the same call on
the same rows. Decision [D5](../decisions.md#d5-elklayeredtestts-drops-its-199-row-iteach) holds the proof.

## Write-set

- Modify `src/alg/layered/ElkLayered.test.ts` only

## Read-set

- `src/alg/layered/ElkLayered.test.ts:1-62`; `src/alg/layered/LayeredPipelineVectors.test.ts:57-159`
- `test/helpers/layered-pipeline-replay-rows.ts:130-136`; `test/helpers/layered-pipeline-replay-ops.ts:170-180`;
  `test/golden/compare-json.ts:160-175`

## Steps

1. Re-check D5's four facts at the current tree; write each as one line with its `file:line` in the report. If one
   fails: stop 6, change nothing.
2. Record the counts of both files (`npx vitest run src/alg/layered/ElkLayered.test.ts
   src/alg/layered/LayeredPipelineVectors.test.ts`) and confirm the vectors file's `full rows` group lists all 199 ids
   that the `ElkLayered` loop lists (compare the two title sets from `--reporter=json`).
3. Delete the `it.each` block (`:56-61`) and only that; keep `finds the 199 full rows` and `fullRows`. Remove imports
   the file no longer uses (`compareFullRow`, `runFullRow`, `FullRow` if unused).
4. Rerun step 2: `ElkLayered.test.ts` −199, the vectors file unchanged.
5. `npm run typecheck`; `npx prettier --check src/alg/layered/ElkLayered.test.ts`.

## Acceptance criteria

- Given the two files' JSON reports, when the 199 `ElkLayered` row ids are compared with the vectors file's `full rows`
  titles, then the sets are equal and all pass.
- Given the edit, when `ElkLayered.test.ts` runs, then it has exactly 199 fewer cases and `finds the 199 full rows`
  still passes.
- Given `git diff`, when inspected, then only the loop and now-unused imports are gone.

## Observability / rollback

N/A — test code only. Reversible.
