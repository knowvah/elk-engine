<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: restore the ten sites; census of what fires

## Context

#127 items 2-3 (the restoration half). [D5](../decisions.md#d5-site-restoration-follows-dev-assert-d5) gives each
site's form. The census is the authority batch 2 works from: which tests fire which site, and from which runner.

## Write-set

- The ten site files of the README table (only the omission comment → `devAssert` line, plus #123's `lastValue` and
  the `devAssert` import where the file lacks it)
- `plans/dev-assert-restore/census.md` (new)

## Read-set

Each site at the line the inventory names (`plans/dev-assert/inventory.md` rows 9, 12, 13, 21, 22, 23, 32, 40, 116,
123) and its Java line under `~/git/knowvah/elk/plugins/…` (the bundles named in the table); `src/java/lang/DevAssert.ts`;
the row tables of #112 (row #32 only) and #113.

## Steps

1. Restore the ten sites per D5. Typecheck; `npm run complexity` (a split follows dev-assert D5.6).
2. Run the full suite with assertions on, sweeps off (README gate env), detached, with
   `--reporter=json --outputFile.json=$TMPDIR/census-127.json`. Do not wrap anything yet.
3. From the JSON, list every failing test (file, full title) and the site its `AssertionError` stack names (first
   `src/` frame). For each #32 failure also record the innermost `test/helpers/` frame that holds the laid-out root
   (D3). Compare with the expected sets: #112's 170 tests in 12 files for #32 (with the per-file counts of #112's
   table), and #113's tests and rows for the other nine.
4. Write `census.md`: one table per site (`file | test | runner frame`), per-file totals, and an "outside the ruled
   set" section. Anything in that section is stop 4 for that site (it does not block the rest of batch 2).
5. Journal totals (failed, passed, skipped) and the comparison. Commit `refactor: restore ten java asserts as
   devassert` (temporary history; the squash removes the red state).

## Acceptance criteria

- Given the restored tree, when the suite runs with assertions on and no wraps, then the failing set equals #112's #32
  set plus #113's sets, or every difference is in `census.md` with a stop-4 or stop-5 note.
- Given `census.md`, when T3 reads it, then every #32 failure names its runner frame.
- Given `ELK_DEV_ASSERTIONS=off`, when the touched sites' own test files run, then they pass unchanged (assertions off
  leaves behaviour as before).

## Observability / rollback

N/A — a disabled `devAssert` evaluates nothing. Reversible.
