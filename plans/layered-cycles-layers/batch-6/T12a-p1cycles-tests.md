<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12a — Anchored unit tests: the eleven cycle breakers and the `CycleBreakingStrategy` arms

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12a): anchor p1cycles tests on oracle phase rows`

## Context

Mission 7b (README), L4/X5, B7, 6c D1. T9's `unreached.md` lists every branch of these classes the replays leave
untaken; T11 recorded a `sites/*` row per S scenario. Each colocated test file gains cases whose literals equal a
row, with the comment `// oracle: <row id>; <Java file:line>`; J branches get structural cases from the Java; U
branches get nothing. The generic replay (T8) stays the authority; these cases make each branch's expectation
readable next to the code. 7a's T11b–T11d briefs are the pattern (`plans/layered-framework/batch-8/`).

## Task

1. For every S and J row of `unreached.md` whose class is in this task's directory, add a case to the class's
   `.test.ts` (extend the batch-2 file; keep its existing cases): load the row through T3's `loadRows`, run it with
   the class injected, assert the named `expected` fields with literals copied from the row (hex doubles decoded
   through the 7a C4 helper), plus the row id and Java line in the comment.
2. Where a case would only duplicate the generic replay with no added readability, assert the specific field the
   branch decides (the 7a T11 rule), not the whole dump.
3. No `src/` edit: a mismatch is a port defect; stop with the diagnosis artifact.

## Write-set

src/alg/layered/p1cycles/*.test.ts (except `BasicCycleBreakerTest.test.ts`), src/alg/layered/options/CycleBreakingStrategy.test.ts.

## Read-set

`plans/layered-cycles-layers/unreached.md`, `test/golden/refs/java/layered-phases.json` (the rows named),
`test/helpers/layered-phase-replay-*.ts`, `test/helpers/layered-site-replay-args.ts` (C4 decode), the Java lines cited.

## Acceptance criteria

- Given every S row for this directory, when the suite runs, then a case cites it and passes.
- Given the coverage run of this directory alone (`--coverage.include`), when read, then ≥ 90 % branches for every
  class, the U list excepted.
- Given `git diff --stat`, when inspected, then only files in the write-set changed.

## Observability / Rollback

N/A. Reversible.
