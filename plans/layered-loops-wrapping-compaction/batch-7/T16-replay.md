<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — Replay every row; R9 and AD-10 twins

**Agent:** typescript-pro (sonnet); the orchestrator reviews every fix · **Commit:** `test(T16): replay the loops vectors through the pipeline`
(fixes: `fix(T16): <mechanism>` each).
Scratch: `$TMPDIR/7g/T16/`.

## Context

W3, W4, W6, W7. Every `layered-loops.json` row through the real `LayeredLayoutProvider`/`ElkLayered` (no injection now), F4's bar.
7f2's `LayeredLabelsVectors.test.ts` is the shape (title = row id, so `-t '<row id>'` isolates one row; ≤ 30 s alone, stop 11).

## Task

1. `src/alg/layered/LayeredLoopsVectors.test.ts`: every row of every group, with `processor DummySelfLoopProcessor` registered;
   the formerly pinned row's fresh cross-check rows compared with the landed row's expectation (W4).
2. **AD-10 twins (W6):** for every site whose `ad10` row says "identity-keyed and iterated", replay the rows that reach it with
   T2's reversal hook; equal → order-independent on the rows (journal); different → the oracle order decides, a mismatch is
   stop 17 (`needs-ruling` naming the rows).
3. **R9 (W7):** replay the `SPLINES` + compaction rows with and without the `SplineSegment.edges` reversal; journal the verdict.
4. Any mismatch: diagnosis mode (CLAUDE.md, `~/.claude/rules/diagnosis.md`): instrument the oracle and the port, find where the
   port first departs, fix at origin, journal the artifact (mechanism, origin `file:line`, causal chain, ruled out).

## Write-set

`src/alg/layered/LayeredLoopsVectors.test.ts`; fixes in the 7g classes (T3–T14's files), each journaled.

## Read-set

`src/alg/layered/LayeredLabelsVectors.test.ts`, T2's helpers, the journal's `ad10` rows, `decisions.md` W3, W4, W6, W7.

## Acceptance criteria

- Given every row, when replayed, then it equals the oracle at AD-4.
- Given each iterated identity-keyed site, when its twin runs, then the journal records equal or the stop 17 ruling.
- Given the R9 rows, when replayed both ways, then the journal records the verdict.
- Given the file alone, when timed, then ≤ 30 s.

## Observability / Rollback

N/A. Reversible.
