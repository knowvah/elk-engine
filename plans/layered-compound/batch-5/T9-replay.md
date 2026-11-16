<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Replay every row; H3 twins; the C3 re-measure

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T9): replay layered compound vectors with twins`
Scratch: `$TMPDIR/7h/T9/`.

## Context

Mission 7h, H2, H3, H8 (4), H12. `layered-compound.json` (T1) holds the `full`, `models` and `scenarios` groups (`sites` comes
from T14). 7g's `LayeredLoopsVectors.test.ts` and `LayeredLoopsTwins.test.ts` are the shape: one test per row, a budget of 30 s
alone, and twins that reverse each identity-keyed iteration on the rows that reach it.

## Task

1. `src/alg/layered/LayeredCompoundVectors.test.ts`: every row of the three groups replays through the real pipeline (`full`:
   `RecursiveGraphLayoutEngine` with the nested `plans` compared; `models`: T2's `runToStop`; `scenarios`: the full step list).
   Require 0 mismatches. A mismatch enters diagnosis mode (README, stop 17/19): mechanism, origin, causal chain, ruled out,
   before any fix. A fix lands in this task with a `fix` journal row.
2. `src/alg/layered/LayeredCompoundTwins.test.ts`: for each H3 site, list the rows that reach it (instrumented count) and replay
   them with `order: 'reversed'`. Assert equality where the Java order provably does not matter (journal the proof). Where the
   reversed run differs, assert that the Java-order run matches the oracle and the reversed run does not. That shows insertion
   order is the order the oracle shows (H3, G3a), so journal it. A site where neither order matches is stop 17.
3. C3 re-measure (H8 (4)): run replay-alone coverage over `src/alg/layered/p3order/**` and `intermediate/greedyswitch/**` and
   report how many of the 89 branches / 36 functions of `plans/layered-crossing-min/unreached.md:29,108` and the 61 arms /
   3 functions of `plans/layered-crossing-min-tests/coverage.md:74` are now reached. The list of the rest goes to T12. Re-evaluate
   the recursion of `countCurrentNumberOfCrossings` against the deepest recorded hierarchy (C7). Journal the result.
4. Measure the test file alone (≤ 30 s, stop 11), and journal the time and the `npm test` delta.

## Write-set

`src/alg/layered/LayeredCompoundVectors.test.ts`, `src/alg/layered/LayeredCompoundTwins.test.ts`; fixes in 7h classes or the
landed driver (stop 19), each journaled.

## Read-set

`src/alg/layered/LayeredLoops{Vectors,Twins}.test.ts`, T2's helpers, T1's header, `decisions.md` H2, H3, H8, F4, F14.

## Acceptance criteria

- Given every `full`, `models` and `scenarios` row, when replayed, then 0 rows mismatch at AD-4.
- Given each H3 site, when its rows are replayed reversed, then the outcome is journaled and asserted as step 2 says.
- Given the file alone, then it runs in ≤ 30 s.

## Observability / Rollback

Per-site reach counts and the C3 numbers in the journal. Reversible.
