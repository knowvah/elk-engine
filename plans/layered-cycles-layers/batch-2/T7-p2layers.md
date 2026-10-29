<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `p2layers` and the `LayeringStrategy` arms

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the layerers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7b (README). Nine classes: `NetworkSimplexLayerer` (322, drives `src/alg/common/networksimplex` as 6a ported
it; `NNode.internalId` is overwritten by the simplex, see `.agent-notes/alg-common.md`), `LongestPathLayerer` (142),
`LongestPathSourceLayerer` (144), `CoffmanGrahamLayerer` (314), `InteractiveLayerer` (186), `StretchWidthLayerer`
(422), `MinWidthLayerer` (508 → facade + sections), `BreadthFirstModelOrderLayerer` (140),
`DepthFirstModelOrderLayerer` (323). Each declares `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER` before P1,
`LAYER_CONSTRAINT_PREPROCESSOR` before P2 and `LAYER_CONSTRAINT_POSTPROCESSOR` before P3 (the interactive one
`INTERACTIVE_EXTERNAL_PORT_POSITIONER` instead of the reverser).

## Task

1. Tests first per class on `scenarios/<Class>/*` rows (acyclic, unconstrained inputs) through T3's `runSteps` with
   `createPhase` returning the class under test.
2. Port the nine classes verbatim; configurations through T2's enum; `MinWidthLayerer` split at its Java section
   comments (P1); `double` width estimates stay `number`, `int` counts through `Int32`.
3. `S/options/LayeringStrategy.ts`: replace the nine `notPorted` arms (`:105-121`) with imports and `new <Class>()`;
   nothing else changes. Update its test's arm cases.
4. B8: `CoffmanGrahamLayerer.dfs` (`:279`), `LongestPathLayerer.visit` (`:99`), `LongestPathSourceLayerer.visit` (`:102`),
   `NetworkSimplexLayerer.connectedComponentsDFS` (`:153`) become explicit-stack loops with twins and a 5,000-node
   chain under `--jitless`.

## Write-set

`S/p2layers/*.ts` (9 classes + section files) and their `.test.ts`; `S/options/LayeringStrategy.ts` (arms only) and
`LayeringStrategy.test.ts`; `test/architecture/staged-classes.json` only under L1.

## Read-set

`J/p2layers/*.java`; `S/graph/*.ts`, `S/options/{InternalProperties,LayeredOptions,LayeringStrategy}.ts`,
`S/LayeredPhases.ts`, `src/core/alg/*.ts`, `src/alg/common/networksimplex/{NetworkSimplex,NGraph,NNode,NEdge}.ts`,
`src/core/util/Pair.ts`, `test/helpers/layered-phase-replay-*.ts`, `.agent-notes/alg-common.md`, `decisions.md` B8, B9.

## Interface contract (consumed by T8)

`LayeringStrategy.<X>.create(): ILayoutPhase<LayeredPhases, LGraph>`; each class `process(graph, monitor)`,
`getLayoutProcessorConfiguration(graph)`.

## Acceptance criteria

- Given every `scenarios/<Class>/*` row, when replayed via `LayeringStrategy.<X>.create()`, then no diff.
- Given the four recursive methods, when run on rows and the deep chain, then loop equals twin, no overflow.
- Given gates, when run, then clean; `LayeringStrategy.ts` diff touches only the nine arms; no file over 500 lines.

## Observability / Rollback

N/A. Reversible.
