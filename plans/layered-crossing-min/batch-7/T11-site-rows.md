<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Site rows for the unreached branches

**Agent:** java-architect (sonnet) · **Commit:** `test(T11): record layered order site rows`

## Context

Mission 7c (README), C11, T9's `unreached.md`. Every S scenario becomes `sites/<Class>/<name>[/<variant>]` step rows
recorded by the same interpreter as `scenarios/*`. 7b's T11 is the precedent (its journal row lists the measured
per-branch verification method: replay-alone coverage before and after, hit-count deltas).

## Task

1. Add the `sites` group to `LayeredOrderVectors.java`: one row per S scenario row of `unreached.md`, ids as listed
   plus `/<variant>` where several; every node sized; `STRETCH_WIDTH` never on zero-size nodes or self-loops; a scenario
   needing a new op adds it to the Java interpreter and the 7c ops helper (journal; existing rows byte-identical).
2. Record to a scratch dir; prove the `models/*` and `scenarios/*` rows byte-identical (extract and `cmp`) before
   replacing the landed file; `rowCounts.sites` = the site row count; ≤ 5 MB; recorder < 3,000 lines.
3. Replay check: `npx vitest run src/alg/layered/LayeredOrderVectors.test.ts` passes with the new rows; measure
   per-branch hit deltas and report which listed branch each row reaches, and which it cannot (with the Java mechanism).

## Write-set

`tools/vectors/LayeredOrderVectors.java`, `test/golden/refs/java/layered-order.json`,
`test/helpers/layered-order-replay-*.ts` (new ops only).

## Read-set

`plans/layered-crossing-min/unreached.md`, `batch-1/T1-order-recorder.md` § Interface contract, the Java per branch,
`plans/layered-cycles-layers/decision-journal.md` (T11 rows).

## Acceptance criteria

- Given the re-recorded file, when diffed against the landed one, then only `sites/*` rows and `rowCounts.sites` differ.
- Given `unreached.md`, when its S ids are compared with the file, then every id has rows and no row lacks an entry.
- Given T8's replay, when run, then every site row matches.

## Observability / Rollback

N/A. Reversible.
