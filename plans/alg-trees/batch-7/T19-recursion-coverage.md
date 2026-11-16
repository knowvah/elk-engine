<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — Recursion probe, coverage closure, `unreached.md`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T19): probe tree recursion depth and close coverage`
Scratch: `$TMPDIR/alg-trees/T19/`

## Context

Mission 8a, TR7, stop conditions 6–8. AC6 (6a) converts input-depth recursions that overflow; 7h C7 kept recursion that does not.
The three bundles' recursions are listed in TR7.

## Task

1. List every recursive method of the three bundles (journal the list). For each algorithm, build a 2,000-deep path (and a 2,000-deep
   caterpillar) graph; run it in the oracle (a scratch Java launcher with the T1–T3 classpath, default `-Xss`) and in TS under
   `node --jitless` (`npx tsx` with `NODE_OPTIONS=--jitless`). Journal both outcomes. Convert a method per AC6 only when TS overflows
   and the oracle completes: an explicit-stack loop plus a test asserting it equals a verbatim recursive reference on recorded rows.
   Stop 6 if they diverge.
2. Coverage: run `npx vitest run --coverage` scoped to `src/alg/{mrtree,radial,vertiflex}` (not the full gate); for each uncovered
   branch either add a test from recorded rows or Java-traced values, or list it in `plans/alg-trees/unreached.md` as `U` with the Java
   line and the reason it is dead or unreachable (stop 7 for the rest).
3. Mutation spot check (7h T15 shape, scaled down): for each bundle mutate 10 decision points (comparison flips, off-by-one, swapped
   branch) in scratch copies and record which the replay kills; journal survivors with the reason (equivalent, or not observed by a
   recorded field → `follow-up` issue).

## Write-set

`plans/alg-trees/unreached.md`, new `*.test.ts` files under `src/alg/{mrtree,radial,vertiflex}/`, and the `src/` file of any method
converted under AC6 (with its test).

## Read-set

All three bundles' TS and Java, `plans/alg-common/decisions.md` AC6, `plans/layered-compound/decision-journal.md` (C7, T15 rows),
`decisions.md` TR7.

## Interface contract

None.

## Acceptance criteria

- Given the depth probe, then the journal lists every recursive method with oracle and TS outcomes and any conversion.
- Given scoped coverage, then each bundle is ≥ 90 % on lines, branches, functions and statements, or the gap is listed as `U`.
- Given the mutation spot check, then the journal lists killed and surviving mutants per bundle.

## Observability / Rollback

N/A — no new observable operations. Reversible.
