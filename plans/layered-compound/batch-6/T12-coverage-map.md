<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Replay-alone coverage map and H8 closure

**Agent:** typescript-pro (sonnet), checked by the orchestrator · **Commit:** `docs(T12): map the 7h branches reached by the replay`
Scratch: `$TMPDIR/7h/T12/`.

## Context

Mission 7h, H8, H12 (F12 shape; `plans/layered-loops-wrapping-compaction/unreached.md` is the template). Coverage comes from
`LayeredCompoundVectors.test.ts`, `LayeredCompoundTwins.test.ts`, `layered-hierarchy-goldens.test.ts` and the ported suites
**alone** (`npx vitest run --coverage --coverage.include=<files> <those tests>`), before any anchored test exists, so it shows what
the oracle evidence reaches. The included files are the 7h classes, plus the landed files H8 names
(`ElkLayered.ts`, `ElkLayeredHierarchy.ts`, `GraphConfigurator.ts`, the p3order hierarchical files, `greedyswitch/**`, and the
files of the U items of the three earlier `unreached.md` files).

## Task

1. `plans/layered-compound/unreached.md`: classify every unreached branch and function of the included files as S (a site
   scenario can reach it: give the scenario id and the TS sites it decides), J (a ported Java suite reaches it), or U (dead, with
   the Java line that proves it; no later owner remains after 7h, except `elk.stress`-only paths, which go to 8b with H13's issue).
2. **H8 closure table:** every item of H8 (1)–(4) with its verdict: reached (name the row id), S, or U with the Java line. Use
   T9's C3 numbers for (4).
3. Scenario ids (`Sc1…`) for T14, about 40 at most (stop 9). Include the `reviewAndCorrectHierarchicalProcessors` throw case
   T1 counted, if no row reaches it.

## Write-set

`plans/layered-compound/unreached.md`.

## Read-set

The coverage JSON, the included TS files, `plans/layered-pipeline/unreached.md:55-80`, `plans/layered-labels/unreached.md`
(the rows naming 7h), `plans/layered-loops-wrapping-compaction/unreached.md:100-110,690-770`,
`plans/layered-crossing-min/unreached.md:25-30,100-130`, `plans/layered-crossing-min-tests/coverage.md:60-80`, `decisions.md` H8.

## Acceptance criteria

- Given every unreached branch of the included files, when listed, then each is S, J or U with its evidence.
- Given H8's items, when checked, then each has a verdict and an evidence pointer.
- Given the scenario list, when counted, then there are about 40 or fewer.

## Observability / Rollback

N/A — a planning document. Reversible.
