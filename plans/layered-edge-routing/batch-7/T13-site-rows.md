<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Site and call rows for the unreached branches

**Agent:** java-architect (sonnet) · **Commit:** `test(T13): record layered routing site and call rows`

## Context

Mission 7e (README), R12, T11's `unreached.md`. Every S scenario becomes a `sites/<Class>/<name>[/<variant>]` step row
or a `calls/<Class>/<name>` row recorded by the same interpreter as `scenarios/*` and `calls/*` (T1), in
`layered-routing-steps.json`. 7d's T11 is the precedent (`plans/layered-node-placement/batch-5/T11-site-rows.md`; its
journal rows list the per-branch verification method: replay-alone coverage before and after, hit-count deltas) and
its `sites` group is a compact table with macros (`tools/vectors/LayeredPlacementVectors.java:2360-2423`), which keeps
the recorder under its 3,000-line cap (stop 13).

## Task

1. Add the `sites` rows and the new `calls` rows to `LayeredRoutingVectors.java`: one row per S item of
   `unreached.md`, ids as listed plus `/<variant>` where several; every node sized; a scenario needing a new step or
   call op adds it to the Java interpreter and to the T3 ops helper (`test/helpers/layered-routing-replay-ops.ts`;
   the 7b–7d helpers are never edited), journaled in the hand-back; existing rows byte-identical.
2. Record to a scratch dir (`<scratch>/T13`); prove `layered-routing.json` and the `scenarios/*` and existing
   `calls/*` rows byte-identical (extract and `cmp` against the landed files) before replacing the steps file;
   `rowCounts.sites` and `rowCounts.calls` updated; ≤ 5 MiB per file (stop 13; the R2 trimming order is the
   orchestrator's call, report the sizes); recorder < 3,000 lines.
3. Replay check: `npx vitest run src/alg/layered/LayeredRoutingVectors.test.ts` passes with the new rows; measure
   per-branch hit deltas (`npx vitest run -t '<row id>' --coverage --coverage.reporter=json
   src/alg/layered/LayeredRoutingVectors.test.ts`, about 5 s per row) and report which listed branch each row
   reaches, and which it cannot (with the Java mechanism: those return to the orchestrator as U candidates for the
   `unreached.md` corrections section).

## Write-set

`tools/vectors/LayeredRoutingVectors.java`, `test/golden/refs/java/layered-routing-steps.json`,
`test/helpers/layered-routing-replay-*.ts` (new ops only).

## Read-set

`plans/layered-edge-routing/unreached.md`, `batch-1/T1-routing-recorder.md` § Interface contract, the Java per
branch, `tools/vectors/LayeredPlacementVectors.java:2360-2480` (the 7d macros and `siteScenarios`, read only),
`plans/layered-node-placement/decision-journal.md` (T11 rows), `decisions.md` R2, R3, R12.

## Architecture decisions

R2 (cap per file, trimming order), R3 (fields a site row carries; rows under ten nodes carry the full dump), R12 (S
rows only; a U branch gets a journal line, not a row).

## Interface contract (consumed by T14a, T14b)

Row ids exactly as `unreached.md` lists them (plus `/<variant>`); each row's `expected` carries the field the branch
decides (bend points, junction points, segment summary, node x, graph size, or a `calls` result).

## Acceptance criteria

- Given every S item, when the recorder runs, then a row exists with the listed id and its per-row coverage run hits
  the branch (or the hand-back names the branch, the row and the Java mechanism).
- Given the landed `models` ref and the existing step rows, when compared with the new recording, then byte-identical.
- Given both refs, when sized, then each under 5 MiB; the recorder under 3,000 lines.

## Observability / Rollback

Stderr counters as T1. Reversible.
