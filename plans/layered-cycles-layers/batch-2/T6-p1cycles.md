<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `p1cycles` and the `CycleBreakingStrategy` arms

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the cycle breakers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7b (README). Eleven classes: `GreedyCycleBreaker` (286, the only `Random` consumer: `chooseNode`,
`:232`, `random.nextInt(nodes.size())` from `InternalProperties.RANDOM`), `DepthFirstCycleBreaker` (163),
`InteractiveCycleBreaker` (128), `ModelOrderCycleBreaker` (101), `GreedyModelOrderCycleBreaker` (61, extends Greedy),
`SCConnectivity` (100), `SCCNodeTypeCycleBreaker` (113), `SCCModelOrderCycleBreaker` (169, uses the 7a `Tarjan`;
its two hash containers are insertion-ordered under AD-10, a replay mismatch traced there is a stop),
`DFSNodeOrderCycleBreaker` (212), `BFSNodeOrderCycleBreaker` (233), `GroupModelOrderCalculator` (115). Each phase
implements `ILayoutPhase<LayeredPhases, LGraph>` with its `getLayoutProcessorConfiguration` referencing T2's enum
(`REVERSED_EDGE_RESTORER` after P5; `INTERACTIVE_EXTERNAL_PORT_POSITIONER` before P1 for the interactive one).

## Task

1. Tests first per class on `scenarios/<Class>/*` rows through T3's `runSteps` with `createPhase` returning the class
   under test; the `GREEDY` tie row must pass only with the seeded `Random` shim (assert a wrong seed differs).
2. Port the eleven classes verbatim; `getLayoutProcessorConfiguration` returns the Java configuration through
   `LayoutProcessorConfiguration` (core.alg) and `IntermediateProcessorStrategy` members.
3. `S/options/CycleBreakingStrategy.ts`: replace the nine `notPorted` arms (`:114-130`) with imports and
   `new <Class>()`; nothing else in the file changes. Update its test's arm cases.
4. B8: `DepthFirstCycleBreaker.dfs` (`:133`), `DFSNodeOrderCycleBreaker.dfs` (`:146`), `InteractiveCycleBreaker.findCycles`
   (`:107`) become explicit-stack loops with verbatim twins and a long-cycle case under `--jitless`.
5. `Collections`/`List` idioms: Java `List.remove(Object)` vs `remove(int)` overloads per `docs/architecture/alg-common.md`
   §6.5; `int` arithmetic through `Int32`.

## Write-set

`S/p1cycles/*.ts` (11 classes + section files) and their `.test.ts`; `S/options/CycleBreakingStrategy.ts` (arms only)
and `CycleBreakingStrategy.test.ts`; `test/architecture/staged-classes.json` only under L1.

## Read-set

`J/p1cycles/*.java`; `S/graph/{LGraph,LNode,LEdge,LPort,Layer,Tarjan,LGraphUtil}.ts`, `S/options/{InternalProperties,
LayeredOptions,CycleBreakingStrategy,GroupOrderStrategy,OrderingStrategy}.ts`, `S/LayeredPhases.ts`,
`src/core/alg/{ILayoutPhase,LayoutProcessorConfiguration}.ts`, `src/java/util/Random.ts`,
`test/helpers/layered-phase-replay-*.ts`, `decisions.md` B8, B9.

## Interface contract (consumed by T8)

`CycleBreakingStrategy.<X>.create(): ILayoutPhase<LayeredPhases, LGraph>`; each class `process(graph, monitor)` and
`getLayoutProcessorConfiguration(graph)`.

## Acceptance criteria

- Given every `scenarios/<Class>/*` row, when replayed via `CycleBreakingStrategy.<X>.create()`, then no diff.
- Given the `GREEDY` tie row, when replayed with seed 1, then it matches; with seed 2 it differs (the shim matters).
- Given the three recursive methods, when run on rows and a 5,000-node cycle, then loop equals twin, no overflow.
- Given gates, when run, then clean; `CycleBreakingStrategy.ts` diff touches only the nine arms.

## Observability / Rollback

N/A. Reversible.
