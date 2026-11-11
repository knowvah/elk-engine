<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — radial `InternalProperties`, `RadialUtil`, sorting, wedge criteria, rotation, optimization

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port radial utilities, sorters and evaluations`
Scratch: `$TMPDIR/alg-trees/T7/`

## Context

Mission 8a, TR1, TR3, TR4. `R/RadialUtil.java` (325) holds I30 (`getNextLevelNodeSet`, `:224-231`: identity `HashSet`, TS insertion
order) and lookup-only `children` sets (`:56,78`); `:156,169` `Math.atan2`, `:178` `DoubleMath.fuzzyCompare` (landed `src/guava/DoubleMath.ts`),
`:279` `fuzzyEquals`. The sorters, wedge criteria, `GeneralRotator`, `AngleRotation` and the three optimizations exist as T5's staged
files: replace their bodies, keep marker and row (T13 removes them).

## Task

1. Port whole: `R/InternalProperties`, `R/RadialUtil`, `R/sorting/{IDSorter,PolarCoordinateSorter}`,
   `R/p1position/wedge/{AnnulusWedgeByLeafs,AnnulusWedgeByNodeSpace}`, `R/intermediate/rotation/{GeneralRotator,AngleRotation}`,
   `R/intermediate/optimization/{EdgeLengthOptimization,EdgeLengthPositionOptimization,CrossingMinimizationPosition}`.
2. `getSuccessorSet`/`getNextLevelNodeSet` return insertion-ordered `Set`s (AD-10); journal I30 (`ad10`). Keep `Math.*` native
   (translation rules §1.9).
3. Write `test/helpers/radial-replay-rows.ts` and `radial-replay-dump.ts` (T2's format) with tests.
4. Tests: each class against T2's stop rows that isolate it (the state before and after `GeneralRotator`; sorter orders taken from
   stop rows with `sorter` set); `RadialUtil` functions against values traced from the Java over recorded graphs.

## Write-set

`src/alg/radial/{InternalProperties,RadialUtil}{,.test}.ts`, `src/alg/radial/sorting/{IDSorter,PolarCoordinateSorter}{,.test}.ts`,
`src/alg/radial/p1position/wedge/{AnnulusWedgeByLeafs,AnnulusWedgeByNodeSpace}{,.test}.ts`,
`src/alg/radial/intermediate/rotation/{GeneralRotator,AngleRotation}{,.test}.ts`,
`src/alg/radial/intermediate/optimization/{EdgeLengthOptimization,EdgeLengthPositionOptimization,CrossingMinimizationPosition}{,.test}.ts`,
`test/helpers/radial-replay-{rows,dump}{,.test}.ts`.

## Read-set

The Java files above, `R/Radial.melk`, T2's recorder header, `src/guava/DoubleMath.ts`, `docs/translation-rules.md` §1.9, §2,
`decisions.md` TR3, TR4.

## Interface contract (consumed by T10, T13)

`RadialUtil` static methods with Java names; the sorters' `sort`, `initialize`, `sortedComparator`; the evaluations' `evaluate`;
`loadRadialRows()`, `dumpRadial(graph)`, `compareStop(expected, actual)`.

## Acceptance criteria

- Given a stop pair around `GeneralRotator` in T2's rows, when the TS rotator runs on the "before" graph, then the "after" equals the row.
- Given a stop row with `sorter=POLAR_COORDINATE` or `ID`, when the TS sorter orders the recorded nodes, then the recorded order results.
- Given the replaced staged files, then they keep marker and row and the staged fitness test passes.

## Observability / Rollback

N/A — no new observable operations. Reversible.
