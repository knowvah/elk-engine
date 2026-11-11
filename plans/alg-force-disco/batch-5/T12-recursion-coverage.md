<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Recursion probe, coverage closure, #58 evidence

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12): close force and disco coverage and probe recursion` · Scratch: `$TMPDIR/alg-force-disco/T12/`

## Context

Mission 8b, FD7, FD9. Issue #58 is `needs-ruling`; the mission does not decide it.

## Task

1. **Recursion:** for `force`, `stress` and `disco`, a 2,000-deep path in the oracle (default `-Xss`) and in TS under `node --jitless`.
   Convert only per FD7, against a verbatim recursive reference.
2. **Coverage:** close `src/alg/{force,disco}` to at least 90/90/90/90. Each branch neither reached nor provably dead goes in
   `unreached.md` (stop 7); a provable one is a `U` row citing the Java line.
3. **#58 evidence:** check `gh issue view 58`. Unless a ruling exists, leave `test/helpers/stress-pending.ts`, its test and both suites as
   they are. Temporarily blank `STRESS_PENDING` in the working tree, register `elk.stress`, run `Issue665Test` and `Issue700Test`, and
   restore with `git checkout -- <files>`. Comment on #58 with the counts, without closing it. With a ruling, follow it and journal.

## Write-set

Test additions under `src/alg/force/**` and `src/alg/disco/**`; a converted recursion site only per FD7; `plans/alg-force-disco/unreached.md`.

## Read-set

`.agent-notes/alg-trees.md`, `decisions.md#fd7-recursion`, `#fd9-scope-edges-and-hand-offs`, `test/helpers/stress-pending.ts`,
`src/alg/layered/issues/Issue{665,700}Test.test.ts`, `gh issue view 58`.

## Acceptance criteria

- Given the probe, then the journal shows each site's result in oracle and TS, with and without `--jitless`.
- Given the bundles' coverage, then each is at least 90 % on all four counters, or the shortfall is a journaled `U`.
- Given #58 without a ruling, then `git diff` shows no change to `stress-pending.ts` or the two suites, and the issue has the counts.

## Observability / Rollback

N/A — no new observable operations. Reversible.
