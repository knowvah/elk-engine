<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — radial phases, processors, provider, unstaging, wiring, replay, JUnit

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T13): wire radial and replay its oracle rows`
Scratch: `$TMPDIR/alg-trees/T13/`

## Context

Mission 8a, TR1, TR4, TR5, TR8, TR9. Remaining radial classes: `R/p1position/EadesRadial` (136; `:101-108` `cos`/`sin`/`acos`, and the
kept expression `currentRadius / currentRadius + radius` at `:108`), `R/p2routing/StraightLineEdgeRouter` (94),
`R/intermediate/{EdgeAngleCalculator,CalculateGraphSize}` (`Double.MIN_VALUE` running max at `CalculateGraphSize.java:40`, port as
`Number.MIN_VALUE`), `R/RadialLayoutProvider` (112). All but the provider are T5 staged files.

## Task

1. Port the five classes whole.
2. Remove all 16 radial `// @staged 8a` markers and their `staged-classes.json` rows (TR4).
3. Remove `org.eclipse.elk.alg.radial.RadialLayoutProvider` from `PENDING_TYPES`; `npm run melk:generate Radial`; commit unedited; switch
   any held-back assertion in `test/melk/radial-options.test.ts` to the registered algorithm (matching `metadata.json`).
4. `src/alg/radial/RadialVectors.test.ts`: every T2 row through the real provider (`full`, `stops`, `throws`), ≤ 30 s alone.
5. Port `RT/CenterOnRootTest.java` to `src/alg/radial/CenterOnRootTest.test.ts` (TR8): both cases, delta 0.1, assertions verbatim.
6. Any coordinate beyond 1e-6 traced to a last-ulp `Math.*` flip of a discrete decision is stop 14 (needs-ruling naming the rows).
   Per-module import smoke over `src/alg/radial/**`.

## Write-set

`src/alg/radial/p1position/EadesRadial{,.test}.ts`, `src/alg/radial/p2routing/**`,
`src/alg/radial/intermediate/{EdgeAngleCalculator,CalculateGraphSize}{,.test}.ts`, `src/alg/radial/RadialLayoutProvider{,.test}.ts`,
`src/alg/radial/{RadialVectors,CenterOnRootTest}.test.ts`, `src/alg/radial/options/**` (regenerated), the line-2 marker of each of
the 16 radial staged files, `tools/melk/config.ts`, `test/architecture/staged-classes.json`, `test/melk/radial-options.test.ts`.

## Read-set

The Java files above, `RT/CenterOnRootTest.java`, T7 and T10's classes and helpers, `src/alg/vertiflex/VertiFlexVectors.test.ts`
(T11's replay shape), `decisions.md` TR1, TR4, TR5, TR8, TR9.

## Interface contract (consumed by T18)

`RadialMetaDataProvider` registers `org.eclipse.elk.radial` with a working factory; `new RadialLayoutProvider().layout(graph, monitor)`.

## Acceptance criteria

- Given every row of `refs/java/radial.json`, when replayed, then 0 mismatches at the AD-4 bar.
- Given `CenterOnRootTest`, then both cases pass with the Java tolerance (oracle: runs=2, failures=0).
- Given the staged fitness test, then no radial row or marker remains.

## Observability / Rollback

N/A — no new observable operations. Reversible.
