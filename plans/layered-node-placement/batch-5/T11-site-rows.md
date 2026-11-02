<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Site rows for the unreached branches

**Agent:** java-architect (sonnet) · **Commit:** `test(T11): record layered placement site rows`

## Context

Mission 7d (README), N11, T9's `unreached.md`. Every S scenario becomes `sites/<Class>/<name>[/<variant>]` step
rows recorded by the same interpreter as `scenarios/*` (T1). 7c's T11 is the precedent
(`plans/layered-crossing-min/batch-7/T11-site-rows.md`; its journal rows list the measured per-branch verification
method: replay-alone coverage before and after, hit-count deltas) and its `sites` group is a compact
`id|root|nodes|edges|steps` table with macros (`tools/vectors/LayeredOrderVectors.java:2394-`), which keeps the
recorder under its 3,000-line cap (stop 13).

## Task

1. Add the `sites` group to `LayeredPlacementVectors.java`: one row per S scenario row of `unreached.md`, ids as
   listed plus `/<variant>` where several; every node sized (a zero-height node is never placed under
   `STRETCH_WIDTH`, 7b); a scenario needing a new op adds it to the Java interpreter and to the T3 ops helper
   (`test/helpers/layered-placement-replay-ops.ts`; the 7b/7c helpers are never edited), journaled in the hand-back;
   existing rows byte-identical.
2. Record to a scratch dir (`<scratch>/T11`); prove the `models/*` and `scenarios/*` rows byte-identical (extract and
   `cmp` against the landed file) before replacing the landed file; `rowCounts.sites` = the site row count; ≤ 5 MB
   (stop 13; the N3 trimming rule is the orchestrator's call, report the size); recorder < 3,000 lines.
3. Replay check: `npx vitest run src/alg/layered/LayeredPlacementVectors.test.ts` passes with the new rows; measure
   per-branch hit deltas (`npx vitest run -t '<row id>' --coverage --coverage.reporter=json
   src/alg/layered/LayeredPlacementVectors.test.ts`, about 5 s per row, `.agent-notes/layered-crossing-min.md:296`)
   and report which listed branch each row reaches, and which it cannot (with the Java mechanism: those return to
   the orchestrator as U candidates for the `unreached.md` corrections section).

## Write-set

`tools/vectors/LayeredPlacementVectors.java`, `test/golden/refs/java/layered-placement.json`,
`test/helpers/layered-placement-replay-*.ts` (new ops only).

## Read-set

`plans/layered-node-placement/unreached.md`, `batch-1/T1-placement-recorder.md` § Interface contract, the Java per
branch, `tools/vectors/LayeredOrderVectors.java:2394-2494` (the 7c macros and `siteScenarios`, read only),
`plans/layered-crossing-min/decision-journal.md` (T11 rows), `decisions.md` N3, N11.

## Architecture decisions relevant

N3 (geometry fields a site row carries; rows under ten nodes carry the full dump), N11 (S rows only; a U branch gets
no row), N6 (a site row never targets a twin's loop arm).

## Interface contract (consumed by T12a, T12b)

Row ids exactly as `unreached.md` lists them (plus `/<variant>`), `expected` in T1's shape; the hand-back table
`row id → branches reached` is appended to `unreached.md` by the orchestrator as "T11 corrections".

## Acceptance criteria

- Given the re-recorded file, when diffed against the landed one, then only `sites/*` rows and `rowCounts.sites`
  differ.
- Given `unreached.md`, when its S ids are compared with the file, then every id has rows and no row lacks an entry.
- Given T8's replay, when run, then every site row matches.
- Given the per-row coverage runs, when read, then every S branch is reached by the row that claims it, or the
  hand-back names the mechanism that prevents it.

## Observability / Rollback

N/A. Reversible.
