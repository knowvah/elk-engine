<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: lane `src/alg/layered/intermediate/**`

## Context

Issue #46 item 1, call-site half, the largest lane. Expected work at planning: the 10 variant-B order site blocks
(`intermediate/preserveorder/`, `intermediate/greedyswitch/`), the order-dispatch `factories` of seven `*Test.test.ts`
files, and the groups `fdf72abd`, `d8ceccce`, `34aa9fa0`, `a1b507d8`, `62bee9f6`, `dee0be9a`, `301abb6a`, `64ce4644`,
`6f92a0f5`, `742591f7`, `35c4b805` where their sites are in this directory and T1 kept the group. The seven
`SITE_FACTORIES = { ...factories, … }` blocks stay (D1). Decisions
[D1](../decisions.md#d1-move-identical-code-only-never-substitute-a-broader-helper),
[D2](../decisions.md#d2-one-order-site-row-replay-helper).

## Write-set

- Only the `*.test.ts` files under `src/alg/layered/intermediate/` that `inventory.md` maps to an export

## Read-set

- `inventory.md` rows for lane `T6`; the T1 helpers
- Each file in the write-set, around the mapped line

## Steps

1. `npx vitest run src/alg/layered/intermediate --reporter=json --outputFile.json=$TMPDIR/t6-before.json`.
2. Per mapped object: delete the local object (and a variant-B `SITE_ROWS_FILE`/`siteRows`/`replaySite` block mapped to
   `replayOrderSite`), import the export, rename uses if needed. Where a file's remaining local object spreads or
   references the removed one (`{ ...factories }`), point it at the import; do not change its own body otherwise.
   Remove unused imports and constants. Touch nothing else.
3. Rerun step 1 to `t6-after.json`; per file, counts, titles and statuses must match.
4. `npm run typecheck`; `npx prettier --check` the changed files.
5. Report as T5 does.

## Acceptance criteria

- Given each mapped row, when the lane ends, then the file imports the export and holds no local copy.
- Given `t6-before.json` and `t6-after.json`, when compared per file, then counts, titles and statuses are equal.
- Given `git diff`, when filtered to lines containing `expect`, then the only changes are whole objects that moved to a
  helper with their `expect` (D1), each named in the report.

## Observability / rollback

N/A — test code only. Reversible.
