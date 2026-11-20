<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: lane `src/alg/layered/p3order/**`

## Context

Issue #46 item 1, call-site half. T1 wrote the shared helpers and [inventory.md](../inventory.md); this lane applies
the rows whose lane is `T5`. Expected work at planning: the 13 variant-A order site blocks (9 in `p3order/`, 4 in
`p3order/counting/`), the order-dispatch `factories` of `BasicCrossingMinimizationTest`, `ForsterConstraintResolverTest`,
`ModelOrderBarycenterHeuristicTest`, and the groups `bcf91161`, `e64a9807` where T1 kept them. Decisions
[D1](../decisions.md#d1-move-identical-code-only-never-substitute-a-broader-helper),
[D2](../decisions.md#d2-one-order-site-row-replay-helper).

## Write-set

- Only the `*.test.ts` files under `src/alg/layered/p3order/` that `inventory.md` maps to an export

## Read-set

- `inventory.md` rows for lane `T5`; the T1 helpers (`test/helpers/layered-replay-factories*.ts`,
  `test/helpers/layered-order-site-replay.ts`)
- Each file in the write-set, around the mapped line

## Steps

1. `npx vitest run src/alg/layered/p3order --reporter=json --outputFile.json=$TMPDIR/t5-before.json`.
2. Per mapped object: delete the local object (and a `SITE_ROWS`/`replaySite` block mapped to `replayOrderSite`),
   import the export, rename uses if the export's name differs (`replaySite(...)` → `replayOrderSite(...)` is a
   call-site rename, not an assertion change). Remove imports the file no longer uses. Touch nothing else.
3. Rerun step 1 to `t5-after.json`; per file, counts, titles and statuses must match.
4. `npm run typecheck`; `npx prettier --check` the changed files.
5. Report: files changed, inventory rows done, the before/after comparison, any row you could not apply and why.

## Acceptance criteria

- Given each mapped row, when the lane ends, then the file imports the export and holds no local copy.
- Given `t5-before.json` and `t5-after.json`, when compared per file, then counts, titles and statuses are equal.
- Given `git diff`, when filtered to lines containing `expect`, then nothing changed.

## Observability / rollback

N/A — test code only. Reversible.
