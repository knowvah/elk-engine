<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: full suite with assertions on and off; triage

## Context

With all lanes merged, the whole suite runs with the restored assertions enabled for the first time. A firing assertion
is an observed discrepancy, so diagnosis mode applies before any change ([D7](../decisions.md#d7-triage-of-an-assertion-that-fires-in-the-suite)).
Stop 2 needs a run with assertions off to prove the sites are inert in production.

## Write-set

- The TS file of a site whose assertion exposes a port defect, for a fix at the mechanism (D7, stop 6 otherwise)
- `plans/dev-assert/inventory.md` (statuses), `plans/dev-assert/decision-journal.md`

## Steps

1. `npx vitest run` (assertions on). Journal pass/fail counts and runtime against T1's baseline.
2. `ELK_DEV_ASSERTIONS=off npx vitest run`: every test that passed at the base passes (stop 2). Journal counts.
3. For each failure in step 1: write the diagnosis artifact (mechanism, origin `file:line`, causal chain, ruled out).
   - A ported JUnit or vector-replay test means a port defect (Tycho ran those with `-ea`, 0 failures). Fix it in the
     site's file if no expected value changes, else stops 5/6.
   - A golden, corpus or layout input: check `uptime`, then
     `nice -n 10 env JAVA_TOOL_OPTIONS=-ea tools/oracle/run.sh "$TMPDIR/ea-<case>" <input>`. If Java throws the same
     `AssertionError` (stack in the output), apply stop 4: revert that one site to a comment naming the issue, set
     `not-portable: pending #N`. If Java does not throw, it is a port defect: first bullet.
4. Rerun until green. Every inventory row has a final status. No row stays `todo`.

## Acceptance criteria

- Given the suite with assertions on, when T7 ends, then it is green and every earlier failure has a journaled
  diagnosis artifact and an outcome (fixed, `needs-ruling`, `follow-up`).
- Given `ELK_DEV_ASSERTIONS=off`, when the suite runs, then the pass count equals the base's plus the new tests of T1.
- Given a fix, then it changes no expected value, and `git diff <base> -- test/golden/refs/` stays empty.

## Quality bar

Commit `fix(t7): <mechanism>` per fix, or nothing if no assertion fired (journal that). Unsigned.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: each fix is its own commit before the squash.
