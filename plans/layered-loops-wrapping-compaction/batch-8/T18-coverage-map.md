<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — Replay-alone coverage map

**Agent:** typescript-pro (sonnet), checked by the orchestrator · **Commit:** `docs(T18): map the 7g branches reached by the replay`
Scratch: `$TMPDIR/7g/T18/`.

## Context

W10, W14 (F12 shape; `plans/layered-labels/unreached.md` is the template). Coverage of the 7g classes from
`LayeredLoopsVectors.test.ts` and the ported suites **alone** (`npx vitest run --coverage --coverage.include=<7g files> <those tests>`),
before any anchored test exists, so it shows what the oracle evidence reaches.

## Task

1. `plans/layered-loops-wrapping-compaction/unreached.md`: every unreached branch and function of the 7g classes classified
   S (a site scenario can reach it: give the scenario id and the TS sites it decides), J (a ported Java suite reaches it), or U
   (unreachable: owner 7h, or dead with the Java line that proves it).
2. **W10:** the 3 U items of `plans/layered-labels/unreached.md` (`DotDebugUtil.ts:211`, `JsonDebugUtilGraph.ts:191`,
   `EndLabelPreprocessor.ts:145`, the same-side self-loop dummy of `J/intermediate/NorthSouthPortPreprocessor.java:627-653`):
   reached by a named row, or S, or re-classified U with the Java line.
3. 7e's 7g list (`NorthSouthPortPostprocessor.processSelfLoop`, the routers' self-loop arms, `inverseOrder`/`SPLINE_SURVIVING_EDGE`,
   `segmentAllowsSloppyRouting`'s compaction arms): each reached, S, or U.
4. Scenario ids (`Sc1…`) for T20, about 40 at most (stop 9).

## Write-set

`plans/layered-loops-wrapping-compaction/unreached.md`.

## Read-set

The coverage JSON, the 7g TS files, `plans/layered-labels/unreached.md`, roadmap § Revision 2026-11-03 (layered-edge-routing)
"7g:", `decisions.md` W10.

## Acceptance criteria

- Given every unreached branch of the 7g classes, when listed, then each is S, J or U with its evidence.
- Given the 3 W10 items and 7e's list, when checked, then each has a verdict.
- Given the scenario list, when counted, then ≤ about 40.

## Observability / Rollback

N/A — a planning document. Reversible.
