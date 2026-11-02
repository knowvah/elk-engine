<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — The five processors node placement needs

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port the processors node placement needs`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T4/`.

## Context

Mission 7d (README), N1. A default pipeline always runs `INNERMOST_NODE_MARGIN_CALCULATOR` and
`LABEL_AND_NODE_SIZE_PROCESSOR` before P4 (`J/GraphConfigurator.java:62-63`), every P3 phase declares
`IN_LAYER_CONSTRAINT_PROCESSOR` before P4 (`J/p3order/LayerSweepCrossingMinimizer.java:677`), the orthogonal router
adds `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` on external-port graphs (`J/p5edges/OrthogonalEdgeRouter.java:135-136`)
and the flexibility recompute option adds `NODE_PLACEMENT_REPEATER` after P4 (`J/GraphConfigurator.java:335-338`).
Their `IntermediateProcessorStrategy` arms throw naming 7f today (`src/alg/layered/intermediate/IntermediateProcessorStrategy.ts`);
T8 wires them. About 607 Java lines: `InnermostNodeMarginCalculator` 68 (drives `NodeDimensionCalculation` over an
`LGraphAdapters` graph, 6b/7a ported), `LabelAndNodeSizeProcessor` 229 (`NodeLabelAndSizeCalculator`, `LGraphAdapters`,
external-port dummies), `InLayerConstraintProcessor` 106 (reads `InternalProperties.IN_LAYER_CONSTRAINT`, `:73-74`),
`HierarchicalPortDummySizeProcessor` 131, `NodePlacementRepeater` 73 (re-creates the placer through
`LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_RECOMPUTE_NODE_PLACEMENT.create()`, `:46`, a
`NodePlacementStrategy` value). The 7c processors (`src/alg/layered/intermediate/{PortSideProcessor,LongEdgeSplitter,…}.ts`
and their tests) are the pattern.

## Task

1. Port the five files to `src/alg/layered/intermediate/` with `@see`, Java method boundaries, every branch; an
   `ILayoutProcessor<LGraph>` each. `NodePlacementRepeater` calls `.create()` on the strategy value verbatim (the
   enum arm it reaches throws until T8).
2. C6: grep each Java for `==`/`!=` between boxed values (none expected; the enum and `NodeType` comparisons at
   `InLayerConstraintProcessor.java:78-91`, `HierarchicalPortDummySizeProcessor.java:81-86` are identity on enums);
   state the result in the hand-back. AD-10: no hashed container is expected; journal any you find.
3. Tests, colocated per class, L4: replay every `scenarios/*` and `models/*` row whose stop is the processor with the
   processor injected through T3's `Factories` (`runSteps` for step rows, `runPlacementPrefix` for pipeline rows; every
   other name through the real enums) and assert `comparePlacement` (and `comparePlacementFullDump` where
   `expected.dump` exists) returns `[]`. `LabelAndNodeSizeProcessor` and `HierarchicalPortDummySizeProcessor` rows carry
   port and label geometry (N3): those are the proof of port and label positions. The repeater's rows need a
   `NodePlacementStrategy` arm: write the test, mark it `it.skip` with the reason "arms wired in T8", and say so in
   the hand-back (T8 un-skips it).
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/intermediate/{InnermostNodeMarginCalculator,LabelAndNodeSizeProcessor,InLayerConstraintProcessor,
HierarchicalPortDummySizeProcessor,NodePlacementRepeater}.ts` and their `.test.ts`.

## Read-set

The five Java files, `src/alg/common/nodespacing/{NodeDimensionCalculation,NodeLabelAndSizeCalculator}.ts`,
`src/alg/layered/graph/LGraphAdapters.ts`, `src/alg/layered/intermediate/LongEdgeSplitter.ts` and `.test.ts` (pattern),
`test/helpers/layered-placement-replay-*.ts` (T3 contract), `src/alg/layered/options/LayeredOptions.ts:2041-2051`
(the flexibility options), `decisions.md` N1, N3, N5.

## Architecture decisions

N1 (scope), N3 (geometry rows as proof), N5 (numeric idioms), C6 (boxed compares), AD-10.

## Interface contract (consumed by T8)

Java names exactly: five classes with a no-argument constructor and `process(layeredGraph: LGraph, monitor:
IElkProgressMonitor): void`; T8's arms are `new <Class>()`.

## Acceptance criteria

- Given each processor's `scenarios` rows, when replayed with the class injected, then `comparePlacement` is `[]`.
- Given the `models` rows stopping at `LABEL_AND_NODE_SIZE_PROCESSOR` and `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`,
  when replayed, then port and label geometry match within 1e-6.
- Given the repeater's test, when run, then it is skipped with the T8 reason and nothing else is skipped.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
