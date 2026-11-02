<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Wire the arms, replay every row, port the invariant test

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T8): wire node placement and replay every row`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7d (README), N1, N4, N9. Batches 1–2 proved each class on its rows with the class injected; this task proves
the whole set the way the pipeline uses it. 7c's `src/alg/layered/LayeredOrderVectors.test.ts` and its invariant
tests (`src/alg/layered/p3order/BasicCrossingMinimizationTest.test.ts` is the closest: one method, run after the
phase, over the rows of the Java test's configurations, `scenarios/*` and `sites/*` excluded) are the pattern. The
entry-point fitness test (`test/architecture/layered-entry-points.fitness.test.ts`, T2 added the enum) must stay
green after wiring: the E1 recipe (cached static getters, lazy defaults, in-function enum reads), never an
entry-order import (stop 15).

## Task

1. `src/alg/layered/options/NodePlacementStrategy.ts`: the five arms create `SimpleNodePlacer`,
   `InteractiveNodePlacer`, `LinearSegmentsNodePlacer`, `BKNodePlacer`, `NetworkSimplexPlacer` exactly as
   `J/options/NodePlacementStrategy.java:64-84` does; `NodePlacementStrategy.test.ts` asserts each arm's instance
   class and that `create()` no longer throws.
2. `src/alg/layered/intermediate/IntermediateProcessorStrategy.ts`: the five 7d arms
   (`INNERMOST_NODE_MARGIN_CALCULATOR`, `LABEL_AND_NODE_SIZE_PROCESSOR`, `IN_LAYER_CONSTRAINT_PROCESSOR`,
   `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`, `NODE_PLACEMENT_REPEATER`) import and instantiate; read
   `J/intermediate/IntermediateProcessorStrategy.java` for the exact constructor calls. In
   `IntermediateProcessorStrategy.test.ts` the `ARMS` table (`:93-152`) moves these five members from `'7f'` to
   `'7d'` and the tally assertion (`:243`) becomes `{ '7b': 10, '7c': 10, '7d': 5, '7f': 25, '7g': 9 }` (59 members;
   count the table before writing the numbers and report any difference).
3. `src/alg/layered/LayeredPlacementVectors.test.ts`: every row of `test/golden/refs/java/layered-placement.json`
   by name through the real factories (`createProcessor` = `IntermediateProcessorStrategy.valueOf(name).create()`;
   `createPhase` maps `P1_CYCLE_BREAKING`, `P2_LAYERING`, `P3_NODE_ORDERING`, `P4_NODE_PLACEMENT` to the four
   strategy enums), `runPlacementPrefix` for pipeline rows, `runSteps` for step rows, `comparePlacement` (and
   `comparePlacementFullDump` where `expected.dump` exists); counts from `rowCounts`, unique ids, one `it` per row;
   the file runs under 20 s alone (stop 11).
4. `src/alg/layered/p4nodes/BasicNodePlacementTest.test.ts`: `JT/p4nodes/BasicNodePlacementTest.java:194-210`
   `testProperCoordinates` verbatim (per layer: `lastBottomY = y + height` of the first node, then for every next
   node `lastBottomY < y`, updating `lastBottomY`) over the replayed P4 stop rows of its 14 configurations: the 13
   `@ConfiguratorProvider`s (`:72-176`: `LINEAR_SEGMENTS`, `NETWORK_SIMPLEX`, `SIMPLE`, and `BRANDES_KOEPF` × edge
   straightening {`NONE`, `IMPROVE_STRAIGHTNESS`} × fixed alignment {`NONE`, `LEFTUP`, `LEFTDOWN`, `RIGHTUP`,
   `RIGHTDOWN`, `BALANCED`}) plus the `@DefaultConfiguration` run (`:48`, the default `BRANDES_KOEPF`). The
   `@TestAfterProcessor` annotations (`:190-193`) name the four placers: the P4 stop rows of those strategies;
   INTERACTIVE rows, `scenarios/*` and `sites/*` are excluded (the Java runs none of them). The Java test extends
   the greedy-switch `TestGraphCreator` but calls none of its builders: no creator. Agent rule (7c-tests): add no
   assertion the Java lacks; the review before the commit checks the port against the Java.
5. Report which rows each configuration matched (count per configuration) and any configuration with no row (a
   recorder gap for the orchestrator, not a reason to widen the selection).

## Write-set

`src/alg/layered/options/NodePlacementStrategy.ts` + `.test.ts`;
`src/alg/layered/intermediate/IntermediateProcessorStrategy.ts` + `.test.ts`;
`src/alg/layered/LayeredPlacementVectors.test.ts`; `src/alg/layered/p4nodes/BasicNodePlacementTest.test.ts`.

## Read-set

`J/options/NodePlacementStrategy.java:64-84`, `J/intermediate/IntermediateProcessorStrategy.java` (the five arms),
`JT/p4nodes/BasicNodePlacementTest.java:48-210`, `src/alg/layered/LayeredOrderVectors.test.ts` (pattern),
`src/alg/layered/p3order/BasicCrossingMinimizationTest.test.ts:1-60` (row selection and factories),
`test/helpers/layered-placement-replay-{rows,dump,compare,ops}.ts` (T3), `test/helpers/layered-phase-replay-ops.ts:19-24`
(`Factories`), `test/architecture/layered-entry-points.fitness.test.ts`, `decisions.md` N1, N4, N9,
`.agent-notes/layered-cycles-layers.md` ("wiring a strategy enum's arms closes an ESM cycle").

## Architecture decisions relevant

N1 (the five processors are 7d members), N4 (E1 recipe; stop 15), N9 (the invariant's row selection; no creator; no
extra assertion), C5/C6 of 7c, B9 of 7b.

## Interface contract (consumed by T9–T12)

`LayeredPlacementVectors.test.ts` names its cases exactly as 7c's `LayeredOrderVectors.test.ts` does, so that
`npx vitest run -t '<row id>'` selects one row for per-row coverage (`.agent-notes/layered-crossing-min.md:296`).
The factories object is local to each test file (7c duplicated it; T12a and T12b may copy it).

## Acceptance criteria

- Given every row, when replayed by name through the real factories, then no diff; per-group counts equal
  `rowCounts`; the file runs under 20 s alone.
- Given the invariant over the P4 rows of its 14 configurations, when run, then every case passes and the file holds
  no assertion beyond the Java's `lastBottomY < y`.
- Given the two enums, when `create()` runs for a 7d member, then an instance; the 7e/7f/7g members still throw;
  the tally is `7b 10 / 7c 10 / 7d 5 / 7f 25 / 7g 9`.
- Given `npx vitest run test/architecture`, when run after wiring, then the entry-point test is green.

## Observability / Rollback

N/A. Reversible.
