<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: documentation counts and the reclassifications

## Context

The docs cite the loops ref's counts: `sites` 64 and 1,627 rows. They need the new counts, and a pointer to this
mission's reclassifications. Precedent: layered-evidence-gaps T5 and the "three counts" edit to `overview.md`.

## Task

1. `docs/architecture/alg-layered-loops.md`:
   - update `:196` (`LayeredLoopsSites.test.ts` row: "the 64 `sites` rows") and `:263` (Rows table: the counts, and
     the test counts if they changed);
   - add one sentence, where the file lists open arms (around `:290-310`), pointing to
     `plans/layered-loops-evidence/unreached.md` and `mutants.md` for the spline `:137`, Sc28 and mutant verdicts.
2. `docs/architecture/overview.md:40`: update "1,627 oracle rows (… `sites` 64 …)". Edit only the numbers in the 7g
   sentence.
3. `docs/conformance.md:1578-1583`: update the `sites` count, the row total and the byte count of
   `layered-loops.json`, and the `LayeredLoopsSites.test.ts` test count. Add one bullet naming the new rows' ids by
   class and the mission. If the spline case adds a known throw-site correspondence (Java NPE ↔ TS TypeError at
   `getSplinePath`), add it where the file lists such correspondences, if a list exists (grep `TypeError`).
4. Do not edit `docs/` outside these three files. A count elsewhere that goes stale is a `follow-up` issue, not an
   edit.
5. `npx prettier --check` on the three files, then `npm run docs:build` (journal the typedoc warning count).
6. Commit: `docs(layered): count the 7g evidence rows`.

## Write-set

`docs/architecture/alg-layered-loops.md`, `docs/architecture/overview.md`, `docs/conformance.md`.

## Read-set

The three files around the cited lines; the T5 journal row (new counts and bytes); `mutants.md`; `unreached.md`.

## Acceptance criteria

- Given the three docs, when grepped for the old `sites` count and the old row total in the 7g context, then none
  remains, and the new values equal the ref's `rowCounts`.
- Given `npm run docs:build`, when it runs, then it exits 0.

## Observability

N/A: documentation.

## Rollback

Reversible: revert the three files.
