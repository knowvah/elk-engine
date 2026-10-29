<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — The five declared processors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port the edge reverser and layer-constraint processors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7b (README). Every layerer declares `EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER` before P1,
`LAYER_CONSTRAINT_PREPROCESSOR` before P2 and `LAYER_CONSTRAINT_POSTPROCESSOR` before P3; every breaker declares
`REVERSED_EDGE_RESTORER` after P5; the interactive phases declare `INTERACTIVE_EXTERNAL_PORT_POSITIONER` before P1.
Port them verbatim as `ILayoutProcessor<LGraph>` classes (7a patterns: `S/graph/LGraphUtil*.ts` for section splits,
AD-16 exceptions `UnsupportedConfigurationException`/`UnsupportedGraphException` from `src/core`).

## Task

1. Tests first, one `.test.ts` per class: every `scenarios/<Class>/*` row replayed through T3's `runSteps` with
   `createProcessor` returning the class under test (other names throw); assert `compareExpected` is empty, and the
   full dump where present. Structural cases (J) from the Java are allowed; no hand-derived numerics (L4).
2. Port `EdgeAndLayerConstraintEdgeReverser` (`J/intermediate/…:352 lines`), `LayerConstraintPreprocessor` (253),
   `LayerConstraintPostprocessor` (251), `ReversedEdgeRestorer` (70), `InteractiveExternalPortPositioner` (179):
   every branch, side-effect order kept, `getLayoutProcessorConfiguration` absent (processors have none), progress
   monitor calls as in Java.
3. B8: `LayerConstraintPreprocessor.hide` (`:104`) becomes an explicit-stack loop; the test file keeps a verbatim
   recursive twin and compares both on every row plus a 5,000-node chain under `--jitless` (scratch vitest config, the
   `NetworkSimplexTree.test.ts` precedent).
4. Forward references: any later-mission class a processor needs is staged under L1 (journal; `staged-classes.json`
   row) — at planning none was found; verify with `grep import` on the five Java files.

## Write-set

`S/intermediate/{EdgeAndLayerConstraintEdgeReverser,LayerConstraintPreprocessor,LayerConstraintPostprocessor,ReversedEdgeRestorer,InteractiveExternalPortPositioner}.ts`
(+ section files if a file exceeds 500 lines) and their `.test.ts`; `test/architecture/staged-classes.json` only under L1.

## Read-set

The five Java files; `S/graph/{LGraph,LNode,LPort,LEdge,Layer,LGraphUtil}.ts` (API), `S/options/{InternalProperties,
LayeredOptions,LayerConstraint,InLayerConstraint,EdgeConstraint,PortType}.ts`, `src/core/alg/ILayoutProcessor.ts`,
`src/core/util/{IElkProgressMonitor,BasicProgressMonitor}.ts`, `test/helpers/layered-phase-replay-*.ts` (T3 contract),
`src/alg/common/networksimplex/NetworkSimplexTree.test.ts` (twin pattern), `decisions.md` B8.

## Interface contract (consumed by T8)

Each class: `new X()` with no arguments, `process(graph: LGraph, monitor: IElkProgressMonitor): void`; Java names.

## Acceptance criteria

- Given every `scenarios/<Class>/*` row, when replayed with the class injected, then no diff.
- Given `hide`, when run on the rows and the deep chain, then the loop equals the twin and does not overflow under
  `--jitless`.
- Given `npm run typecheck`, `npm run complexity` and prettier, when run, then clean.

## Observability / Rollback

N/A. Reversible.
